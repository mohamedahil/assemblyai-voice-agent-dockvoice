import { Bot, CircleCheck, HardHat, PackageCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

type Step =
  | { kind: 'user' | 'agent'; text: string }
  | { kind: 'tool'; text: string }
  | { kind: 'grn'; text: string }

// A looping preview of the real flow, so the landing page shows the product in motion.
const STEPS: Step[] = [
  { kind: 'user', text: 'Receiving PO 4582 from ABC Electronics.' },
  { kind: 'tool', text: 'open_purchase_order · PO-4582 · 3 lines' },
  { kind: 'agent', text: 'Got it: controllers, sensors, power modules. Counts?' },
  { kind: 'user', text: 'Eighty controllers, 45 sensors. Power modules are eighteen, not eighty.' },
  { kind: 'tool', text: 'record_received_quantities · power modules 80 → 18' },
  { kind: 'agent', text: 'Short 20 controllers, 5 sensors, 2 power modules. Post it?' },
  { kind: 'user', text: 'Wait, three of the sensors are cracked.' },
  { kind: 'tool', text: 'record_damage · 3 sensors → quarantine' },
  { kind: 'user', text: 'Yes, post it.' },
  { kind: 'grn', text: 'GRN-1027 posted · 140 into stock · 3 quarantined' },
]

const VISIBLE = 3

export function ScriptedDemo() {
  const [cursor, setCursor] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setCursor((c) => (c + 1) % (STEPS.length + 2)), 2100)
    return () => window.clearInterval(id)
  }, [])

  const shown = STEPS.slice(Math.max(0, cursor - VISIBLE), Math.min(cursor, STEPS.length))

  return (
    <div className="-mt-6 flex h-52 w-full flex-col justify-end gap-2">
      <AnimatePresence mode="popLayout" initial={false}>
        {shown.map((step) => (
          <motion.div
            key={step.text}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn('flex', step.kind === 'user' ? 'justify-end' : 'justify-start')}
          >
            <Bubble step={step} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function Bubble({ step }: { step: Step }) {
  switch (step.kind) {
    case 'user':
      return (
        <div className="flex max-w-[85%] items-start gap-2 rounded-2xl rounded-tr-sm border border-accent/25 bg-accent-soft px-3.5 py-2 text-sm backdrop-blur">
          <HardHat className="mt-0.5 size-3.5 shrink-0 text-accent" />
          {step.text}
        </div>
      )
    case 'agent':
      return (
        <div className="flex max-w-[85%] items-start gap-2 rounded-2xl rounded-tl-sm border border-border-strong bg-surface px-3.5 py-2 text-sm backdrop-blur">
          <Bot className="mt-0.5 size-3.5 shrink-0 text-agent" />
          {step.text}
        </div>
      )
    case 'tool':
      return (
        <div className="flex items-center gap-2 rounded-full border border-agent/30 bg-agent-soft px-3 py-1 font-mono text-[11px] text-agent">
          <CircleCheck className="size-3.5" />
          {step.text}
        </div>
      )
    case 'grn':
      return (
        <motion.div
          initial={{ rotate: -2 }}
          animate={{ rotate: 0 }}
          className="flex items-center gap-2 rounded-xl border border-success/40 bg-success-soft px-3.5 py-2 text-sm font-medium text-success shadow-[0_0_30px_-8px_var(--success)]"
        >
          <PackageCheck className="size-4" />
          {step.text}
        </motion.div>
      )
  }
}
