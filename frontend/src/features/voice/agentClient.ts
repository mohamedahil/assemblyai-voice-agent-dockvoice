/**
 * Browser client for the AssemblyAI Voice Agent API.
 *
 * The browser talks to AssemblyAI directly (lowest latency) with a single-use token from our
 * backend. Tool calls are relayed to the backend, which owns all ERP state and returns both the
 * agent-facing result and the tool set for the next phase (progressive tool reveal).
 */
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import type { Phase } from '@/lib/types'
import { MicCapture, PcmPlayer, pcm16ToBase64 } from './audio/audio'
import { initialVoiceState, useVoiceStore, voiceActions, type GrnOutcome, type VoiceStatus } from './store'

type ServerEvent = { type: string } & Record<string, unknown>

interface PendingResult {
  call_id: string
  result: string
  is_error: boolean
}

// Codes after which the session can't continue.
const FATAL_CODES = new Set([
  'UNAUTHORIZED',
  'unauthorized',
  'FORBIDDEN',
  'agent_init_failed',
  'agent_timeout',
  'session_expired',
  'invalid_config',
])

class VoiceAgentClient {
  private ws?: WebSocket
  private ctx?: AudioContext
  private mic?: MicCapture
  private player?: PcmPlayer
  private sessionId = ''
  private ready = false
  private phase: Phase = 'identify'

  // Tool-result timing: results may only be sent while `reply.done` is the latest event.
  private lastEvent: string | null = null
  private pending: PendingResult[] = []
  private turn = 0

  private idleTimer?: number
  private sessionTimer?: number
  private endTimer?: number

  async start(): Promise<void> {
    if (this.ws) return
    const status = useVoiceStore.getState().status
    if (status !== 'idle' && status !== 'error') return

    useVoiceStore.setState({ ...initialVoiceState, status: 'connecting', startedAt: Date.now() })
    // Create the AudioContext synchronously inside the click so browsers allow audio.
    this.ctx = new AudioContext()
    void this.ctx.resume()

    try {
      const session = await api.startVoiceSession()
      this.sessionId = session.session_id
      useVoiceStore.setState({ sessionId: session.session_id })

      this.player = new PcmPlayer(this.ctx)
      this.mic = new MicCapture(this.ctx)
      await this.mic.start((chunk) => this.sendAudio(chunk))

      const url = new URL(session.ws_url)
      url.searchParams.set('token', session.token)
      this.ws = new WebSocket(url)
      this.ws.onopen = () => this.send({ type: 'session.update', session: session.session_config })
      this.ws.onmessage = (event) => this.handle(JSON.parse(event.data as string) as ServerEvent)
      this.ws.onclose = (event) => this.onClose(event)

      this.sessionTimer = window.setTimeout(() => this.stop(), session.max_session_seconds * 1000)
      window.addEventListener('pagehide', this.onPageHide)
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Could not start the voice session.')
    }
  }

  /** End cleanly: `session.end` stops billing immediately instead of after a 30 s grace window. */
  stop(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'session.end' })
      this.endTimer = window.setTimeout(() => this.cleanup(), 1500)
    } else {
      this.cleanup()
    }
  }

  /** Input and output loudness for the orb, 0..1. */
  levels(): { input: number; output: number } {
    return { input: this.mic?.level() ?? 0, output: this.player?.level() ?? 0 }
  }

  // ---- Protocol ------------------------------------------------------------------------------

  private handle(event: ServerEvent): void {
    switch (event.type) {
      case 'session.ready':
        this.ready = true
        this.setStatus('listening')
        break

      case 'input.speech.started':
        this.lastEvent = event.type
        this.setStatus('hearing')
        break

      case 'input.speech.stopped':
        this.setStatus('thinking')
        break

      case 'transcript.user.delta':
        voiceActions.upsertTranscript(String(event.item_id), 'user', { text: String(event.text) })
        break

      case 'transcript.user':
        voiceActions.upsertTranscript(String(event.item_id), 'user', {
          text: String(event.text),
          final: true,
        })
        break

      case 'reply.started':
        this.lastEvent = event.type
        if (useVoiceStore.getState().status !== 'working') this.setStatus('thinking')
        break

      case 'reply.audio':
        this.player?.enqueue(String(event.data))
        this.setStatus('speaking')
        break

      case 'transcript.agent.delta':
        voiceActions.appendAgentWord(String(event.reply_id), String(event.delta))
        break

      case 'transcript.agent':
        voiceActions.upsertTranscript(String(event.reply_id), 'agent', {
          text: String(event.text),
          final: true,
          interrupted: Boolean(event.interrupted),
        })
        break

      case 'reply.done':
        this.lastEvent = event.type
        if (event.status === 'interrupted') {
          // The worker barged in: silence the agent now and drop stale tool results.
          this.player?.flush()
          this.pending = []
          this.turn++
          this.setStatus('hearing')
        } else {
          this.flushToolResults()
          this.settleWhenPlaybackEnds()
        }
        break

      case 'tool.call':
        void this.runTool(
          String(event.call_id),
          String(event.name),
          (event.arguments ?? {}) as Record<string, unknown>,
        )
        break

      case 'session.error':
        this.onSessionError(String(event.code), String(event.message))
        break

      case 'session.ended':
        this.cleanup()
        break
    }
  }

  private async runTool(callId: string, name: string, args: Record<string, unknown>): Promise<void> {
    const turn = this.turn
    const startedAt = performance.now()
    voiceActions.startTool({ id: callId, name, args, status: 'running', startedAt: Date.now() })
    this.setStatus('working')

    let result: Record<string, unknown>
    let ok = false
    try {
      const response = await api.callTool(this.sessionId, name, args)
      result = response.result
      ok = response.ok
      useVoiceStore.setState({ draft: response.draft, phase: response.phase })
      if (response.phase !== this.phase) {
        // Reveal (or retract) tools for the new phase before the agent's next turn.
        this.phase = response.phase
        this.send({ type: 'session.update', session: { tools: response.tools } })
      }
      if (ok) this.recordOutcome(callId, name, result)
      void queryClient.invalidateQueries()
    } catch {
      result = { error: 'The ERP is unreachable. Tell the worker to try again in a moment.' }
    }

    voiceActions.finishTool(callId, {
      status: ok ? 'ok' : 'error',
      result,
      durationMs: Math.round(performance.now() - startedAt),
    })

    if (turn !== this.turn) return // Interrupted while running; the agent has moved on.
    this.pending.push({ call_id: callId, result: JSON.stringify(result), is_error: !ok })
    this.flushToolResults()
  }

  private flushToolResults(): void {
    if (this.lastEvent !== 'reply.done' || !this.pending.length) return
    for (const pending of this.pending) this.send({ type: 'tool.result', ...pending })
    this.pending = []
  }

  private recordOutcome(callId: string, name: string, result: Record<string, unknown>): void {
    if (name === 'post_goods_receipt') {
      voiceActions.addOutcome({
        kind: 'grn',
        id: callId,
        grnNumber: String(result.grn_number),
        poNumber: String(result.po_number),
        unitsReceived: Number(result.units_received),
        unitsQuarantined: Number(result.units_quarantined ?? 0),
        discrepancies: (result.discrepancies ?? []) as GrnOutcome['discrepancies'],
      })
      toast.success(`${String(result.grn_number)} posted`, { description: String(result.po_number) })
    } else if (name === 'notify_vendor') {
      voiceActions.addOutcome({
        kind: 'email',
        id: callId,
        vendor: String(result.vendor),
        status: String(result.status),
        dueDate: (result.due_date as string | null) ?? null,
      })
    }
  }

  // ---- Plumbing ------------------------------------------------------------------------------

  private sendAudio(chunk: ArrayBuffer): void {
    if (this.ready) this.send({ type: 'input.audio', audio: pcm16ToBase64(chunk) })
  }

  private send(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message))
  }

  private setStatus(status: VoiceStatus): void {
    window.clearTimeout(this.idleTimer)
    useVoiceStore.setState({ status })
  }

  private settleWhenPlaybackEnds(): void {
    const remainingMs = (this.player?.remaining() ?? 0) * 1000
    window.clearTimeout(this.idleTimer)
    this.idleTimer = window.setTimeout(() => {
      const current = useVoiceStore.getState().status
      if (current === 'speaking' || current === 'thinking') useVoiceStore.setState({ status: 'listening' })
    }, remainingMs + 150)
  }

  private onSessionError(code: string, message: string): void {
    if (FATAL_CODES.has(code)) {
      this.fail(message || code)
    } else {
      console.warn('Voice agent error', code, message)
    }
  }

  private onClose(event: CloseEvent): void {
    if (!this.ws) return
    if (!this.ready && event.code !== 1000) {
      this.fail('Could not connect to the voice service. Check the API key and try again.')
    } else {
      this.cleanup()
    }
  }

  private readonly onPageHide = () => {
    // Must be synchronous: the socket is gone once the page unloads.
    this.send({ type: 'session.end' })
  }

  private fail(message: string): void {
    this.cleanup()
    useVoiceStore.setState({ status: 'error', error: message })
    toast.error('Voice session stopped', { description: message })
  }

  private cleanup(): void {
    window.clearTimeout(this.idleTimer)
    window.clearTimeout(this.sessionTimer)
    window.clearTimeout(this.endTimer)
    window.removeEventListener('pagehide', this.onPageHide)

    const ws = this.ws
    this.ws = undefined
    if (ws) {
      ws.onclose = null
      ws.onmessage = null
      ws.close()
    }
    this.mic?.stop()
    this.player?.flush()
    void this.ctx?.close()
    this.mic = this.player = this.ctx = undefined
    this.ready = false
    this.pending = []
    this.lastEvent = null
    this.phase = 'identify'

    const { status } = useVoiceStore.getState()
    if (status !== 'error') useVoiceStore.setState({ status: 'idle' })
  }
}

export const voiceAgent = new VoiceAgentClient()
