import { useQuery } from '@tanstack/react-query'
import { CircleDollarSign, Clock, PackageX, TrendingDown, TriangleAlert } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Stat } from '@/components/ui/Stat'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Tabs, type TabOption } from '@/components/ui/Tabs'
import { api, queryKeys } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatCurrency, timeAgo } from '@/lib/format'
import type { Discrepancy, DiscrepancyStatus } from '@/lib/types'

type Filter = DiscrepancyStatus | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'vendor_notified', label: 'Vendor notified' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
]

export function DiscrepanciesPage() {
  const [filter, setFilter] = useState<Filter>('open')
  // One fetch for everything: the tab counts and KPIs need the full set anyway.
  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.discrepancies, 'all'],
    queryFn: () => api.discrepancies(),
  })

  const all = data ?? []
  const open = all.filter((d) => d.status === 'open')
  const visible = filter === 'all' ? all : all.filter((d) => d.status === filter)
  const tabs: TabOption<Filter>[] = FILTERS.map((option) => ({
    ...option,
    count: option.value === 'all' ? all.length : all.filter((d) => d.status === option.value).length,
  }))

  return (
    <>
      <PageHeader
        eyebrow="Exceptions"
        title="Discrepancies"
        description="Shortages and over-receipts raised automatically when a count doesn't match the PO."
      />

      {error ? (
        <ErrorState message={error.message} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat index={0} label="Open" value={open.length} tone="danger" icon={<TriangleAlert />} />
            <Stat
              index={1}
              label="Open value"
              value={open.reduce((sum, d) => sum + d.value, 0)}
              format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
              tone="warning"
              icon={<CircleDollarSign />}
            />
            <Stat
              index={2}
              label="Shortages"
              value={all.filter((d) => d.type === 'shortage').length}
              tone="warning"
              icon={<TrendingDown />}
              hint="All time"
            />
            <Stat
              index={3}
              label="Damaged on arrival"
              value={all.filter((d) => d.type === 'damaged').length}
              tone="danger"
              icon={<PackageX />}
              hint="Held in quarantine"
            />
          </div>

          <Tabs options={tabs} value={filter} onChange={setFilter} className="mb-4" />

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : visible.length ? (
            <motion.div layout className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {visible.map((discrepancy, index) => (
                  <DiscrepancyCard key={discrepancy.id} discrepancy={discrepancy} index={index} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <Panel initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState
                icon={<TriangleAlert />}
                title="Nothing here"
                description={
                  filter === 'open'
                    ? 'Every count matched. The dock is clean.'
                    : 'No discrepancies in this status.'
                }
              />
            </Panel>
          )}
        </>
      )}
    </>
  )
}

function DiscrepancyCard({ discrepancy, index }: { discrepancy: Discrepancy; index: number }) {
  const tone =
    discrepancy.type === 'damaged' ? 'text-danger' : discrepancy.type === 'shortage' ? 'text-warning' : 'text-agent'
  const bar =
    discrepancy.type === 'damaged' ? 'bg-danger' : discrepancy.type === 'shortage' ? 'bg-warning' : 'bg-agent'
  const missing = discrepancy.type !== 'over_receipt'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 26,
        delay: Math.min(index * 0.04, 0.3),
        // Reflowing cards shouldn't wait on the entrance stagger.
        layout: { type: 'spring', stiffness: 320, damping: 32 },
      }}
      whileHover={{ y: -2 }}
      className="panel group relative overflow-hidden p-5"
    >
      <span
        className={cn('absolute inset-y-0 left-0 w-1', bar)}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{discrepancy.item.name}</p>
          <p className="font-mono text-[11px] text-fg-subtle">{discrepancy.item.sku}</p>
          {discrepancy.note && <p className="mt-1 text-xs text-danger">“{discrepancy.note}”</p>}
        </div>
        <StatusBadge status={discrepancy.type} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p
            className={cn(
              'num text-3xl font-semibold tracking-tight',
              tone,
            )}
          >
            {missing ? '−' : '+'}
            {discrepancy.quantity}
            <span className="ml-1 text-sm font-normal text-fg-subtle">{discrepancy.item.unit}</span>
          </p>
        </div>
        <p className="num text-lg font-medium">{formatCurrency(discrepancy.value)}</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-4 text-xs">
        <div>
          <dt className="text-fg-subtle">PO</dt>
          <dd>
            <Link to={`/purchase-orders/${discrepancy.po_number}`} className="num hover:text-accent">
              {discrepancy.po_number}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-fg-subtle">GRN</dt>
          <dd>
            <Link to={`/receipts/${discrepancy.grn_number}`} className="num hover:text-accent">
              {discrepancy.grn_number}
            </Link>
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-fg-subtle">Vendor</dt>
          <dd className="truncate font-medium">{discrepancy.vendor_name}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between">
        <StatusBadge status={discrepancy.status} />
        <span className="flex items-center gap-1 text-[11px] text-fg-subtle">
          <Clock className="size-3" /> {timeAgo(discrepancy.created_at)}
        </span>
      </div>
    </motion.div>
  )
}
