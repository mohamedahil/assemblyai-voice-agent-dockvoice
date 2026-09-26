import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ClipboardList, Search } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { StatusBadge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Tabs, type TabOption } from '@/components/ui/Tabs'
import { api, queryKeys } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'
import type { POStatus, POSummary } from '@/lib/types'
import { formatDay, isOverdue } from './dates'

type Filter = POStatus | 'all'

const FILTERS: TabOption<Filter>[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'partially_received', label: 'Partially received' },
  { value: 'received', label: 'Received' },
]

export function PurchaseOrdersPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const status = filter === 'all' ? undefined : filter

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.purchaseOrders, status ?? 'all'],
    queryFn: () => api.purchaseOrders(status),
    placeholderData: keepPreviousData,
  })

  const term = search.trim().toLowerCase()
  const pos = data?.filter(
    (po) => !term || po.number.toLowerCase().includes(term) || po.vendor.name.toLowerCase().includes(term),
  )

  return (
    <>
      <PageHeader
        eyebrow="Purchasing"
        title="Purchase orders"
        description="Everything on order, what has landed at the dock and what is still outstanding."
      />

      <Panel initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <Tabs options={FILTERS} value={filter} onChange={setFilter} />
          <label className="flex h-9 w-full items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 text-sm transition-colors focus-within:border-accent/50 sm:w-72">
            <Search className="size-4 shrink-0 text-fg-subtle" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search PO number or vendor"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-fg-subtle"
            />
          </label>
        </div>

        {error ? (
          <div className="p-5">
            <ErrorState message={error.message} />
          </div>
        ) : isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : pos?.length ? (
          <POTable pos={pos} />
        ) : (
          <EmptyState
            icon={<ClipboardList />}
            title="No purchase orders"
            description={term ? `Nothing matches “${search.trim()}”.` : 'No POs in this status.'}
          />
        )}
      </Panel>
    </>
  )
}

function POTable({ pos }: { pos: POSummary[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] tracking-wider text-fg-subtle uppercase">
            <th className="px-5 py-3 font-medium">PO number</th>
            <th className="px-3 py-3 font-medium">Vendor</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Expected</th>
            <th className="px-3 py-3 text-right font-medium">Lines</th>
            <th className="px-3 py-3 text-right font-medium">Value</th>
            <th className="w-[18%] px-5 py-3 font-medium">Received</th>
          </tr>
        </thead>
        <tbody>
          {pos.map((po, index) => (
            <motion.tr
              key={po.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.4), duration: 0.35 }}
              onClick={() => navigate(`/purchase-orders/${po.number}`)}
              className="group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-muted"
            >
              <td className="px-5 py-3.5">
                <Link
                  to={`/purchase-orders/${po.number}`}
                  onClick={(event) => event.stopPropagation()}
                  className="num font-semibold transition-colors group-hover:text-accent"
                >
                  {po.number}
                </Link>
              </td>
              <td className="px-3 py-3.5">
                <p className="font-medium">{po.vendor.name}</p>
                <p className="text-[11px] text-fg-subtle">{po.vendor.city}</p>
              </td>
              <td className="px-3 py-3.5">
                <StatusBadge status={po.status} />
              </td>
              <td className={cn('num px-3 py-3.5 text-xs', isOverdue(po) ? 'text-warning' : 'text-fg-muted')}>
                {formatDay(po.expected_date)}
                {isOverdue(po) && <span className="ml-1.5 font-sans">· overdue</span>}
              </td>
              <td className="num px-3 py-3.5 text-right text-fg-muted">{po.line_count}</td>
              <td className="num px-3 py-3.5 text-right">{formatCurrency(po.total_value)}</td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <ProgressBar
                    value={po.received_pct}
                    tone={po.received_pct >= 100 ? 'success' : 'accent'}
                    delay={0.15 + Math.min(index * 0.035, 0.4)}
                    className="flex-1"
                  />
                  <span className="num w-10 text-right text-[11px] text-fg-muted">
                    {Math.round(po.received_pct)}%
                  </span>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
