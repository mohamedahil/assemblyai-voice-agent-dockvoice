import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { humanize } from '@/lib/format'

export type Tone = 'neutral' | 'accent' | 'agent' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-fg-muted border-border',
  accent: 'bg-accent-soft text-accent border-accent/25',
  agent: 'bg-agent-soft text-agent border-agent/25',
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
}

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
}: {
  tone?: Tone
  dot?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

const statusTones: Record<string, Tone> = {
  open: 'accent',
  partially_received: 'warning',
  received: 'success',
  closed: 'neutral',
  shortage: 'warning',
  over_receipt: 'agent',
  damaged: 'danger',
  quarantine: 'danger',
  vendor_notified: 'agent',
  resolved: 'success',
  sent: 'success',
  simulated: 'accent',
  failed: 'danger',
  voice: 'agent',
  manual: 'neutral',
  receipt: 'success',
  issue: 'warning',
  draft: 'accent',
  awaiting_confirmation: 'accent',
  posted: 'success',
  cancelled: 'neutral',
}

/** Badge for any backend enum value, with a consistent color per status. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={statusTones[status] ?? 'neutral'} dot className={className}>
      {humanize(status)}
    </Badge>
  )
}
