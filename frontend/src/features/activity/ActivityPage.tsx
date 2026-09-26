import { useQuery } from '@tanstack/react-query'
import { ChevronRight, CircleCheck, CircleX, Terminal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { api, queryKeys } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import type { ToolCallRecord } from '@/lib/types'

interface SessionGroup {
  sessionId: string
  calls: ToolCallRecord[]
}

/** Newest first, with consecutive calls from the same voice session folded into one block. */
function groupBySession(records: ToolCallRecord[]): SessionGroup[] {
  const groups: SessionGroup[] = []
  for (const record of [...records].sort((a, b) => b.id - a.id)) {
    const last = groups.at(-1)
    if (last?.sessionId === record.session_id) last.calls.push(record)
    else groups.push({ sessionId: record.session_id, calls: [record] })
  }
  return groups
}

export function ActivityPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.activity,
    queryFn: () => api.activity(),
    refetchInterval: 5000,
  })

  const groups = data ? groupBySession(data) : []
  const failures = data?.filter((call) => !call.ok).length ?? 0

  return (
    <>
      <PageHeader
        eyebrow="Audit"
        title="Agent activity"
        description="Every tool call the voice agent made against the ERP, with its exact arguments and result."
      />

      {error ? (
        <ErrorState message={error.message} />
      ) : (
        <Panel initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-danger/70" />
                <span className="size-2.5 rounded-full bg-warning/70" />
                <span className="size-2.5 rounded-full bg-success/70" />
              </div>
              <span className="flex items-center gap-2 font-mono text-xs text-fg-muted">
                <Terminal className="size-3.5" /> tail -f agent/audit.log
              </span>
            </div>
            <div className="flex items-center gap-2">
              {failures > 0 && <Badge tone="danger">{failures} failed</Badge>}
              <Badge tone="success">
                <motion.span
                  className="size-1.5 rounded-full bg-current"
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                Live · {data?.length ?? 0} calls
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : groups.length ? (
            <div className="font-mono text-xs">
              {groups.map((group) => (
                <SessionBlock key={`${group.sessionId}-${group.calls[0]?.id}`} group={group} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Terminal />}
              title="No agent activity yet"
              description="Start a receiving session and every tool call will stream in here."
            />
          )}
        </Panel>
      )}
    </>
  )
}

function SessionBlock({ group }: { group: SessionGroup }) {
  return (
    <section className="border-b border-border last:border-0">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-bg-elevated/90 px-4 py-2 backdrop-blur">
        <span className="text-agent">session</span>
        <span className="text-fg">{group.sessionId.slice(0, 8)}</span>
        <span className="text-fg-subtle">· {group.calls.length} calls</span>
      </div>
      <ul>
        <AnimatePresence initial={false}>
          {group.calls.map((call) => (
            <CallRow key={call.id} call={call} />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  )
}

function CallRow({ call }: { call: ToolCallRecord }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="border-b border-border/60 last:border-0"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-muted"
      >
        <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-fg-subtle">
          <ChevronRight className="size-3.5" />
        </motion.span>
        <span className="w-20 shrink-0 text-fg-subtle tabular-nums">{formatTime(call.created_at)}</span>
        {call.ok ? (
          <CircleCheck className="size-3.5 shrink-0 text-success" />
        ) : (
          <CircleX className="size-3.5 shrink-0 text-danger" />
        )}
        <span className={cn('min-w-0 flex-1 truncate font-medium', call.ok ? 'text-accent' : 'text-danger')}>
          {call.name}
        </span>
        <span
          className={cn('shrink-0 tabular-nums', call.duration_ms > 1000 ? 'text-warning' : 'text-fg-subtle')}
        >
          {Math.round(call.duration_ms)}ms
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 px-4 pb-4 pl-11 lg:grid-cols-2">
              <JsonBlock label="arguments" value={call.arguments} />
              <JsonBlock label="result" value={call.result} tone={call.ok ? 'success' : 'danger'} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

function JsonBlock({ label, value, tone }: { label: string; value: unknown; tone?: 'success' | 'danger' }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-bg">
      <p
        className={cn(
          'border-b border-border px-3 py-1.5 text-[10px] tracking-wider uppercase',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-danger',
          !tone && 'text-fg-subtle',
        )}
      >
        {label}
      </p>
      <pre className="max-h-80 overflow-auto p-3 text-[11px] leading-relaxed text-fg-muted">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}
