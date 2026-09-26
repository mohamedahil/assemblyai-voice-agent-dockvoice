import { useQuery } from '@tanstack/react-query'
import { Boxes, Mic, PackageCheck, TriangleAlert, UserRound } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Stat } from '@/components/ui/Stat'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { api, queryKeys } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDateTime, formatNumber } from '@/lib/format'
import type { GRNSummary } from '@/lib/types'

export function ReceiptsPage() {
  const {
    data: receipts,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.receipts,
    queryFn: api.receipts,
  })

  const voice = receipts?.filter((grn) => grn.source === 'voice').length ?? 0
  const units = receipts?.reduce((sum, grn) => sum + grn.total_units, 0) ?? 0
  const flagged = receipts?.filter((grn) => grn.discrepancy_count > 0).length ?? 0

  return (
    <>
      <PageHeader
        eyebrow="Goods receipts"
        title="Goods received notes"
        description="Every posted receipt, whether it was spoken to the agent at the dock or keyed in by hand."
      />

      {error ? (
        <ErrorState message={error.message} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat index={0} label="Total GRNs" value={receipts?.length ?? 0} icon={<PackageCheck />} />
            <Stat
              index={1}
              label="Voice GRNs"
              value={voice}
              tone="agent"
              icon={<Mic />}
              hint={
                receipts?.length ? `${Math.round((voice / receipts.length) * 100)}% hands-free` : undefined
              }
            />
            <Stat index={2} label="Units received" value={units} tone="success" icon={<Boxes />} />
            <Stat
              index={3}
              label="With discrepancies"
              value={flagged}
              tone="warning"
              icon={<TriangleAlert />}
            />
          </div>

          <Panel initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <PanelHeader icon={<PackageCheck />} title="Receipt log" subtitle="Newest first" />
            {isLoading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : receipts?.length ? (
              <ReceiptsTable receipts={receipts} />
            ) : (
              <EmptyState
                icon={<PackageCheck />}
                title="No receipts yet"
                description="Post a receipt from the receiving cockpit and it will show up here."
              />
            )}
          </Panel>
        </>
      )}
    </>
  )
}

function ReceiptsTable({ receipts }: { receipts: GRNSummary[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] tracking-wider text-fg-subtle uppercase">
            <th className="px-5 py-3 font-medium">GRN</th>
            <th className="px-3 py-3 font-medium">PO</th>
            <th className="px-3 py-3 font-medium">Vendor</th>
            <th className="px-3 py-3 font-medium">Source</th>
            <th className="px-3 py-3 font-medium">Received</th>
            <th className="px-3 py-3 text-right font-medium">Units</th>
            <th className="px-5 py-3 text-right font-medium">Discrepancies</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((grn, index) => {
            const isVoice = grn.source === 'voice'
            return (
              <motion.tr
                key={grn.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.035, 0.4), duration: 0.35 }}
                onClick={() => navigate(`/receipts/${grn.number}`)}
                className={cn(
                  'group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-muted',
                  // Voice receipts are the headline feature, so they get a faint agent wash.
                  isVoice && 'bg-gradient-to-r from-agent-soft to-transparent',
                )}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-lg',
                        isVoice
                          ? 'bg-agent-soft text-agent shadow-[0_0_16px_-4px_var(--agent)]'
                          : 'bg-surface-muted text-fg-subtle',
                      )}
                    >
                      {isVoice ? <Mic className="size-3.5" /> : <UserRound className="size-3.5" />}
                    </span>
                    <Link
                      to={`/receipts/${grn.number}`}
                      onClick={(event) => event.stopPropagation()}
                      className="num font-semibold transition-colors group-hover:text-accent"
                    >
                      {grn.number}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <Link
                    to={`/purchase-orders/${grn.po_number}`}
                    onClick={(event) => event.stopPropagation()}
                    className="num text-fg-muted transition-colors hover:text-accent"
                  >
                    {grn.po_number}
                  </Link>
                </td>
                <td className="px-3 py-3.5 font-medium">{grn.vendor_name}</td>
                <td className="px-3 py-3.5">
                  <StatusBadge status={grn.source} />
                </td>
                <td className="num px-3 py-3.5 text-xs text-fg-muted">{formatDateTime(grn.received_at)}</td>
                <td className="num px-3 py-3.5 text-right">{formatNumber(grn.total_units)}</td>
                <td className="px-5 py-3.5 text-right">
                  {grn.discrepancy_count ? (
                    <Badge tone="warning">
                      <TriangleAlert className="size-3" />
                      <span className="num">{grn.discrepancy_count}</span>
                    </Badge>
                  ) : (
                    <Badge tone="success">Clean</Badge>
                  )}
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
