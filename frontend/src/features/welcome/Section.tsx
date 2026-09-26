import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { reveal } from './reveal'

/** One chapter of the landing-page story: eyebrow, headline, optional intro, content. */
export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  id: string
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28', className)}>
      <motion.p {...reveal(0, 12)} className="font-mono text-xs font-medium tracking-[0.2em] text-accent uppercase">
        {eyebrow}
      </motion.p>
      <motion.h2
        {...reveal(1)}
        className="mt-3 max-w-4xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p {...reveal(2)} className="mt-4 max-w-2xl text-base text-fg-muted sm:text-lg">
          {description}
        </motion.p>
      )}
      <div className="mt-12">{children}</div>
    </section>
  )
}
