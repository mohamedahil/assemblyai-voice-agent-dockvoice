import { FileSearch, History, Lock, ScrollText, ShieldAlert, SquarePen, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { reveal } from './reveal'
import { Section } from './Section'

const SAFEGUARDS: { icon: LucideIcon; tone: string; title: string; text: string }[] = [
  {
    icon: SquarePen,
    tone: 'bg-accent-soft text-accent',
    title: 'Draft first, never direct',
    text: 'The agent edits a draft. The ERP is only written on posting, in one transaction.',
  },
  {
    icon: Lock,
    tone: 'bg-agent-soft text-agent',
    title: 'Progressive tool reveal',
    text: 'The “post” tool doesn’t exist for the model until the read-back has happened.',
  },
  {
    icon: History,
    tone: 'bg-warning-soft text-warning',
    title: 'Stale confirmations expire',
    text: 'Change anything after “yes” and the agent must read back again before posting.',
  },
  {
    icon: ShieldAlert,
    tone: 'bg-danger-soft text-danger',
    title: 'Business-rule guards',
    text: '80 of 20 ordered? Flagged. Damage above what arrived? Rejected. Wrong vendor? Caught.',
  },
  {
    icon: FileSearch,
    tone: 'bg-accent-soft text-accent',
    title: 'Safe fuzzy matching',
    text: '“Power mods” finds Power Module 24V. When two items are equally likely, it asks.',
  },
  {
    icon: ScrollText,
    tone: 'bg-success-soft text-success',
    title: 'Full audit trail',
    text: 'Every tool call is logged with arguments and results, so each change traces back to speech.',
  },
]

export function TrustSection() {
  return (
    <Section
      id="trust"
      eyebrow="Trust by design"
      title={
        <>
          An AI that <span className="text-gradient">can’t post</span> what you didn’t confirm.
        </>
      }
      description="Voice makes data entry fast. Guardrails make it safe enough for inventory and money."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SAFEGUARDS.map((item, i) => (
          <motion.div key={item.title} {...reveal(i)} whileHover={{ y: -4 }} className="panel p-6">
            <span className={cn('grid size-11 place-items-center rounded-xl', item.tone)}>
              <item.icon className="size-5" />
            </span>
            <h3 className="mt-5 font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.text}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}
