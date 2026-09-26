import { Check, Minus, PackageX, Plus } from 'lucide-react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { DraftLine, DraftView } from '@/lib/types'

export function ReceivingTable({ draft }: { draft: DraftView }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] tracking-wider text-fg-subtle uppercase">
            <th className="px-5 py-3 font-medium">Item</th>
            <th className="px-3 py-3 text-right font-medium">Expected</th>
            <th className="px-3 py-3 text-right font-medium">Received</th>
            <th className="w-[28%] px-3 py-3 font-medium">Progress</th>
            <th className="px-5 py-3 text-right font-medium">Variance</th>
          </tr>
        </thead>
        <tbody>
          {draft.lines.map((line, index) => (
            <Row key={line.po_line_id} line={line} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ line, index }: { line: DraftLine; index: number }) {
  const [scope, animate] = useAnimate<HTMLTableRowElement>()
  const changes = useChangeCounter(line.received_qty)
  const scale = Math.max(line.expected_qty, line.received_qty ?? 0, 1)
  const goodPct = (((line.received_qty ?? 0) - line.damaged_qty) / scale) * 100
  const damagedPct = (line.damaged_qty / scale) * 100

  useEffect(() => {
    if (!changes || !scope.current) return
    const color = FLASH[line.status]
    void animate(scope.current, { backgroundColor: [color, 'rgba(0,0,0,0)'] }, { duration: 1.4 })
  }, [changes, line.status, animate, scope])

  return (
    <motion.tr
      ref={scope}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.4 }}
      className="border-b border-border last:border-0"
    >
      <td className="px-5 py-4">
        <p className="font-medium">{line.name}</p>
        <p className="font-mono text-[11px] text-fg-subtle">
          {line.sku} · line {line.line_no}
        </p>
      </td>
      <td className="num px-3 py-4 text-right text-fg-muted">{line.expected_qty}</td>
      <td className="px-3 py-4 text-right">
        <ReceivedValue value={line.received_qty} />
        <AnimatePresence>
          {line.damaged_qty > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-1 flex justify-end"
            >
              <Badge tone="danger">
                <PackageX className="size-3" />
                <span className="num">{line.damaged_qty}</span> damaged
              </Badge>
            </motion.p>
          )}
        </AnimatePresence>
        {line.damage_note && (
          <p className="mt-0.5 max-w-40 truncate text-[10px] text-danger/80">{line.damage_note}</p>
        )}
      </td>
      <td className="px-3 py-4">
        {/* Good units in the line's status color, damaged units in red at the end. */}
        <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted">
          <motion.div
            className={cn(
              'h-full',
              line.status === 'match' && 'bg-success',
              line.status === 'short' && 'bg-gradient-to-r from-warning/70 to-warning',
              line.status === 'over' && 'bg-agent',
            )}
            initial={{ width: 0 }}
            animate={{ width: `${goodPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
          <motion.div
            className="h-full bg-[repeating-linear-gradient(135deg,var(--danger)_0_4px,transparent_4px_7px)]"
            initial={{ width: 0 }}
            animate={{ width: `${damagedPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </td>
      <td className="px-5 py-4 text-right">
        <VarianceBadge line={line} />
      </td>
    </motion.tr>
  )
}

const FLASH: Record<DraftLine['status'], string> = {
  pending: 'rgba(148, 163, 184, 0.15)',
  match: 'rgba(52, 211, 153, 0.18)',
  short: 'rgba(251, 191, 36, 0.2)',
  over: 'rgba(167, 139, 250, 0.2)',
}

/** The correction moment: the old count is struck through and slides away as the new one rolls in. */
export function ReceivedValue({ value }: { value: number | null }) {
  const previous = usePrevious(value)
  const corrected = previous !== undefined && previous !== null && value !== null && previous !== value

  return (
    <span className="relative inline-flex h-7 min-w-12 items-center justify-end overflow-visible">
      <AnimatePresence mode="popLayout" initial={false}>
        {value === null ? (
          <motion.span
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-1"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-fg-subtle"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.span>
        ) : (
          <motion.span
            key={value}
            initial={{ y: 18, opacity: 0, scale: 1.3 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, textDecorationLine: 'line-through' }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            className="num text-lg font-semibold"
          >
            {value}
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {corrected && (
          <motion.span
            key={`was-${previous}-${value}`}
            initial={{ opacity: 1, x: 0 }}
            animate={{ opacity: 0, x: -34 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
            className="num pointer-events-none absolute right-full mr-2 text-sm text-danger line-through"
          >
            {previous}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

function VarianceBadge({ line }: { line: DraftLine }) {
  if (line.status === 'pending') return <Badge>Awaiting count</Badge>
  if (line.status === 'match')
    return (
      <Badge tone="success">
        <Check className="size-3" /> Match
      </Badge>
    )
  const variance = line.variance ?? 0
  return (
    <motion.span key={variance} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <Badge tone={line.status === 'short' ? 'warning' : 'agent'}>
        {variance < 0 ? <Minus className="size-3" /> : <Plus className="size-3" />}
        <span className="num">{Math.abs(variance)}</span>
        {line.status === 'short' ? 'short' : 'over'}
      </Badge>
    </motion.span>
  )
}

function usePrevious<T>(value: T): T | undefined {
  const [state, setState] = useState<{ current: T; previous: T | undefined }>({
    current: value,
    previous: undefined,
  })
  if (!Object.is(state.current, value)) setState({ current: value, previous: state.current })
  return state.previous
}

/** Increments each time `value` changes after the first render. */
function useChangeCounter(value: unknown): number {
  const [count, setCount] = useState(0)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setCount((c) => c + 1)
  }, [value])
  return count
}
