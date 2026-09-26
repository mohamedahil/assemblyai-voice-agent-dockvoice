import NumberFlow from '@number-flow/react'
import { ChevronRight, Hand, Mail, PackageX, TriangleAlert, type LucideIcon } from 'lucide-react'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { cn } from '@/lib/cn'
import { reveal } from './reveal'
import { Section } from './Section'

const PAINS: { icon: LucideIcon; tone: string; title: string; text: string }[] = [
  {
    icon: Hand,
    tone: 'bg-warning-soft text-warning',
    title: 'Hands are full',
    text: 'Boxes, pallet jacks and a scanner or clipboard. Counts get typed in later, from memory.',
  },
  {
    icon: TriangleAlert,
    tone: 'bg-danger-soft text-danger',
    title: 'Miscounts spread',
    text: 'One wrong number at the dock quietly corrupts stock levels for weeks.',
  },
  {
    icon: PackageX,
    tone: 'bg-agent-soft text-agent',
    title: 'Damage goes unrecorded',
    text: 'The damage form takes too long, so it’s skipped, and the claim window with the vendor closes.',
  },
  {
    icon: Mail,
    tone: 'bg-accent-soft text-accent',
    title: 'Vendors never hear',
    text: 'Shortages sit in a spreadsheet. The invoice gets paid in full for goods that never arrived.',
  },
]

// How a single receiving mistake travels through the business.
const CASCADE = ['Wrong count at the dock', 'Phantom stock in the ERP', 'Failed pick', 'Late order', 'Unhappy customer']

export function ProblemSection() {
  return (
    <Section
      id="problem"
      eyebrow="The business problem"
      title={
        <>
          The receiving dock is where inventory truth <span className="text-gradient">begins, or breaks.</span>
        </>
      }
      description="Every item a warehouse sells first passes through receiving. It is also the busiest, messiest moment in the building: the worst place to ask someone to type."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PAINS.map((pain, i) => (
          <motion.div key={pain.title} {...reveal(i)} whileHover={{ y: -4 }} className="panel p-6">
            <span className={cn('grid size-11 place-items-center rounded-xl', pain.tone)}>
              <pain.icon className="size-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold">{pain.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{pain.text}</p>
          </motion.div>
        ))}
      </div>

      <Cascade />

      <motion.div
        {...reveal(1)}
        className="panel mt-6 flex flex-col gap-4 overflow-hidden p-7 sm:flex-row sm:items-center sm:gap-10"
      >
        <BigNumber />
        <div>
          <p className="text-lg text-fg">
            lost every year to <b>inventory distortion</b>, out-of-stocks and overstocks, across global retail.
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            Inaccurate stock records start at the dock. Source: IHL Group.
          </p>
        </div>
      </motion.div>
    </Section>
  )
}

/** The error chain lights up link by link as it scrolls into view. */
function Cascade() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <div ref={ref} className="panel mt-6 p-6">
      <p className="font-mono text-[11px] tracking-[0.16em] text-fg-subtle uppercase">
        How one receiving mistake travels
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CASCADE.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <motion.span
              initial={{ opacity: 0.25, scale: 0.96 }}
              animate={inView ? { opacity: 1, scale: 1 } : undefined}
              transition={{ delay: 0.25 + i * 0.35, duration: 0.4 }}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm',
                i === 0 ? 'border-warning/40 bg-warning-soft text-warning' : 'border-danger/30 bg-danger-soft text-danger',
              )}
            >
              {step}
            </motion.span>
            {i < CASCADE.length - 1 && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : undefined}
                transition={{ delay: 0.4 + i * 0.35 }}
              >
                <ChevronRight className="size-4 text-fg-subtle" />
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BigNumber() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <div ref={ref} className="shrink-0 text-6xl font-semibold tracking-tight text-accent drop-shadow-[0_0_24px_var(--glow)]">
      <NumberFlow
        value={inView ? 1.73 : 0}
        format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
        prefix="$"
        suffix="T"
      />
    </div>
  )
}
