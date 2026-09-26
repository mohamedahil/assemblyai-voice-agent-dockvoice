import { ArrowUpRight, Mail, PackageCheck, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { humanize } from '@/lib/format'
import { useVoiceStore, type EmailOutcome, type GrnOutcome } from '../voice/store'

export function OutcomeStage() {
  const outcomes = useVoiceStore((s) => s.outcomes)
  if (!outcomes.length) return null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AnimatePresence>
        {outcomes.map((outcome) =>
          outcome.kind === 'grn' ? (
            <GrnCard key={outcome.id} outcome={outcome} />
          ) : (
            <EmailCard key={outcome.id} outcome={outcome} />
          ),
        )}
      </AnimatePresence>
    </div>
  )
}

function GrnCard({ outcome }: { outcome: GrnOutcome }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="panel relative overflow-hidden p-5"
    >
      <Burst />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-fg-muted">Goods receipt posted</p>
          <p className="num mt-1 text-2xl font-semibold">{outcome.grnNumber}</p>
          <p className="text-xs text-fg-subtle">
            {outcome.poNumber} · {outcome.unitsReceived} units into stock
            {outcome.unitsQuarantined > 0 && (
              <span className="text-danger"> · {outcome.unitsQuarantined} quarantined</span>
            )}
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
          <PackageCheck className="size-5" />
        </span>
      </div>

      {/* The rubber stamp drops in after the card lands. */}
      <motion.div
        initial={{ opacity: 0, scale: 2.4, rotate: -24 }}
        animate={{ opacity: 1, scale: 1, rotate: -12 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 520, damping: 18 }}
        className="pointer-events-none absolute top-5 right-16 rounded-lg border-[3px] border-success px-3 py-1 font-mono text-sm font-bold tracking-[0.2em] text-success"
      >
        POSTED
      </motion.div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {outcome.discrepancies.length === 0 ? (
          <Badge tone="success">Received in full</Badge>
        ) : (
          outcome.discrepancies.map((d, i) => (
            <motion.span
              key={`${d.item}-${d.type}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <Badge tone={d.type === 'damaged' ? 'danger' : d.type === 'shortage' ? 'warning' : 'agent'}>
                {humanize(d.type)} · <span className="num">{d.quantity}</span> {d.item}
                {d.note && <span className="opacity-75">({d.note})</span>}
              </Badge>
            </motion.span>
          ))
        )}
      </div>
      <Link
        to={`/receipts/${outcome.grnNumber}`}
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
      >
        Open GRN document <ArrowUpRight className="size-3" />
      </Link>
    </motion.div>
  )
}

function EmailCard({ outcome }: { outcome: EmailOutcome }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [flight, setFlight] = useState<{ from: DOMRect; to: DOMRect } | null>(null)

  useEffect(() => {
    // After the card settles, an envelope flies from it to the Outbox link in the sidebar.
    const id = window.setTimeout(() => {
      const target = document.querySelector('[data-nav="outbox"]')
      // Skip when the sidebar is collapsed into the mobile drawer.
      if (cardRef.current && target?.getClientRects().length) {
        setFlight({ from: cardRef.current.getBoundingClientRect(), to: target.getBoundingClientRect() })
      }
    }, 1400)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="panel relative overflow-hidden p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-fg-muted">Vendor notified</p>
          <p className="mt-1 text-lg font-semibold">{outcome.vendor}</p>
          <p className="text-xs text-fg-subtle">
            {outcome.dueDate ? `Resolve by ${new Date(outcome.dueDate + 'T00:00').toDateString()}` : 'No due date'}
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-agent-soft text-agent">
          <Mail className="size-5" />
        </span>
      </div>
      <TypedLine text="Shortage notice with the discrepancy table, sent from the dock." />
      <div className="mt-4 flex items-center justify-between">
        <Badge tone={outcome.status === 'sent' ? 'success' : 'accent'} dot>
          {outcome.status === 'sent' ? 'Delivered via Resend' : 'Recorded in outbox'}
        </Badge>
        <Link to="/outbox" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          View outbox <ArrowUpRight className="size-3" />
        </Link>
      </div>
      {flight && createPortal(<Envelope from={flight.from} to={flight.to} />, document.body)}
    </motion.div>
  )
}

function Envelope({ from, to }: { from: DOMRect; to: DOMRect }) {
  const [done, setDone] = useState(false)
  if (done) return null
  const startX = from.left + from.width / 2 - 20
  const startY = from.top + from.height / 2 - 20
  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-[60] grid size-10 place-items-center rounded-xl bg-agent text-bg shadow-[0_0_30px_var(--agent)]"
      initial={{ x: startX, y: startY, scale: 1, opacity: 1 }}
      animate={{
        x: [startX, (startX + to.left) / 2, to.left + 8],
        y: [startY, Math.min(startY, to.top) - 120, to.top],
        scale: [1, 1.2, 0.4],
        opacity: [1, 1, 0],
      }}
      transition={{ duration: 1.1, ease: 'easeInOut' }}
      onAnimationComplete={() => setDone(true)}
    >
      <Send className="size-4" />
    </motion.div>
  )
}

function TypedLine({ text }: { text: string }) {
  return (
    <p className="mt-3 text-xs text-fg-muted">
      {text.split('').map((char, i) => (
        <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.012 }}>
          {char}
        </motion.span>
      ))}
    </p>
  )
}

/** A one-shot particle burst behind the GRN card. */
function Burst() {
  const particles = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2
    return { x: Math.cos(angle) * 140, y: Math.sin(angle) * 90, color: i % 2 ? 'bg-success' : 'bg-accent' }
  })
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute size-1.5 rounded-full ${p.color}`}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ delay: 0.4, duration: 0.9, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
