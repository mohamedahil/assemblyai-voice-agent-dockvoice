import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import type { Phase } from '@/lib/types'

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'identify', label: 'Identify PO' },
  { phase: 'counting', label: 'Count' },
  { phase: 'confirming', label: 'Confirm' },
  { phase: 'posted', label: 'Posted' },
]

export function PhaseStepper({ phase }: { phase: Phase }) {
  const active = STEPS.findIndex((step) => step.phase === phase)

  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const done = index < active || phase === 'posted'
        const current = index === active && phase !== 'posted'
        return (
          <li key={step.phase} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <motion.span
                layout
                className={cn(
                  'relative grid size-6 place-items-center rounded-full border text-[10px] font-semibold transition-colors duration-300',
                  done && 'border-success bg-success text-bg',
                  current && 'border-accent text-accent',
                  !done && !current && 'border-border-strong text-fg-subtle',
                )}
              >
                {current && (
                  <motion.span
                    className="absolute inset-0 rounded-full border border-accent"
                    animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                )}
                {done ? <Check className="size-3.5" /> : index + 1}
              </motion.span>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:inline',
                  current ? 'text-fg' : done ? 'text-fg-muted' : 'text-fg-subtle',
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="relative h-px w-6 bg-border-strong sm:w-10">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-success"
                  initial={false}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
