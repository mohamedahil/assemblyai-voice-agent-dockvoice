import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Panel({ className, children, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={cn('panel', className)} {...props}>
      {children}
    </motion.div>
  )
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="text-fg-subtle [&>svg]:size-4">{icon}</span>}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          {subtitle && <p className="truncate text-xs text-fg-subtle">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
