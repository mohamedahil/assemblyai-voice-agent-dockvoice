import NumberFlow from '@number-flow/react'
import { motion } from 'motion/react'
import { type ReactNode, useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import type { Tone } from './Badge'

const toneRing: Record<Tone, string> = {
  neutral: 'text-fg-muted bg-surface-muted',
  accent: 'text-accent bg-accent-soft',
  agent: 'text-agent bg-agent-soft',
  success: 'text-success bg-success-soft',
  warning: 'text-warning bg-warning-soft',
  danger: 'text-danger bg-danger-soft',
}

/** KPI tile: the number rolls up from zero on first render and on every change. */
export function Stat({
  label,
  value,
  format,
  suffix,
  icon,
  tone = 'accent',
  hint,
  index = 0,
}: {
  label: string
  value: number
  format?: Parameters<typeof NumberFlow>[0]['format']
  suffix?: string
  icon: ReactNode
  tone?: Tone
  hint?: ReactNode
  index?: number
}) {
  // Start at zero so NumberFlow has something to roll up from.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value))
    return () => cancelAnimationFrame(id)
  }, [value])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay: 0.06 * index, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="panel group relative overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-accent/5 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-fg-muted">{label}</p>
        <span className={cn('grid size-8 place-items-center rounded-lg [&>svg]:size-4', toneRing[tone])}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">
        <NumberFlow value={shown} format={format} suffix={suffix} className="num" />
      </div>
      {hint && <div className="mt-1.5 text-xs text-fg-subtle">{hint}</div>}
    </motion.div>
  )
}
