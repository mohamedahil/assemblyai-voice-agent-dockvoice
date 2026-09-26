/** Voice Agent API audio: PCM16, mono, 24 kHz, base64 over the WebSocket. */
export const AGENT_SAMPLE_RATE = 24_000
const CHUNK_MS = 40

/** Microphone → PCM16 chunks. Uses the context's default rate and resamples in the worklet. */
export class MicCapture {
  private stream?: MediaStream
  private node?: AudioWorkletNode
  private source?: MediaStreamAudioSourceNode
  private readonly analyser: AnalyserNode
  private readonly levelBuffer: Uint8Array<ArrayBuffer>
  private readonly ctx: AudioContext

  constructor(ctx: AudioContext) {
    this.ctx = ctx
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 512
    this.levelBuffer = new Uint8Array(this.analyser.fftSize)
  }

  async start(onChunk: (pcm16: ArrayBuffer) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      // Echo cancellation keeps the agent from hearing itself; the server does noise suppression.
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
    })
    await this.ctx.audioWorklet.addModule('/audio/pcm-capture.js')
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.node = new AudioWorkletNode(this.ctx, 'pcm-capture', {
      processorOptions: {
        inputSampleRate: this.ctx.sampleRate,
        targetSampleRate: AGENT_SAMPLE_RATE,
        chunkMs: CHUNK_MS,
      },
    })
    this.node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => onChunk(event.data)
    this.source.connect(this.analyser)
    this.source.connect(this.node)
    // The worklet writes no output, but some browsers only pull nodes that reach the destination.
    this.node.connect(this.ctx.destination)
  }

  /** Current input loudness, 0..1. */
  level(): number {
    return rms(this.analyser, this.levelBuffer)
  }

  stop(): void {
    this.node?.port.close()
    this.node?.disconnect()
    this.source?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
  }
}

/** Gapless playback of streamed PCM16 chunks, with instant flush on barge-in. */
export class PcmPlayer {
  private readonly ctx: AudioContext
  private readonly analyser: AnalyserNode
  private readonly levelBuffer: Uint8Array<ArrayBuffer>
  private readonly sources = new Set<AudioBufferSourceNode>()
  private playhead = 0

  constructor(ctx: AudioContext) {
    this.ctx = ctx
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 512
    this.levelBuffer = new Uint8Array(this.analyser.fftSize)
    this.analyser.connect(ctx.destination)
  }

  enqueue(base64: string): void {
    const samples = base64ToFloat32(base64)
    if (!samples.length) return
    const buffer = this.ctx.createBuffer(1, samples.length, AGENT_SAMPLE_RATE)
    buffer.copyToChannel(samples, 0)

    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.analyser)
    // A small lead avoids clicks when the queue has drained.
    this.playhead = Math.max(this.playhead, this.ctx.currentTime + 0.03)
    source.start(this.playhead)
    this.playhead += buffer.duration
    this.sources.add(source)
    source.onended = () => this.sources.delete(source)
  }

  /** Stop everything queued, e.g. when the worker interrupts the agent. */
  flush(): void {
    for (const source of this.sources) {
      try {
        source.stop()
      } catch {
        // Already stopped.
      }
    }
    this.sources.clear()
    this.playhead = this.ctx.currentTime
  }

  /** Seconds of audio still queued. */
  remaining(): number {
    return Math.max(0, this.playhead - this.ctx.currentTime)
  }

  level(): number {
    return rms(this.analyser, this.levelBuffer)
  }
}

export function pcm16ToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

function base64ToFloat32(base64: string): Float32Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const pcm = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2))
  const out = new Float32Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) out[i] = (pcm[i] ?? 0) / 32768
  return out
}

function rms(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buffer)
  let sum = 0
  for (const value of buffer) {
    const centered = (value - 128) / 128
    sum += centered * centered
  }
  // Speech RMS rarely exceeds ~0.3; scale so normal talking fills the range.
  return Math.min(1, Math.sqrt(sum / buffer.length) * 3.2)
}
