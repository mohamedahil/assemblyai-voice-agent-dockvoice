import {
  CircleCheck,
  CircleX,
  ClipboardList,
  ListChecks,
  LoaderCircle,
  Mail,
  PackageCheck,
  PackageX,
  PencilLine,
  Undo2,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { EmptyState } from '@/components/ui/States'
import { cn } from '@/lib/cn'
import { useVoiceStore, type ToolEvent } from '../voice/store'

const TOOL_META: Record<string, { label: string; icon: LucideIcon }> = {
  open_purchase_order: { label: 'Open purchase order', icon: ClipboardList },
  record_received_quantities: { label: 'Record counts', icon: PencilLine },
  record_damage: { label: 'Record damage', icon: PackageX },
  review_receipt: { label: 'Review for read-back', icon: ListChecks },
  post_goods_receipt: { label: 'Post goods receipt', icon: PackageCheck },
  notify_vendor: { label: 'Notify vendor', icon: Mail },
  cancel_receipt: { label: 'Cancel receipt', icon: Undo2 },
}

export function ToolTimeline() {
  const tools = useVoiceStore((s) => s.tools)

  if (!tools.length) {
    return (
      <EmptyState
        icon={<Workflow />}
        title="No ERP actions yet"
        description="Each tool call the agent makes shows up here with its result."
      />
    )
  }

  return (
    <ol className="relative space-y-1 p-4">
      <span className="absolute top-6 bottom-6 left-[29px] w-px bg-border" />
      <AnimatePresence initial={false}>
        {[...tools].reverse().map((tool) => (
          <TimelineItem key={tool.id} tool={tool} />
        ))}
      </AnimatePresence>
    </ol>
  )
}

function TimelineItem({ tool }: { tool: ToolEvent }) {
  const meta = TOOL_META[tool.name] ?? { label: tool.name, icon: Workflow }
  const Icon = meta.icon
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="relative flex gap-3 rounded-xl p-2 hover:bg-surface-muted"
    >
      <span
        className={cn(
          'relative z-10 grid size-7 shrink-0 place-items-center rounded-full border bg-bg-elevated [&>svg]:size-3.5',
          tool.status === 'running' && 'border-agent text-agent',
          tool.status === 'ok' && 'border-success/40 text-success',
          tool.status === 'error' && 'border-danger/40 text-danger',
        )}
      >
        {tool.status === 'running' && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-agent/40"
            animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{meta.label}</p>
          <StatusIcon status={tool.status} />
          {tool.durationMs !== undefined && (
            <span className="ml-auto font-mono text-[10px] text-fg-subtle">{tool.durationMs} ms</span>
          )}
        </div>
        <p className="truncate font-mono text-[11px] text-fg-subtle">{summarizeArgs(tool)}</p>
        {tool.result && <p className={cn('mt-0.5 text-xs', tool.status === 'error' ? 'text-danger' : 'text-fg-muted')}>{summarizeResult(tool)}</p>}
      </div>
    </motion.li>
  )
}

function StatusIcon({ status }: { status: ToolEvent['status'] }) {
  if (status === 'running') return <LoaderCircle className="size-3.5 animate-spin text-agent" />
  if (status === 'ok') return <CircleCheck className="size-3.5 text-success" />
  return <CircleX className="size-3.5 text-danger" />
}

function summarizeArgs(tool: ToolEvent): string {
  if (tool.name === 'record_received_quantities') {
    const counts = (tool.args.counts ?? []) as { item: string; quantity: number }[]
    return counts.map((c) => `${c.item}=${c.quantity}`).join(', ')
  }
  const entries = Object.entries(tool.args)
  return entries.length ? entries.map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : 'no arguments'
}

function summarizeResult(tool: ToolEvent): string {
  const r = tool.result ?? {}
  if ('error' in r) return String(r.error)
  switch (tool.name) {
    case 'open_purchase_order':
      return `${String(r.po_number)} · ${String(r.vendor)} · ${(r.lines as unknown[]).length} lines`
    case 'record_received_quantities': {
      const warnings = (r.warnings as string[]) ?? []
      return warnings.length ? `⚠ ${warnings[0]}` : `Recorded; ${((r.still_needed as string[]) ?? []).length} lines left`
    }
    case 'record_damage':
      return `${String(r.damaged)} damaged → quarantine · ${String(r.good)} good`
    case 'review_receipt':
      return `${(r.shortages as unknown[]).length} shortages · ${(r.over_receipts as unknown[]).length} over-receipts`
    case 'post_goods_receipt':
      return `${String(r.grn_number)} · ${String(r.units_received)} into stock · ${String(r.units_quarantined ?? 0)} quarantined`
    case 'notify_vendor':
      return `Email to ${String(r.vendor)} (${String(r.status)})`
    default:
      return 'Done'
  }
}
