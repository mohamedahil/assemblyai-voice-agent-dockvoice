import { useQuery } from '@tanstack/react-query'
import {
  AudioLines,
  Boxes,
  Gauge,
  Mic,
  PackageCheck,
  TrendingUp,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Stat } from '@/components/ui/Stat'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { api, queryKeys } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatCurrency, timeAgo } from '@/lib/format'
import type { Dashboard } from '@/lib/types'
import { ReceiptsTrend } from './ReceiptsTrend'

export function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: api.dashboard,
    refetchInterval: 15_000,
  })

  return (
    <>
      <PageHeader
        eyebrow="Operations overview"
        title={greeting()}
        description="Live picture of the receiving dock. Every number updates the moment the voice agent posts a receipt."
        actions={
          <Button variant="primary" onClick={() => navigate('/receiving')}>
            <Mic className="size-4" /> Start receiving
          </Button>
        }
      />

      {error && <ErrorState message="Could not load the dashboard. Is the backend running?" />}
      {isLoading && <DashboardSkeleton />}
      {data && <DashboardContent data={data} />}
    </>
  )
}

function DashboardContent({ data }: { data: Dashboard }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          index={0}
          label="Receipts today"
          value={data.receipts_today}
          icon={<PackageCheck />}
          hint={<><span className="num">{data.units_today}</span> units into stock</>}
        />
        <Stat
          index={1}
          label="Fill rate · 14 days"
          value={data.fill_rate}
          suffix="%"
          tone="success"
          icon={<Gauge />}
          hint="Received vs. expected on posted GRNs"
        />
        <Stat
          index={2}
          label="Open discrepancies"
          value={data.open_discrepancies}
          tone="warning"
          icon={<TriangleAlert />}
          hint={<><span className="num">{formatCurrency(data.open_shortage_value)}</span> at stake</>}
        />
        <Stat
          index={3}
          label="Inventory value"
          value={data.inventory_value}
          format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
          tone="agent"
          icon={<Boxes />}
          hint={
            data.low_stock_items ? (
              <span className="text-warning">{data.low_stock_items} items below reorder point</span>
            ) : (
              'All items above reorder point'
            )
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <PanelHeader
            icon={<TrendingUp />}
            title="Units received"
            subtitle="Last 14 days"
            action={<Badge tone="accent" dot>{data.open_pos} open POs</Badge>}
          />
          <div className="h-72 px-2 pt-4 pb-2">
            <ReceiptsTrend daily={data.daily} />
          </div>
        </Panel>

        <Panel
          className="xl:col-span-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <PanelHeader icon={<Truck />} title="Vendor fill rate" subtitle="Lowest first" />
          <VendorBars vendors={data.vendors} />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
        >
          <PanelHeader
            icon={<PackageCheck />}
            title="Recent goods receipts"
            action={
              <Link to="/receipts" className="text-xs font-medium text-accent hover:underline">
                View all
              </Link>
            }
          />
          <RecentReceipts receipts={data.recent_receipts} />
        </Panel>
        <VoicePromo />
      </div>
    </div>
  )
}

function VendorBars({ vendors }: { vendors: Dashboard['vendors'] }) {
  if (!vendors.length) return <EmptyState icon={<Truck />} title="No receipts yet" />
  return (
    <ul className="space-y-4 p-5">
      {vendors.map((vendor, i) => {
        const tone = vendor.fill_rate >= 97 ? 'bg-success' : vendor.fill_rate >= 90 ? 'bg-accent' : 'bg-warning'
        return (
          <li key={vendor.vendor_name}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">{vendor.vendor_name}</span>
              <span className="num text-xs text-fg-muted">{vendor.fill_rate.toFixed(1)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <motion.div
                className={cn('h-full rounded-full', tone)}
                initial={{ width: 0 }}
                animate={{ width: `${vendor.fill_rate}%` }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="mt-1 text-[11px] text-fg-subtle">
              {vendor.receipts} receipts · <span className="num">{formatCurrency(vendor.shortage_value)}</span> short
            </p>
          </li>
        )
      })}
    </ul>
  )
}

function RecentReceipts({ receipts }: { receipts: Dashboard['recent_receipts'] }) {
  if (!receipts.length) return <EmptyState icon={<PackageCheck />} title="No receipts in the last 14 days" />
  return (
    <ul className="divide-y divide-border">
      {receipts.map((grn, i) => (
        <motion.li
          key={grn.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.05 }}
        >
          <Link
            to={`/receipts/${grn.number}`}
            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted"
          >
            <span
              className={cn(
                'grid size-8 place-items-center rounded-lg [&>svg]:size-4',
                grn.source === 'voice' ? 'bg-agent-soft text-agent' : 'bg-surface-muted text-fg-subtle',
              )}
            >
              {grn.source === 'voice' ? <AudioLines /> : <PackageCheck />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                <span className="num">{grn.number}</span>
                <span className="text-fg-subtle"> · {grn.vendor_name}</span>
              </p>
              <p className="text-xs text-fg-subtle">
                <span className="num">{grn.po_number}</span> · {grn.total_units} units · {timeAgo(grn.received_at)}
              </p>
            </div>
            {grn.discrepancy_count > 0 ? (
              <Badge tone="warning">{grn.discrepancy_count} issues</Badge>
            ) : (
              <Badge tone="success">Complete</Badge>
            )}
          </Link>
        </motion.li>
      ))}
    </ul>
  )
}

function VoicePromo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="panel relative overflow-hidden p-6 xl:col-span-5"
    >
      <div className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full bg-agent/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -left-10 size-60 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative">
        <Badge tone="agent" dot>
          AssemblyAI Voice Agent
        </Badge>
        <h3 className="mt-4 text-xl font-semibold tracking-tight">
          Your hands are full. <span className="text-gradient">Just say it.</span>
        </h3>
        <p className="mt-2 text-sm text-fg-muted">
          Read the PO, call out the counts, fix a mis-count mid-sentence. The copilot drafts the receipt,
          reads it back and posts only after you confirm.
        </p>
        <div className="mt-5 flex items-end gap-1" aria-hidden>
          {Array.from({ length: 28 }, (_, i) => (
            <motion.span
              key={i}
              className="w-1.5 rounded-full bg-gradient-to-t from-accent to-agent"
              animate={{ height: [6, 10 + ((i * 37) % 30), 6] }}
              transition={{ duration: 1.1 + (i % 5) * 0.15, repeat: Infinity, delay: i * 0.04 }}
            />
          ))}
        </div>
        <Link to="/receiving" className="mt-5 inline-block">
          <Button variant="primary">
            <Mic className="size-4" /> Open receiving cockpit
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  return `Good ${part}, Dock 3`
}
