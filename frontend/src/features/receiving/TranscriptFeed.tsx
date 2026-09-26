import { Bot, HardHat, MessageSquareText } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { EmptyState } from '@/components/ui/States'
import { cn } from '@/lib/cn'
import { useVoiceStore } from '../voice/store'

// Numbers and a few receiving words get highlighted so the worker's counts stand out.
const HIGHLIGHT = /(\b\d[\d,]*\b|\b(?:PO|GRN)[\s-]?\d+\b)/gi

export function TranscriptFeed() {
  const transcript = useVoiceStore((s) => s.transcript)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [transcript])

  if (!transcript.length) {
    return (
      <EmptyState
        icon={<MessageSquareText />}
        title="The conversation appears here"
        description="Every word is transcribed live by Universal-3 Pro Streaming."
      />
    )
  }

  return (
    <div className="space-y-3 p-4">
      <AnimatePresence initial={false}>
        {transcript.map((entry) => {
          const isUser = entry.role === 'user'
          return (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full [&>svg]:size-3.5',
                  isUser ? 'bg-accent-soft text-accent' : 'bg-agent-soft text-agent',
                )}
              >
                {isUser ? <HardHat /> : <Bot />}
              </span>
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                  isUser
                    ? 'rounded-tr-sm border border-accent/20 bg-accent-soft'
                    : 'rounded-tl-sm border border-border bg-surface-muted',
                  !entry.final && 'opacity-75',
                )}
              >
                {highlight(entry.text)}
                {!entry.final && <Caret />}
                {entry.interrupted && (
                  <span className="ml-1.5 text-[10px] font-medium tracking-wide text-warning uppercase">
                    interrupted
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  )
}

function highlight(text: string): ReactNode[] {
  return text.split(HIGHLIGHT).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="num rounded bg-transparent font-semibold text-accent">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

function Caret() {
  return (
    <motion.span
      className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-current"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
  )
}
