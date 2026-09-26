import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mic, Printer, TriangleAlert } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { ApiError, api, queryKeys } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'
import type { GRNDetail, GRNLine } from '@/lib/types'

const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404

export function ReceiptDetailPage() {
  const { number = '' } = useParams()
  const { data: grn, error } = useQuery({
    queryKey: [...queryKeys.receipts, number],
    queryFn: () => api.receipt(number),
    retry: (count, err) => !isNotFound(err) && count < 1,
  })

  return (
    <>
      <Link
        to="/receipts"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-accent print:hidden"
      >
        <ArrowLeft className="size-3.5" /> Goods receipts
      </Link>
      <PageHeader
        eyebrow="Goods received note"
        title={<span className="num">{number}</span>}
        description="The posted record of what physically arrived, line by line."
        actions={
          grn && (
            <Button onClick={() => window.print()} className="print:hidden">
              <Printer className="size-4" /> Print
            </Button>
          )
        }
      />
      {error ? (
        <ErrorState message={isNotFound(error) ? `Receipt ${number} doesn't exist.` : error.message} />
      ) : grn ? (
        <ReceiptDocument grn={grn} />
      ) : (
        <Skeleton className="mx-auto h-[640px] max-w-4xl rounded-2xl" />
      )}
    </>
  )
}

function ReceiptDocument({ grn }: { grn: GRNDetail }) {
  const isVoice = grn.source === 'voice'

  return (
    <motion.article
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
      className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated shadow-panel print:border-0 print:shadow-none"
    >
      <Watermark />
      <div className="h-1.5 bg-gradient-to-r from-accent via-agent to-accent" />

      <div className="relative p-6 sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-dashed border-border-strong pb-6">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-fg-subtle uppercase">
              DockVoice · Receiving
            </p>
            <h2 className="num mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{grn.number}</h2>
            <p className="mt-1 text-sm text-fg-muted">Goods received note</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isVoice ? (
              <Badge tone="agent" className="px-2.5 py-1 text-xs">
                <Mic className="size-3.5" /> Received by voice
              </Badge>
            ) : (
              <StatusBadge status={grn.source} className="px-2.5 py-1 text-xs" />
            )}
            {grn.discrepancy_count > 0 && (
              <Badge tone="warning">
                <TriangleAlert className="size-3" /> {grn.discrepancy_count}{' '}
                {grn.discrepancy_count === 1 ? 'discrepancy' : 'discrepancies'}
              </Badge>
            )}
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-dashed border-border-strong py-6 sm:grid-cols-4">
          <Meta label="Purchase order">
            <Link to={`/purchase-orders/${grn.po_number}`} className="num text-accent hover:underline">
              {grn.po_number}
            </Link>
          </Meta>
          <Meta label="Vendor">{grn.vendor_name}</Meta>
          <Meta label="Received at">{formatDateTime(grn.received_at)}</Meta>
          <Meta label="Total units">
            <span className="num">{formatNumber(grn.total_units)}</span>
          </Meta>
        </dl>

        <section className="py-6">
          <SectionTitle>Lines</SectionTitle>
          <LinesTable lines={grn.lines} />
        </section>

        {grn.discrepancies.length > 0 && (
          <section className="border-t border-dashed border-border-strong py-6">
            <SectionTitle>Discrepancies</SectionTitle>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {grn.discrepancies.map((discrepancy, index) => (
                <motion.li
                  key={discrepancy.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.06 }}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusBadge status={discrepancy.type} />
                    <span className="truncate font-medium">{discrepancy.item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="num text-fg-muted">
                      {discrepancy.type === 'over_receipt' ? '+' : '−'}
                      {discrepancy.quantity} {discrepancy.item.unit}
                    </span>
                    <span className="num font-medium">{formatCurrency(discrepancy.value)}</span>
                    <StatusBadge status={discrepancy.status} />
                  </div>
                </motion.li>
              ))}
            </ul>
          </section>
        )}

        <footer className="grid gap-8 border-t border-dashed border-border-strong pt-8 sm:grid-cols-2">
          <Signature
            label="Received by"
            value={isVoice ? 'DockVoice agent, confirmed verbally' : 'Dock clerk'}
          />
          <Signature label="Checked by" />
        </footer>
      </div>
    </motion.article>
  )
}

/** Rubber-stamp mark that thuds onto the page once the document lands. */
function Watermark() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
      <motion.span
        initial={{ opacity: 0, scale: 1.6, rotate: -24 }}
        animate={{ opacity: 1, scale: 1, rotate: -24 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 18 }}
        className="rounded-3xl border-[6px] border-success/10 px-10 py-2 font-mono text-7xl font-black tracking-[0.2em] text-success/[0.07] select-none sm:text-9xl"
      >
        RECEIVED
      </motion.span>
    </div>
  )
}

function LinesTable({ lines }: { lines: GRNLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border-strong text-left text-[11px] tracking-wider text-fg-subtle uppercase">
            <th className="py-2.5 pr-3 font-medium">SKU</th>
            <th className="px-3 py-2.5 font-medium">Item</th>
            <th className="px-3 py-2.5 text-right font-medium">Expected</th>
            <th className="px-3 py-2.5 text-right font-medium">Received</th>
            <th className="py-2.5 pl-3 text-right font-medium">Variance</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const variance = line.received_qty - line.expected_qty
            return (
              <motion.tr
                key={line.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="border-b border-border last:border-0"
              >
                <td className="num py-3 pr-3 text-xs text-fg-muted">{line.item.sku}</td>
                <td className="px-3 py-3 font-medium">{line.item.name}</td>
                <td className="num px-3 py-3 text-right text-fg-muted">{formatNumber(line.expected_qty)}</td>
                <td className="num px-3 py-3 text-right font-semibold">
                  {formatNumber(line.received_qty)}{' '}
                  <span className="text-xs font-normal text-fg-subtle">{line.item.unit}</span>
                  {line.damaged_qty > 0 && (
                    <span className="block text-[11px] font-normal text-danger">
                      incl. {line.damaged_qty} damaged{line.damage_note ? ` (${line.damage_note})` : ''}
                    </span>
                  )}
                </td>
                <td
                  className={cn(
                    'num py-3 pl-3 text-right font-medium',
                    variance < 0 && 'text-warning',
                    variance > 0 && 'text-agent',
                    variance === 0 && 'text-success',
                  )}
                >
                  {variance === 0 ? '±0' : variance > 0 ? `+${variance}` : `−${Math.abs(variance)}`}
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 font-mono text-[11px] tracking-[0.18em] text-fg-subtle uppercase">{children}</h3>
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] tracking-wider text-fg-subtle uppercase">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{children}</dd>
    </div>
  )
}

function Signature({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="flex h-8 items-end text-sm text-fg-muted italic">{value}</div>
      <div className="mt-1 border-t border-border-strong pt-1.5 text-[11px] tracking-wider text-fg-subtle uppercase">
        {label}
      </div>
    </div>
  )
}
