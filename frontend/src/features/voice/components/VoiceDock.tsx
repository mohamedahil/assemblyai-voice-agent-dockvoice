import { Mic } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router'
import { isLive, useVoiceStore } from '../store'
import { VoiceOrb } from './VoiceOrb'

/** Floating voice control shown on every page except the cockpit itself. */
export function VoiceDock() {
  const navigate = useNavigate()
  const status = useVoiceStore((s) => s.status)
  const lastLine = useVoiceStore((s) => s.transcript.at(-1))
  const live = isLive(status)

  return (
    <motion.button
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      whileHover={{ y: -3 }}
      onClick={() => navigate('/receiving')}
      data-print-hide
      className="panel fixed right-5 bottom-5 z-40 flex max-w-sm cursor-pointer items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 text-left"
    >
      <div className="relative grid size-12 place-items-center">
        {live ? (
          <VoiceOrb size={56} className="absolute" />
        ) : (
          <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-accent to-agent text-bg shadow-[0_0_30px_-6px_var(--glow)]">
            <Mic className="size-5" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold">{live ? 'Receiving live' : 'Receive by voice'}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={lastLine?.id ?? 'hint'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="truncate text-[11px] text-fg-muted"
          >
            {live && lastLine ? lastLine.text : 'Open the cockpit and start talking'}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.button>
  )
}
