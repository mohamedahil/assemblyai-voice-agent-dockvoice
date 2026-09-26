import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Inbox, Mail, MailOpen, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { api, queryKeys } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDateTime, timeAgo } from '@/lib/format'
import type { VendorMessage } from '@/lib/types'
import { formatDay } from '../purchasing/dates'

export function OutboxPage() {
  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.vendorMessages,
    queryFn: api.vendorMessages,
  })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = messages?.find((m) => m.id === selectedId) ?? messages?.[0]

  return (
    <>
      <PageHeader
        eyebrow="Vendor outbox"
        title="Vendor notifications"
        description="Shortage and over-receipt notices the agent drafted and sent to suppliers on your behalf."
      />

      {error ? (
        <ErrorState message={error.message} />
      ) : isLoading ? (
        <div className="grid gap-5 lg:grid-cols-12">
          <Skeleton className="h-[520px] rounded-2xl lg:col-span-5" />
          <Skeleton className="h-[520px] rounded-2xl lg:col-span-7" />
        </div>
      ) : messages?.length && selected ? (
        <div className="grid gap-5 lg:grid-cols-12">
          <Panel
            className="self-start lg:col-span-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PanelHeader icon={<Send />} title="Sent" subtitle={`${messages.length} messages`} />
            <ul className="max-h-[640px] overflow-y-auto p-2">
              {messages.map((message, index) => (
                <MessageListItem
                  key={message.id}
                  message={message}
                  index={index}
                  active={message.id === selected.id}
                  onSelect={() => setSelectedId(message.id)}
                />
              ))}
            </ul>
          </Panel>

          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <MessageReader key={selected.id} message={selected} />
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <Panel initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <EmptyState
            icon={<Inbox />}
            title="Outbox is empty"
            description="Ask the agent to notify a vendor after posting a receipt."
          />
        </Panel>
      )}
    </>
  )
}

function MessageListItem({
  message,
  index,
  active,
  onSelect,
}: {
  message: VendorMessage
  index: number
  active: boolean
  onSelect: () => void
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'relative w-full cursor-pointer rounded-xl px-3.5 py-3 text-left transition-colors',
          active ? 'text-fg' : 'text-fg-muted hover:bg-surface-muted',
        )}
      >
        {active && (
          <motion.span
            layoutId="outbox-selection"
            className="absolute inset-0 rounded-xl border border-accent/30 bg-accent-soft"
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          />
        )}
        <span className="relative block">
          <span className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold text-fg">{message.vendor.name}</span>
            <span className="shrink-0 text-[11px] text-fg-subtle">{timeAgo(message.created_at)}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs">{message.subject}</span>
          <span className="mt-2 flex items-center gap-2">
            <StatusBadge status={message.status} />
            <span className="num text-[11px] text-fg-subtle">{message.po_number}</span>
          </span>
        </span>
      </button>
    </motion.li>
  )
}

function MessageReader({ message }: { message: VendorMessage }) {
  return (
    <Panel
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col overflow-hidden"
    >
      <div className="space-y-3 border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold">
            <MailOpen className="size-4 shrink-0 text-accent" />
            <span className="min-w-0">{message.subject}</span>
          </h2>
          <StatusBadge status={message.status} />
        </div>
        <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-[auto_1fr]">
          <dt className="text-fg-subtle">To</dt>
          <dd className="min-w-0 truncate">
            <span className="font-medium">{message.vendor.contact_name}</span>{' '}
            <span className="text-fg-muted">&lt;{message.to_email}&gt;</span>
          </dd>
          <dt className="text-fg-subtle">Sent</dt>
          <dd>{formatDateTime(message.created_at)}</dd>
          <dt className="text-fg-subtle">Re</dt>
          <dd>
            <Link to={`/purchase-orders/${message.po_number}`} className="num hover:text-accent">
              {message.po_number}
            </Link>
          </dd>
        </dl>
        {message.due_date && (
          <Badge tone="warning" className="text-xs">
            <CalendarClock className="size-3.5" /> Replacement due {formatDay(message.due_date)}
          </Badge>
        )}
        {message.error && <ErrorState message={message.error} />}
      </div>

      <div className="bg-surface-muted p-3 sm:p-4">
        {message.body_html ? (
          // Vendor email HTML is untrusted-looking markup; an empty sandbox blocks scripts, forms and navigation.
          <iframe
            title={message.subject}
            srcDoc={message.body_html}
            sandbox=""
            className="h-[560px] w-full rounded-xl border border-border bg-white"
          />
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated p-5">
            <Mail className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
            <pre className="font-sans text-sm whitespace-pre-wrap text-fg-muted">{message.body_text}</pre>
          </div>
        )}
      </div>
    </Panel>
  )
}
