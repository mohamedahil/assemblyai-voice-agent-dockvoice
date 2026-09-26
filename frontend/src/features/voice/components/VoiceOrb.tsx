import { useEffect, useRef } from 'react'
import { voiceAgent } from '../agentClient'
import { useVoiceStore, type VoiceStatus } from '../store'

const TAU = Math.PI * 2

interface Palette {
  accent: string
  agent: string
}

function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement)
  return {
    accent: styles.getPropertyValue('--accent').trim() || '#22d3ee',
    agent: styles.getPropertyValue('--agent').trim() || '#a78bfa',
  }
}

/** Energy and color per state. The worker's voice drives cyan, the agent's voice drives violet. */
function targetFor(status: VoiceStatus, input: number, output: number) {
  switch (status) {
    case 'hearing':
      return { energy: 0.25 + input * 1.1, agentMix: 0, swirl: 0 }
    case 'speaking':
      return { energy: 0.25 + output * 1.2, agentMix: 1, swirl: 0 }
    case 'thinking':
      return { energy: 0.22, agentMix: 0.8, swirl: 0.6 }
    case 'working':
      return { energy: 0.3, agentMix: 1, swirl: 1 }
    case 'listening':
      return { energy: 0.14 + input * 0.9, agentMix: 0, swirl: 0 }
    case 'connecting':
      return { energy: 0.1, agentMix: 0.5, swirl: 0.8 }
    case 'error':
      return { energy: 0.04, agentMix: 0, swirl: 0 }
    default:
      return { energy: 0.06, agentMix: 0.35, swirl: 0 }
  }
}

export function VoiceOrb({ size = 280, className }: { size?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let palette = readPalette()
    const themeObserver = new MutationObserver(() => (palette = readPalette()))
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const state = { energy: 0.06, agentMix: 0.35, swirl: 0, t: 0 }
    let frame = 0

    const draw = () => {
      const { input, output } = voiceAgent.levels()
      const target = targetFor(useVoiceStore.getState().status, input, output)
      // Ease toward the target so the orb breathes instead of jittering.
      state.energy += (target.energy - state.energy) * 0.18
      state.agentMix += (target.agentMix - state.agentMix) * 0.06
      state.swirl += (target.swirl - state.swirl) * 0.05
      state.t += reduceMotion ? 0 : 0.016 + state.energy * 0.03

      const c = size / 2
      const base = size * 0.26
      ctx.clearRect(0, 0, size, size)

      const color = state.agentMix > 0.5 ? palette.agent : palette.accent
      const secondary = state.agentMix > 0.5 ? palette.accent : palette.agent

      // Outer halo.
      const halo = ctx.createRadialGradient(c, c, base * 0.6, c, c, size * 0.5)
      halo.addColorStop(0, withAlpha(color, 0.22 + state.energy * 0.2))
      halo.addColorStop(1, withAlpha(color, 0))
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, size, size)

      // Three wobbling membranes, each with its own frequency mix.
      for (let layer = 0; layer < 3; layer++) {
        const amp = (0.05 + state.energy * 0.22) * (1 - layer * 0.22)
        const radius = base * (1.18 + layer * 0.16) * (1 + state.energy * 0.12)
        ctx.beginPath()
        for (let i = 0; i <= 120; i++) {
          const a = (i / 120) * TAU
          const wobble =
            Math.sin(a * 3 + state.t * (1.3 + layer * 0.4) + layer) * 0.5 +
            Math.sin(a * 5 - state.t * (1.7 - layer * 0.3)) * 0.3 +
            Math.sin(a * 2 + state.t * 0.8 + layer * 2) * 0.2
          const r = radius * (1 + amp * wobble)
          const x = c + Math.cos(a) * r
          const y = c + Math.sin(a) * r
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.strokeStyle = withAlpha(layer === 1 ? secondary : color, 0.55 - layer * 0.14)
        ctx.lineWidth = 1.4
        ctx.stroke()
        ctx.fillStyle = withAlpha(color, 0.05)
        ctx.fill()
      }

      // Orbiting particles while the agent is thinking or working.
      if (state.swirl > 0.02) {
        for (let i = 0; i < 10; i++) {
          const a = state.t * (1.2 + (i % 3) * 0.35) + (i / 10) * TAU
          const r = base * (1.55 + Math.sin(state.t * 2 + i) * 0.08)
          ctx.beginPath()
          ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 1.6 + (i % 3), 0, TAU)
          ctx.fillStyle = withAlpha(i % 2 ? palette.agent : palette.accent, state.swirl * 0.85)
          ctx.fill()
        }
      }

      // Core sphere.
      const coreRadius = base * (0.92 + state.energy * 0.18)
      const core = ctx.createRadialGradient(c - coreRadius * 0.35, c - coreRadius * 0.4, 1, c, c, coreRadius)
      core.addColorStop(0, withAlpha('#ffffff', 0.9))
      core.addColorStop(0.25, withAlpha(color, 0.95))
      core.addColorStop(1, withAlpha(secondary, 0.85))
      ctx.save()
      ctx.shadowColor = color
      ctx.shadowBlur = 30 + state.energy * 60
      ctx.beginPath()
      ctx.arc(c, c, coreRadius, 0, TAU)
      ctx.fillStyle = core
      ctx.fill()
      ctx.restore()

      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      themeObserver.disconnect()
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Voice activity"
    />
  )
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? [...value].map((ch) => ch + ch).join('') : value
  const n = Number.parseInt(full, 16)
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
