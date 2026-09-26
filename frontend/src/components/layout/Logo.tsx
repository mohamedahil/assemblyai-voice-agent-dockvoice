import { motion } from 'motion/react'

/** Animated equalizer mark: four bars that idle-bounce like a voice meter. */
export function Logo({ compact = false }: { compact?: boolean }) {
  const bars = [0.45, 1, 0.7, 0.35]
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid size-9 place-items-center rounded-xl border border-border-strong bg-bg-elevated shadow-[0_0_24px_-8px_var(--glow)]">
        <div className="flex h-4 items-center gap-[3px]">
          {bars.map((height, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-gradient-to-b from-accent to-agent"
              animate={{ scaleY: [height, height * 0.45 + 0.2, height] }}
              transition={{ duration: 1.4 + i * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
              style={{ height: '100%', originY: 0.5 }}
            />
          ))}
        </div>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">DockVoice</p>
          <p className="text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
            Warehouse Copilot
          </p>
        </div>
      )}
    </div>
  )
}
