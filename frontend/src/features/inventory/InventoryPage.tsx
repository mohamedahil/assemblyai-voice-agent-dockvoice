import { useQuery } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowDownUp, Boxes, CircleDollarSign, TriangleAlert } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Stat } from '@/components/ui/Stat'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { api, queryKeys } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatCurrency, formatNumber, timeAgo } from '@/lib/format'
import type { Item, Movement } from '@/lib/types'

const isLow = (item: Item) => item.on_hand < item.reorder_point

export function InventoryPage() {
  const {
    data: items,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...queryKeys.inventory, 'items'],
    queryFn: api.items,
  })

  const value = items?.reduce((sum, item) => sum + item.on_hand * item.unit_cost, 0) ?? 0
  const low = items?.filter(isLow).length ?? 0

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock on hand"
        description="Live quantities by bin. Every posted receipt lands here the moment the agent posts it."
      />

      {error ? (
        <ErrorState message={error.message} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat index={0} label="SKUs tracked" value={items?.length ?? 0} icon={<Boxes />} />
            <Stat
              index={1}
              label="Inventory value"
              value={value}
              format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
              tone="success"
              icon={<CircleDollarSign />}
            />
            <Stat
              index={2}
              label="Below reorder point"
              value={low}
              tone={low ? 'warning' : 'success'}
              icon={<TriangleAlert />}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-12">
            <Panel
              className="self-start xl:col-span-8"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <PanelHeader icon={<Boxes />} title="Items" subtitle="On hand against reorder point" />
              {isLoading ? (
                <div className="space-y-2 p-5">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : items?.length ? (
                <ItemsTable items={items} />
              ) : (
                <EmptyState icon={<Boxes />} title="No items" description="The item master is empty." />
              )}
            </Panel>

            <MovementsFeed />
          </div>
        </>
      )}
    </>
  )
}

function ItemsTable({ items }: { items: Item[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] tracking-wider text-fg-subtle uppercase">
            <th className="px-5 py-3 font-medium">Item</th>
            <th className="px-3 py-3 font-medium">Category</th>
            <th className="px-3 py-3 font-medium">Bin</th>
            <th className="w-[32%] px-3 py-3 font-medium">On hand / reorder</th>
            <th className="px-5 py-3 text-right font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <motion.tr
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.4), duration: 0.35 }}
              className="border-b border-border transition-colors last:border-0 hover:bg-surface-muted"
            >
              <td className="px-5 py-3.5">
                <p className="font-medium">{item.name}</p>
                <p className="font-mono text-[11px] text-fg-subtle">{item.sku}</p>
              </td>
              <td className="px-3 py-3.5 text-fg-muted">{item.category}</td>
              <td className="px-3 py-3.5">
                <span className="num rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[11px] text-fg-muted">
                  {item.bin_location}
                </span>
              </td>
              <td className="px-3 py-3.5">
                <StockBar item={item} delay={0.15 + Math.min(index * 0.035, 0.4)} />
              </td>
              <td className="num px-5 py-3.5 text-right">{formatCurrency(item.on_hand * item.unit_cost)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** On-hand bar scaled to twice the reorder point, with a tick marking where reordering kicks in. */
function StockBar({ item, delay }: { item: Item; delay: number }) {
  const low = isLow(item)
  const scale = Math.max(item.on_hand, item.reorder_point * 2, 1)
  const fill = (item.on_hand / scale) * 100
  const marker = (item.reorder_point / scale) * 100

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="flex items-center gap-2">
          <span className={cn('num font-semibold', low ? 'text-warning' : 'text-fg')}>
            {formatNumber(item.on_hand)}
          </span>
          <span className="text-fg-subtle">
            / <span className="num">{formatNumber(item.reorder_point)}</span> {item.unit}
          </span>
        </span>
        <span className="flex gap-1">
          {item.quarantined > 0 && <Badge tone="danger">{item.quarantined} quarantined</Badge>}
          {low && <Badge tone="warning">Low stock</Badge>}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-muted">
        <motion.div
          className={cn(
            'h-full rounded-full',
            low
              ? 'bg-gradient-to-r from-warning/70 to-warning'
              : 'bg-gradient-to-r from-success/60 to-success',
          )}
          initial={{ width: 0 }}
          animate={{ width: `${fill}%` }}
          transition={{ type: 'spring', stiffness: 110, damping: 20, delay }}
        />
        <span
          className="absolute -top-0.5 -bottom-0.5 w-px bg-fg-subtle"
          style={{ left: `${marker}%` }}
          title="Reorder point"
        />
      </div>
    </div>
  )
}

function MovementsFeed() {
  const {
    data: movements,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...queryKeys.inventory, 'movements'],
    queryFn: () => api.movements(30),
  })

  return (
    <Panel
      className="self-start xl:col-span-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <PanelHeader icon={<ArrowDownUp />} title="Recent movements" subtitle="Stock posted by receipts" />
      {error ? (
        <div className="p-5">
          <ErrorState message={error.message} />
        </div>
      ) : isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : movements?.length ? (
        <ul className="max-h-[640px] divide-y divide-border overflow-y-auto">
          <AnimatePresence initial={false}>
            {movements.map((movement, index) => (
              <MovementRow key={movement.id} movement={movement} index={index} />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <EmptyState
          icon={<ArrowDownToLine />}
          title="No movements yet"
          description="Receipts posted by the agent will stream in here."
        />
      )}
    </Panel>
  )
}

function MovementRow({ movement, index }: { movement: Movement; index: number }) {
  const inbound = movement.quantity >= 0
  const quarantine = movement.type === 'quarantine'

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <span
        className={cn(
          'num w-14 shrink-0 text-right text-sm font-semibold',
          quarantine ? 'text-danger' : inbound ? 'text-success' : 'text-warning',
        )}
      >
        {inbound ? '+' : '−'}
        {formatNumber(Math.abs(movement.quantity))}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{movement.item.name}</p>
        <p className="text-[11px] text-fg-subtle">
          {movement.reference.startsWith('GRN-') ? (
            <Link to={`/receipts/${movement.reference}`} className="num transition-colors hover:text-accent">
              {movement.reference}
            </Link>
          ) : (
            <span className="num">{movement.reference}</span>
          )}{' '}
          · {formatNumber(movement.on_hand_after)} {quarantine ? 'in quarantine' : 'on hand'}
        </p>
      </div>
      <span className="shrink-0 text-[11px] text-fg-subtle">{timeAgo(movement.created_at)}</span>
    </motion.li>
  )
}
