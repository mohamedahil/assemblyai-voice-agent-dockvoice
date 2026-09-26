import { create } from 'zustand'
import type { DraftView, Phase } from '@/lib/types'

export type VoiceStatus =
  | 'idle'
  | 'connecting'
  | 'listening' // waiting for the worker
  | 'hearing' // worker is speaking
  | 'thinking' // agent is composing a reply
  | 'working' // a tool call is running against the ERP
  | 'speaking' // agent audio is playing
  | 'error'

export interface TranscriptEntry {
  id: string
  role: 'user' | 'agent'
  text: string
  final: boolean
  interrupted?: boolean
  at: number
}

export interface ToolEvent {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'running' | 'ok' | 'error'
  result?: Record<string, unknown>
  startedAt: number
  durationMs?: number
}

export interface GrnOutcome {
  kind: 'grn'
  id: string
  grnNumber: string
  poNumber: string
  unitsReceived: number
  unitsQuarantined: number
  discrepancies: { item: string; type: string; quantity: number; note?: string | null }[]
}

export interface EmailOutcome {
  kind: 'email'
  id: string
  vendor: string
  status: string
  dueDate: string | null
}

export type Outcome = GrnOutcome | EmailOutcome

interface VoiceState {
  status: VoiceStatus
  error: string | null
  sessionId: string | null
  startedAt: number | null
  phase: Phase
  draft: DraftView | null
  transcript: TranscriptEntry[]
  tools: ToolEvent[]
  outcomes: Outcome[]
}

export const initialVoiceState: VoiceState = {
  status: 'idle',
  error: null,
  sessionId: null,
  startedAt: null,
  phase: 'identify',
  draft: null,
  transcript: [],
  tools: [],
  outcomes: [],
}

export const useVoiceStore = create<VoiceState>(() => initialVoiceState)

export const isLive = (status: VoiceStatus) => status !== 'idle' && status !== 'error'

// ---- Mutations used by the agent client ---------------------------------------------------------

const set = useVoiceStore.setState

export const voiceActions = {
  upsertTranscript(id: string, role: TranscriptEntry['role'], patch: Partial<TranscriptEntry>) {
    set((state) => {
      const index = state.transcript.findIndex((entry) => entry.id === id)
      if (index === -1) {
        const entry: TranscriptEntry = { id, role, text: '', final: false, at: Date.now(), ...patch }
        return { transcript: [...state.transcript, entry] }
      }
      const transcript = state.transcript.slice()
      transcript[index] = { ...transcript[index]!, ...patch }
      return { transcript }
    })
  },

  appendAgentWord(id: string, word: string) {
    set((state) => {
      const existing = state.transcript.find((entry) => entry.id === id)
      if (!existing) {
        return {
          transcript: [
            ...state.transcript,
            { id, role: 'agent' as const, text: word, final: false, at: Date.now() },
          ],
        }
      }
      return {
        transcript: state.transcript.map((entry) =>
          entry.id === id ? { ...entry, text: `${entry.text} ${word}`.trim() } : entry,
        ),
      }
    })
  },

  startTool(event: ToolEvent) {
    set((state) => ({ tools: [...state.tools, event] }))
  },

  finishTool(id: string, patch: Partial<ToolEvent>) {
    set((state) => ({ tools: state.tools.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
  },

  addOutcome(outcome: Outcome) {
    set((state) => ({ outcomes: [...state.outcomes, outcome] }))
  },
}
