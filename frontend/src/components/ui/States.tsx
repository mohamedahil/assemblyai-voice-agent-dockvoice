import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-muted', className)} />
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 grid size-12 place-items-center rounded-2xl border border-border bg-surface-muted text-fg-subtle [&>svg]:size-5">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-xs text-xs text-fg-subtle">{description}</p>}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
    </div>
  )
}
