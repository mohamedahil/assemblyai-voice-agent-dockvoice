import { useQuery } from '@tanstack/react-query'
import { Truck } from 'lucide-react'
import { motion } from 'motion/react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Skeleton } from '@/components/ui/States'
import { api, queryKeys } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

/** Open purchase orders waiting at the dock. */
export function DockQueue({ subtitle }: { subtitle: string }) {
  const { data: pos, isLoading } = useQuery({
    queryKey: [...queryKeys.purchaseOrders, 'open'],
    queryFn: () => api.purchaseOrders('open'),
    // Oldest PO first: that's the truck that has waited longest.
    select: (list) => [...list].sort((a, b) => a.number.localeCompare(b.number)),
  })

  return (
    <Panel initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PanelHeader icon={<Truck />} title="Waiting at the dock" subtitle={subtitle} />
      <div className="grid gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-20" />)}
        {pos?.map((po, i) => (
          <motion.div
            key={po.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-border bg-surface-muted p-3.5 transition-colors hover:border-accent/40"
          >
            <div className="flex items-center justify-between">
              <span className="num text-sm font-semibold">{po.number}</span>
              <span className="text-[11px] text-fg-subtle">{po.line_count} lines</span>
            </div>
            <p className="mt-1 truncate text-sm text-fg-muted">{po.vendor.name}</p>
            <p className="num mt-1 text-[11px] text-fg-subtle">{formatCurrency(po.total_value)}</p>
          </motion.div>
        ))}
      </div>
    </Panel>
  )
}
