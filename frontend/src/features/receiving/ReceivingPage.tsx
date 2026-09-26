import { ClipboardList, Mic, PhoneOff } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'
import { voiceAgent } from '../voice/agentClient'
import { StatusPill } from '../voice/components/StatusPill'
import { VoiceOrb } from '../voice/components/VoiceOrb'
import { isLive, useVoiceStore, type VoiceStatus } from '../voice/store'
import { DockQueue } from './DockQueue'
import { OutcomeStage } from './OutcomeStage'
import { PhaseStepper } from './PhaseStepper'
import { ReceivingTable } from './ReceivingTable'
import { ToolTimeline } from './ToolTimeline'
import { TranscriptFeed } from './TranscriptFeed'
import { TRY_SAYING } from './trySaying'

// The orb glides between the hero and the live panel as one shared element.
const ORB_LAYOUT_ID = 'cockpit-orb'

const STATUS_LINE: Record<VoiceStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting to AssemblyAI',
  listening: 'Listening',
  hearing: 'Hearing you',
  thinking: 'Thinking',
  working: 'Updating the ERP',
  speaking: 'Speaking',
  error: 'Session stopped',
}

/**
 * Two states: a hero with one big "Start receiving" button, and a live workspace with the
 * receiving table on the left and the conversation (transcript / agent actions) on the right.
 */
export function ReceivingPage() {
  const live = useVoiceStore((s) => isLive(s.status))
  return <LayoutGroup>{live ? <Workspace /> : <Hero />}</LayoutGroup>
}

// ---- Before the session ------------------------------------------------------------------------

function Hero() {
  const status = useVoiceStore((s) => s.status)
  const error = useVoiceStore((s) => s.error)
  const hasResults = useVoiceStore((s) => s.outcomes.length > 0)

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden px-6 pt-10 pb-8 text-center">
        <div className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-accent/10 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-40 left-1/4 size-80 rounded-full bg-agent/10 blur-[100px]" />

        <div className="relative">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[11px] font-medium tracking-[0.18em] text-accent uppercase"
          >
            Receiving cockpit
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Receive by <span className="text-gradient">voice</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-2 max-w-xl text-sm text-fg-muted"
          >
            Say the PO, call out what arrived, mention anything damaged, and confirm. The copilot drafts
            the receipt, reads it back and posts only after you say yes.
          </motion.p>

          <motion.div layoutId={ORB_LAYOUT_ID} className="mx-auto mt-2 w-fit">
            <VoiceOrb size={260} />
          </motion.div>

          <StartButton />
          {status === 'error' && error && <p className="mt-3 text-xs text-danger">{error}</p>}
          <p className="mt-3 text-xs text-fg-subtle">
            Hands-free · correct yourself · interrupt the agent anytime
          </p>

          <div className="mx-auto mt-7 flex max-w-4xl flex-wrap justify-center gap-2">
            {TRY_SAYING.map((line, i) => (
              <motion.span
                key={line}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs text-fg-muted"
              >
                “{line}”
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {hasResults && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-fg-muted">Last session</h2>
          <OutcomeStage />
        </section>
      )}

      <DockQueue subtitle="Open purchase orders due today" />
    </div>
  )
}

function StartButton() {
  const connecting = useVoiceStore((s) => s.status === 'connecting')
  return (
    <div className="relative mx-auto mt-4 w-fit">
      {/* Soft pulse rings draw the eye to the one thing to do on this page. */}
      {[0, 1].map((ring) => (
        <motion.span
          key={ring}
          className="pointer-events-none absolute inset-0 rounded-2xl border border-accent/50"
          animate={{ scale: [1, 1.25], opacity: [0.6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: ring * 1.1, ease: 'easeOut' }}
        />
      ))}
      <Button
        variant="primary"
        disabled={connecting}
        onClick={() => void voiceAgent.start()}
        className="relative h-14 gap-3 rounded-2xl px-9 text-base shadow-[0_0_40px_-6px_var(--glow)]"
      >
        <Mic className="size-5" /> Start receiving
      </Button>
    </div>
  )
}

// ---- During the session ------------------------------------------------------------------------

function Workspace() {
  const draft = useVoiceStore((s) => s.draft)
  const phase = useVoiceStore((s) => s.phase)
  const activeDraft = draft && draft.state !== 'cancelled' ? draft : null

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="space-y-5 xl:col-span-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
              Receiving live
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {activeDraft ? (
                <>
                  <span className="num">{activeDraft.po_number}</span>
                  <span className="text-fg-subtle"> · {activeDraft.vendor_name}</span>
                </>
              ) : (
                'Which PO is at the dock?'
              )}
            </h1>
          </div>
          <PhaseStepper phase={activeDraft ? phase : 'identify'} />
        </motion.div>

        <AnimatePresence mode="wait">
          {activeDraft ? (
            <Panel
              key={activeDraft.draft_id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className={cn(
                activeDraft.state === 'awaiting_confirmation' &&
                  'shadow-[0_0_0_1px_var(--accent),0_0_40px_-10px_var(--glow)]',
              )}
            >
              <PanelHeader
                icon={<ClipboardList />}
                title="Receiving draft"
                subtitle={
                  activeDraft.pending_items.length
                    ? `Waiting for: ${activeDraft.pending_items.join(', ')}`
                    : 'All lines counted'
                }
                action={<DraftStateBadge state={activeDraft.state} />}
              />
              <ReceivingTable draft={activeDraft} />
            </Panel>
          ) : (
            <motion.div key="queue" exit={{ opacity: 0, y: -10 }}>
              <DockQueue subtitle="Say the PO number to begin, e.g. “Receiving PO 4582”" />
            </motion.div>
          )}
        </AnimatePresence>

        <OutcomeStage />
      </div>

      <LivePanel />
    </div>
  )
}

type ConversationTab = 'transcript' | 'actions'

/** The conversation side: live orb, status, and tabs for transcript and agent actions. */
function LivePanel() {
  const status = useVoiceStore((s) => s.status)
  const lines = useVoiceStore((s) => s.transcript.length)
  const actions = useVoiceStore((s) => s.tools.length)
  const [tab, setTab] = useState<ConversationTab>('transcript')
  // Actions count the viewer has already seen; anything newer lights up the tab.
  const [seenActions, setSeenActions] = useState(0)

  const changeTab = (next: ConversationTab) => {
    setSeenActions(actions)
    setTab(next)
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="panel flex flex-col overflow-hidden xl:sticky xl:top-6 xl:col-span-4 xl:max-h-[calc(100vh-7.5rem)] xl:self-start"
    >
      <div className="relative flex items-center gap-4 border-b border-border px-5 py-4">
        <motion.div layoutId={ORB_LAYOUT_ID} className="-m-3 shrink-0">
          <VoiceOrb size={112} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusPill />
            <SessionTimer />
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2 truncate text-lg font-semibold tracking-tight"
            >
              {STATUS_LINE[status]}
              {(status === 'thinking' || status === 'working' || status === 'connecting') && <Dots />}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="border-b border-border px-5 py-3">
        <Tabs
          value={tab}
          onChange={changeTab}
          options={[
            { value: 'transcript', label: 'Transcript', count: lines },
            {
              value: 'actions',
              label: 'Agent actions',
              count: actions,
              alert: tab !== 'actions' && actions > seenActions,
            },
          ]}
        />
      </div>

      <div className="min-h-[380px] flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === 'actions' ? 16 : -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === 'actions' ? -16 : 16 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'transcript' ? <TranscriptFeed /> : <ToolTimeline />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="border-t border-border p-4">
        <Button variant="danger" className="w-full" onClick={() => voiceAgent.stop()}>
          <PhoneOff className="size-4" /> End session
        </Button>
      </div>
    </motion.aside>
  )
}

function Dots() {
  return (
    <span className="ml-1 inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        >
          .
        </motion.span>
      ))}
    </span>
  )
}

function SessionTimer() {
  const startedAt = useVoiceStore((s) => s.startedAt)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const seconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
  return (
    <Badge tone="danger" dot>
      <span className="num">
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </span>
    </Badge>
  )
}

function DraftStateBadge({ state }: { state: string }) {
  if (state === 'awaiting_confirmation') {
    return (
      <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
        <Badge tone="accent" dot>
          Awaiting your confirmation
        </Badge>
      </motion.span>
    )
  }
  return <StatusBadge status={state} />
}
