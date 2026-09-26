import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowUpRight,
  Factory,
  GitCommitVertical,
  ListChecks,
  Mail,
  MapPin,
  User,
} from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { StatusBadge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { ApiError, api, queryKeys } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'
import type { PODetail, POLine } from '@/lib/types'
import { formatDay, isOverdue } from './dates'

const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404

export function PODetailPage() {
  const { number = '' } = useParams()
  const { data: po, error } = useQuery({
    queryKey: [...queryKeys.purchaseOrders, 'detail', number],
    queryFn: () => api.purchaseOrder(number),
    retry: (count, err) => !isNotFound(err) && count < 1,
  })

  return (
    <>
      <BackLink />
      {error ? (
        <ErrorState message={isNotFound(error) ? `Purchase order ${number} doesn't exist.` : error.message} />
      ) : po ? (
        <PODetailView po={po} />
      ) : (
        <DetailSkeleton />
      )}
    </>
  )
}

function BackLink() {
  return (
    <Link
      to="/purchase-orders"
      className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-accent"
    >
      <ArrowLeft className="size-3.5" /> Purchase orders
    </Link>
  )
}

function PODetailView({ po }: { po: PODetail }) {
  return (
    <>
      <PageHeader
        eyebrow={`Purchase order · ${po.vendor.code}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="num">{po.number}</span>
            <StatusBadge status={po.status} className="text-xs" />
          </span>
        }
        description={
          <>
            {po.vendor.name} · ordered {formatDay(po.order_date)} ·{' '}
            <span className="num text-fg">{formatCurrency(po.total_value)}</span>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-12">
        <Panel
          className="self-start xl:col-span-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PanelHeader
            icon={<ListChecks />}
            title="Order lines"
            subtitle={`${po.line_count} lines · ${Math.round(po.received_pct)}% received`}
          />
          <LinesTable lines={po.lines} />
        </Panel>

        <div className="space-y-5 xl:col-span-4">
          <VendorCard po={po} />
          <Timeline po={po} />
        </div>
      </div>
    </>
  )
}

function LinesTable({ lines }: { lines: POLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] tracking-wider text-fg-subtle uppercase">
            <th className="px-5 py-3 font-medium">Item</th>
            <th className="px-3 py-3 text-right font-medium">Ordered</th>
            <th className="px-3 py-3 text-right font-medium">Received</th>
            <th className="px-3 py-3 text-right font-medium">Outstanding</th>
            <th className="w-[24%] px-5 py-3 font-medium">Progress</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const pct = line.ordered_qty ? (line.received_qty / line.ordered_qty) * 100 : 0
            return (
              <motion.tr
                key={line.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 * index, duration: 0.35 }}
                className="border-b border-border last:border-0"
              >
                <td className="px-5 py-3.5">
                  <p className="font-medium">{line.item.name}</p>
                  <p className="font-mono text-[11px] text-fg-subtle">
                    {line.item.sku} · line {line.line_no}
                  </p>
                </td>
                <td className="num px-3 py-3.5 text-right text-fg-muted">{formatNumber(line.ordered_qty)}</td>
                <td className="num px-3 py-3.5 text-right font-medium">{formatNumber(line.received_qty)}</td>
                <td
                  className={cn(
                    'num px-3 py-3.5 text-right',
                    line.outstanding_qty > 0 ? 'text-warning' : 'text-fg-subtle',
                  )}
                >
                  {formatNumber(line.outstanding_qty)}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <ProgressBar
                      value={pct}
                      tone={pct >= 100 ? 'success' : 'accent'}
                      delay={0.2 + 0.06 * index}
                      className="flex-1"
                    />
                    <span className="num w-9 text-right text-[11px] text-fg-muted">{Math.round(pct)}%</span>
                  </div>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VendorCard({ po }: { po: PODetail }) {
  const { vendor } = po
  return (
    <Panel
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      whileHover={{ y: -2 }}
    >
      <PanelHeader icon={<Factory />} title={vendor.name} subtitle={`Vendor ${vendor.code}`} />
      <dl className="space-y-3 p-5 text-sm">
        <VendorRow icon={<User />} label="Contact">
          {vendor.contact_name}
        </VendorRow>
        <VendorRow icon={<Mail />} label="Email">
          <a href={`mailto:${vendor.email}`} className="truncate transition-colors hover:text-accent">
            {vendor.email}
          </a>
        </VendorRow>
        <VendorRow icon={<MapPin />} label="City">
          {vendor.city}
        </VendorRow>
      </dl>
    </Panel>
  )
}

function VendorRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-subtle [&>svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] text-fg-subtle">{label}</dt>
        <dd className="flex min-w-0 font-medium">{children}</dd>
      </div>
    </div>
  )
}

type StepState = 'done' | 'warning' | 'pending'

interface TimelineStep {
  key: string
  title: ReactNode
  meta: string
  state: StepState
}

function timelineSteps(po: PODetail): TimelineStep[] {
  const outstanding = po.lines.reduce((sum, line) => sum + line.outstanding_qty, 0)
  const complete = po.status === 'received' || po.status === 'closed'
  const overdue = isOverdue(po)
  const receipts = [...po.receipts].sort((a, b) => a.received_at.localeCompare(b.received_at))

  const receiptSteps = receipts.map((grn): TimelineStep => ({
    key: grn.number,
    title: (
      <Link
        to={`/receipts/${grn.number}`}
        className="inline-flex items-center gap-1 transition-colors hover:text-accent"
      >
        Received <span className="num">{grn.number}</span>
        <ArrowUpRight className="size-3.5" />
      </Link>
    ),
    meta: `${formatDateTime(grn.received_at)} · ${formatNumber(grn.total_units)} units · ${grn.source}`,
    state: grn.discrepancy_count ? 'warning' : 'done',
  }))

  return [
    { key: 'ordered', title: 'Ordered', meta: formatDay(po.order_date), state: 'done' },
    {
      key: 'expected',
      title: 'Expected at dock',
      meta: `${formatDay(po.expected_date)}${overdue ? ' · overdue' : ''}`,
      state: overdue ? 'warning' : receipts.length || complete ? 'done' : 'pending',
    },
    ...receiptSteps,
    {
      key: 'final',
      title: complete ? 'Received in full' : 'Awaiting remaining goods',
      meta: complete ? 'PO closed out' : `${formatNumber(outstanding)} units outstanding`,
      state: complete ? 'done' : 'pending',
    },
  ]
}

const dotStyles: Record<StepState, string> = {
  done: 'border-success bg-success shadow-[0_0_12px_-2px_var(--success)]',
  warning: 'border-warning bg-warning shadow-[0_0_12px_-2px_var(--warning)]',
  pending: 'border-border-strong bg-bg-elevated',
}

function Timeline({ po }: { po: PODetail }) {
  const steps = timelineSteps(po)

  return (
    <Panel initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
      <PanelHeader
        icon={<GitCommitVertical />}
        title="Timeline"
        subtitle={`${po.receipts.length} ${po.receipts.length === 1 ? 'receipt' : 'receipts'} posted`}
      />
      <ol className="relative p-5">
        <motion.span
          aria-hidden
          className="absolute top-7 bottom-7 left-[25px] w-px origin-top bg-border-strong"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
        {steps.map((step, index) => (
          <motion.li
            key={step.key}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + index * 0.1 }}
            className="relative flex gap-3.5 pb-5 last:pb-0"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.3 + index * 0.1 }}
              className={cn('relative mt-1 size-3 shrink-0 rounded-full border-2', dotStyles[step.state])}
            />
            <div className="min-w-0">
              <p className={cn('text-sm font-medium', step.state === 'pending' && 'text-fg-muted')}>
                {step.title}
              </p>
              <p className="text-xs text-fg-subtle">{step.meta}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </Panel>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-16 w-72" />
      <div className="grid gap-5 xl:grid-cols-12">
        <Skeleton className="h-80 xl:col-span-8" />
        <div className="space-y-5 xl:col-span-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  )
}
