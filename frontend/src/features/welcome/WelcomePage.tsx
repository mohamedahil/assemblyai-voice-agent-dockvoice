import { ArrowDown, ArrowRight, Ear, LayoutDashboard, Mic } from 'lucide-react'
import { motion, useScroll, useTransform, type Variants } from 'motion/react'
import { Link } from 'react-router'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { VoiceOrb } from '../voice/components/VoiceOrb'
import { BeforeAfterSection } from './BeforeAfterSection'
import { FinalCta } from './FinalCta'
import { HowItWorksSection } from './HowItWorksSection'
import { PoweredBySection } from './PoweredBySection'
import { ProblemSection } from './ProblemSection'
import { ScriptedDemo } from './ScriptedDemo'
import { TrustSection } from './TrustSection'

const HEADLINE = ['Receive', 'shipments', 'at', 'the']
const HIGHLIGHT = ['speed', 'of', 'speech.']

const NAV = [
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'how', label: 'How it works' },
  { id: 'trust', label: 'Trust' },
  { id: 'assemblyai', label: 'AssemblyAI' },
]

const word: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(10px)' },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: 0.15 + i * 0.07, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

export function WelcomePage() {
  return (
    <div className="relative min-h-full overflow-x-clip">
      <Aurora />
      <ScrollProgress />
      <Header />
      <Hero />
      <ProblemSection />
      <BeforeAfterSection />
      <HowItWorksSection />
      <TrustSection />
      <PoweredBySection />
      <FinalCta />
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="cursor-pointer">
          <Logo />
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <Link to="/dashboard">
          <Button variant="secondary" size="sm">
            Open app <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <main className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pt-10 pb-10 sm:px-8 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2 lg:pt-6">
      <section>
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-fg-muted backdrop-blur"
        >
          <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          Built on the AssemblyAI Voice Agent API
        </motion.span>

        <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-semibold tracking-tight sm:text-6xl">
          {HEADLINE.map((w, i) => (
            <motion.span
              key={w + i}
              custom={i}
              variants={word}
              initial="hidden"
              animate="show"
              className="mr-[0.25em] inline-block"
            >
              {w}
            </motion.span>
          ))}
          <br className="hidden sm:block" />
          {HIGHLIGHT.map((w, i) => (
            <motion.span
              key={w}
              custom={HEADLINE.length + i}
              variants={word}
              initial="hidden"
              animate="show"
              className="text-gradient mr-[0.25em] inline-block"
            >
              {w}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 max-w-xl text-base text-fg-muted sm:text-lg"
        >
          Warehouse receiving still runs on scanners, clipboards and memory, so counts are wrong, damage goes
          unreported and vendors are never chased. DockVoice lets the worker just say what arrived: it checks
          the PO, catches shortages and damage, posts the goods receipt and emails the vendor.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <Link to="/receiving">
            <Button variant="primary" size="lg">
              <Mic className="size-4" /> Start receiving
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="secondary" size="lg">
              <LayoutDashboard className="size-4" /> Explore the ERP
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 flex items-center gap-2 text-xs text-fg-subtle"
        >
          <Ear className="size-3.5" /> Universal-3 Pro Streaming · turn detection · tool calling · barge-in
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          onClick={() => scrollTo('problem')}
          className="mt-10 hidden cursor-pointer items-center gap-2 text-sm text-fg-muted hover:text-fg lg:flex"
        >
          <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
            <ArrowDown className="size-4" />
          </motion.span>
          Why the dock needs this
        </motion.button>
      </section>

      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto flex w-full max-w-lg flex-col items-center"
      >
        <VoiceOrb size={300} />
        <ScriptedDemo />
      </motion.section>
    </main>
  )
}

/** Thin gradient bar across the top showing how far through the story the reader is. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-40 h-0.5 origin-left bg-gradient-to-r from-accent to-agent"
    />
  )
}

function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <motion.div
        className="absolute top-[-20%] left-[-10%] size-[42rem] rounded-full bg-accent/20 blur-[140px]"
        animate={{ x: [0, 120, 0], y: [0, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-10%] bottom-[-20%] size-[40rem] rounded-full bg-agent/20 blur-[140px]"
        animate={{ x: [0, -100, 0], y: [0, -80, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
