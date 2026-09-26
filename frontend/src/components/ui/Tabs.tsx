import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '@/lib/cn'

export interface TabOption<T extends string> {
  value: T
  label: string
  count?: number
  /** Pulsing dot for activity the viewer hasn't seen yet. */
  alert?: boolean
}

/** Segmented filter with a pill that slides to the active option. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: TabOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  // Scope the layoutId so two tab bars never share a pill.
  const id = useId()

  return (
    <div className={cn('max-w-full overflow-x-auto', className)}>
      <div role="tablist" className="inline-flex rounded-xl border border-border bg-surface-muted p-1">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'relative cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                active ? 'text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {active && (
                <motion.span
                  layoutId={`${id}-pill`}
                  className="absolute inset-0 rounded-lg border border-border-strong bg-bg-elevated shadow-panel"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {option.label}
                {option.count !== undefined && (
                  <span className={cn('num text-[10px]', active ? 'text-accent' : 'text-fg-subtle')}>
                    {option.count}
                  </span>
                )}
                {option.alert && !active && (
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-agent opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-agent" />
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
