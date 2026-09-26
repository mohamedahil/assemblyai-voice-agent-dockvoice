import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import type { Tone } from './Badge'

const fills: Record<Tone, string> = {
  neutral: 'bg-fg-subtle',
  accent: 'bg-gradient-to-r from-accent/60 to-accent',
  agent: 'bg-gradient-to-r from-agent/60 to-agent',
  success: 'bg-success',
  warning: 'bg-gradient-to-r from-warning/70 to-warning',
  danger: 'bg-danger',
}

/** Thin bar that springs from zero to `value` percent. */
export function ProgressBar({
  value,
  tone = 'accent',
  delay = 0,
  className,
}: {
  value: number
  tone?: Tone
  delay?: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-surface-muted', className)}>
      <motion.div
        className={cn('h-full rounded-full', fills[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 110, damping: 20, delay }}
      />
    </div>
  )
}
