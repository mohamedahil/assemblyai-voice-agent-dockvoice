import { Check, Mic, ScanLine, X } from 'lucide-react'
import { motion } from 'motion/react'
import { reveal } from './reveal'
import { Section } from './Section'

const TODAY = [
  'Put the box down, pick up the scanner',
  'Look at the screen, type every quantity',
  'Fill a separate damage form (usually skipped)',
  'Write shortages on the packing slip',
  'Someone emails the vendor… eventually',
]

const WITH_DOCKVOICE = [
  'Keep working and say what arrived',
  'Corrections handled: “eighty… no, eighteen”',
  '“Three are cracked” moves them to quarantine',
  'Hear the read-back, say “yes”, and it’s posted',
  'Vendor gets shortages and a replacement request',
]

export function BeforeAfterSection() {
  return (
    <Section
      id="solution"
      eyebrow="The solution"
      title={
        <>
          Stop typing at the dock. <span className="text-gradient">Just talk.</span>
        </>
      }
      description="DockVoice is a voice copilot on top of the warehouse ERP. Workers speak naturally; it turns what they say into confirmed goods receipts, inventory and vendor follow-ups."
    >
      <motion.blockquote
        {...reveal(0)}
        className="panel border-accent/30 bg-gradient-to-r from-accent/10 to-agent/10 p-7 sm:p-9"
      >
        <p className="text-sm text-fg-muted">What a receiver actually says:</p>
        <p className="mt-2 font-mono text-lg leading-relaxed text-accent sm:text-2xl">
          “We got eighty controllers, sorry, eight zero, and forty-five sensors. Three of them are cracked.”
        </p>
        <p className="mt-3 text-sm text-fg-muted">
          Numbers, a self-correction and damage in one breath. Scanners can’t take it; classic voice systems
          with fixed commands can’t either. DockVoice can.
        </p>
      </motion.blockquote>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <motion.div {...reveal(1)} className="panel p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-danger-soft text-danger">
              <ScanLine className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Today</p>
              <p className="text-xs text-fg-subtle">Scanner, screen, paper, memory</p>
            </div>
          </div>
          <ul className="mt-6 space-y-3">
            {TODAY.map((line, i) => (
              <motion.li key={line} {...reveal(i, 8)} className="flex gap-3 text-sm text-fg-muted">
                <X className="mt-0.5 size-4 shrink-0 text-danger" />
                {line}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          {...reveal(2)}
          className="panel relative overflow-hidden border-success/30 p-7 shadow-[0_0_60px_-30px_var(--success)]"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
              <Mic className="size-5" />
            </span>
            <div>
              <p className="font-semibold">With DockVoice</p>
              <p className="text-xs text-fg-subtle">One conversation, hands-free</p>
            </div>
          </div>
          <ul className="mt-6 space-y-3">
            {WITH_DOCKVOICE.map((line, i) => (
              <motion.li key={line} {...reveal(i, 8)} className="flex gap-3 text-sm text-fg">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {line}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </Section>
  )
}
