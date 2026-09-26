import type { MotionProps } from 'motion/react'

const EASE = [0.22, 1, 0.36, 1] as const

/** Fade-and-rise when the element scrolls into view; `index` staggers siblings. */
export function reveal(index = 0, distance = 24): MotionProps {
  return {
    initial: { opacity: 0, y: distance },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { delay: index * 0.08, duration: 0.6, ease: EASE },
  }
}
