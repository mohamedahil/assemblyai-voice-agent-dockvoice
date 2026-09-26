// AudioWorklet: mic Float32 at the device rate -> PCM16 mono at 24 kHz, posted in ~40 ms chunks.
// Runs at the context's native rate so Firefox keeps echo cancellation and Safari isn't garbled.
class PcmCapture extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const { inputSampleRate, targetSampleRate, chunkMs } = options.processorOptions
    this.step = inputSampleRate / targetSampleRate
    // Read position into the current block; may be in [-1, 0) meaning "between previous block's
    // last sample and this block's first".
    this.pos = 0
    this.prev = 0
    this.chunk = new Int16Array(Math.round((targetSampleRate * chunkMs) / 1000))
    this.filled = 0
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0]
    if (!input) return true
    const n = input.length

    while (this.pos <= n - 1) {
      const i0 = Math.floor(this.pos)
      const frac = this.pos - i0
      const s0 = i0 < 0 ? this.prev : input[i0]
      const s1 = input[i0 + 1] ?? s0
      const sample = s0 + (s1 - s0) * frac
      this.chunk[this.filled++] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
      if (this.filled === this.chunk.length) {
        const out = this.chunk.slice()
        this.port.postMessage(out.buffer, [out.buffer])
        this.filled = 0
      }
      this.pos += this.step
    }
    this.pos -= n
    this.prev = input[n - 1]
    return true
  }
}

registerProcessor('pcm-capture', PcmCapture)
