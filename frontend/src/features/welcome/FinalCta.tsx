import { LayoutDashboard, Mic } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { VoiceOrb } from '../voice/components/VoiceOrb'
import { reveal } from './reveal'

export function FinalCta() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 sm:px-8">
      <motion.div
        {...reveal(0)}
        className="panel relative flex flex-col items-center overflow-hidden px-6 py-14 text-center"
      >
        <div className="pointer-events-none absolute -top-40 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <VoiceOrb size={180} className="relative" />
        <h2 className="relative mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
          Hands full? <span className="text-gradient">Just say it.</span>
        </h2>
        <p className="relative mt-3 max-w-xl text-fg-muted">
          Try the full flow with PO-4582: miscount it, correct yourself, report damage, and watch the ERP update.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
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
        </div>
      </motion.div>
      <p className="mt-8 text-center text-xs text-fg-subtle">
        Built for the AssemblyAI Voice Agent Hackathon · Sources: IHL Group, Lucas Systems, NetSuite
      </p>
    </section>
  )
}
