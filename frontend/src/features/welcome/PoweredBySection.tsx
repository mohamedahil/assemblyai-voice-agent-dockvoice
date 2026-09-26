import { AudioLines, Brain, Database, Ear, Volume2, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { Fragment } from 'react'
import { cn } from '@/lib/cn'
import { reveal } from './reveal'
import { Section } from './Section'

const PIPELINE: { icon: LucideIcon; title: string; detail: string; assembly: boolean }[] = [
  { icon: AudioLines, title: 'Worker speaks', detail: 'Browser mic, echo-cancelled', assembly: false },
  { icon: Ear, title: 'Universal-3 Pro', detail: 'Streaming speech-to-text', assembly: true },
  { icon: Brain, title: 'Agent + tools', detail: 'Turn detection, tool calls', assembly: true },
  { icon: Database, title: 'DockVoice ERP', detail: 'Rules, GRN, stock, email', assembly: false },
  { icon: Volume2, title: 'Spoken reply', detail: 'Natural voice, interruptible', assembly: true },
]

const CAPABILITIES = [
  'One WebSocket for STT, LLM and TTS',
  'Accurate on numbers, SKUs and PO codes',
  'Keyterms fed live from ERP data',
  'Server-side turn detection & barge-in',
  'JSON-schema tool calling',
  'Single-use browser tokens',
]

export function PoweredBySection() {
  return (
    <Section
      id="assemblyai"
      eyebrow="Powered by AssemblyAI"
      title={
        <>
          The voice layer that made this possible <span className="text-gradient">in days, not months.</span>
        </>
      }
      description="The AssemblyAI Voice Agent API handles listening, reasoning and speaking over a single connection. DockVoice focuses on the warehouse."
    >
      <motion.div {...reveal(0)} className="panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          {PIPELINE.map((node, i) => (
            <Fragment key={node.title}>
              <motion.div
                {...reveal(i, 12)}
                className={cn(
                  'flex flex-1 items-center gap-3 rounded-2xl border p-4 lg:flex-col lg:text-center',
                  node.assembly
                    ? 'border-accent/35 bg-gradient-to-br from-accent/10 to-agent/10'
                    : 'border-border bg-surface-muted',
                )}
              >
                <span
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-xl',
                    node.assembly ? 'bg-accent-soft text-accent' : 'bg-surface-muted text-fg-muted',
                  )}
                >
                  <node.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{node.title}</p>
                  <p className="text-xs text-fg-subtle">{node.detail}</p>
                </div>
              </motion.div>
              {i < PIPELINE.length - 1 && <Wire index={i} />}
            </Fragment>
          ))}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-fg-subtle">
          <span className="size-2 rounded-sm border border-accent/50 bg-accent/20" /> AssemblyAI Voice Agent API
        </p>
      </motion.div>

      <div className="mt-6 grid gap-5 lg:grid-cols-5">
        <motion.div {...reveal(1)} className="panel p-7 lg:col-span-3">
          <p className="font-semibold">What we get out of the box</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {CAPABILITIES.map((item, i) => (
              <motion.li key={item} {...reveal(i, 8)} className="flex items-start gap-2.5 text-sm text-fg-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...reveal(2)} className="panel flex flex-col justify-center gap-5 p-7 lg:col-span-2">
          <div>
            <p className="text-gradient text-4xl font-semibold tracking-tight">15–35%</p>
            <p className="mt-1 text-sm text-fg-muted">productivity gains reported for voice-directed warehouse work</p>
          </div>
          <div>
            <p className="text-gradient text-4xl font-semibold tracking-tight">~50%</p>
            <p className="mt-1 text-sm text-fg-muted">less training time reported with voice systems</p>
          </div>
          <p className="text-xs text-fg-subtle">Industry benchmarks: Lucas Systems, NetSuite</p>
        </motion.div>
      </div>
    </Section>
  )
}

/** Connector with a pulse travelling along it, like audio flowing through the pipeline. */
function Wire({ index }: { index: number }) {
  return (
    <div className="relative mx-auto h-6 w-px shrink-0 bg-border-strong lg:h-px lg:w-8" aria-hidden>
      <motion.span
        className="absolute top-1/2 hidden size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_var(--accent)] lg:block"
        animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.35, ease: 'easeInOut' }}
      />
    </div>
  )
}
