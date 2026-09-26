import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { useVoiceStore, type VoiceStatus } from '../store'

const LABELS: Record<VoiceStatus, { text: string; className: string }> = {
  idle: { text: 'Mic off', className: 'text-fg-subtle bg-surface-muted border-border' },
  connecting: { text: 'Connecting', className: 'text-accent bg-accent-soft border-accent/25' },
  listening: { text: 'Listening', className: 'text-accent bg-accent-soft border-accent/25' },
  hearing: { text: 'Hearing you', className: 'text-accent bg-accent-soft border-accent/40' },
  thinking: { text: 'Thinking', className: 'text-agent bg-agent-soft border-agent/25' },
  working: { text: 'Updating ERP', className: 'text-agent bg-agent-soft border-agent/40' },
  speaking: { text: 'Speaking', className: 'text-agent bg-agent-soft border-agent/25' },
  error: { text: 'Error', className: 'text-danger bg-danger-soft border-danger/25' },
}

export function StatusPill({ className }: { className?: string }) {
  const status = useVoiceStore((s) => s.status)
  const { text, className: tone } = LABELS[status]
  const active = status !== 'idle' && status !== 'error'

  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-2 rounded-full border px-2.5 text-xs font-medium transition-colors',
        tone,
        className,
      )}
    >
      <span className="relative flex size-2">
        {active && <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
