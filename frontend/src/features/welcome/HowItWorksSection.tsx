import { ClipboardList, ListChecks, Mail, PackageCheck, PackageX, PencilLine, type LucideIcon } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { reveal } from './reveal'
import { Section } from './Section'

const STEPS: { icon: LucideIcon; title: string; say: string; does: string }[] = [
  {
    icon: ClipboardList,
    title: 'Identify the PO',
    say: 'Receiving PO 4582 from ABC Electronics.',
    does: 'Opens the purchase order and checks the vendor matches the paperwork.',
  },
  {
    icon: PencilLine,
    title: 'Count, with corrections',
    say: 'Eighty controllers, sorry, eight zero. Power modules are eighteen, not eighty.',
    does: 'Records every item in one go. The latest number replaces the old one; 80-of-20 gets double-checked.',
  },
  {
    icon: PackageX,
    title: 'Inspect for damage',
    say: 'Wait, three of the sensors are cracked.',
    does: 'Splits damaged units from good stock, with the worker’s own description.',
  },
  {
    icon: ListChecks,
    title: 'Read back & confirm',
    say: 'Yes, post it.',
    does: 'Reads totals, shortages and damage aloud. Posting is impossible until the worker says yes.',
  },
  {
    icon: Mail,
    title: 'Post & notify',
    say: 'Tell them we need the missing controllers by Friday.',
    does: 'Posts the GRN, updates stock and quarantine, logs discrepancies and emails the vendor.',
  },
]

const RESULTS = [
  { label: 'Goods receipt', value: 'GRN-1027', tone: 'text-fg' },
  { label: 'Into stock', value: '+140', tone: 'text-success' },
  { label: 'Quarantined', value: '3', tone: 'text-danger' },
  { label: 'Vendor email', value: 'Sent', tone: 'text-agent' },
]

export function HowItWorksSection() {
  const listRef = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 70%', 'end 60%'] })
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <Section
      id="how"
      eyebrow="How it works"
      title={
        <>
          From truck to stock in <span className="text-gradient">one conversation.</span>
        </>
      }
      description="Five spoken steps replace a scanner, a screen, a damage form and an email."
    >
      <ol ref={listRef} className="relative space-y-5">
        {/* Progress rail that fills as the story is scrolled. */}
        <span className="absolute top-6 bottom-6 left-[27px] w-px bg-border" aria-hidden />
        <motion.span
          style={{ scaleY: fill }}
          className="absolute top-6 bottom-6 left-[27px] w-px origin-top bg-gradient-to-b from-accent to-agent"
          aria-hidden
        />
        {STEPS.map((step, i) => (
          <motion.li key={step.title} {...reveal(0, 20)} className="relative flex gap-5">
            <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border border-border-strong bg-bg-elevated text-accent shadow-[0_0_24px_-8px_var(--glow)]">
              <step.icon className="size-6" />
            </span>
            <div className="panel grid flex-1 gap-4 p-5 md:grid-cols-[1fr_1.1fr] md:items-center">
              <div>
                <p className="font-mono text-[11px] tracking-[0.16em] text-fg-subtle uppercase">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-fg-muted">{step.does}</p>
              </div>
              <p className="rounded-2xl rounded-tr-sm border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-fg">
                “{step.say}”
              </p>
            </div>
          </motion.li>
        ))}
      </ol>

      <motion.div {...reveal(0)} className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {RESULTS.map((result, i) => (
          <motion.div key={result.label} {...reveal(i)} className="panel p-5 text-center">
            <p className="font-mono text-[11px] tracking-[0.16em] text-fg-subtle uppercase">{result.label}</p>
            <p className={`mt-2 font-mono text-3xl font-semibold ${result.tone}`}>{result.value}</p>
          </motion.div>
        ))}
      </motion.div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-fg-subtle">
        <PackageCheck className="size-3.5" /> The PO-4582 demo, posted in a single database transaction
      </p>
    </Section>
  )
}
