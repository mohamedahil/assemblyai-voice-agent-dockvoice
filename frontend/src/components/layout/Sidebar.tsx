import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { NavLink } from 'react-router'
import { isLive, useVoiceStore } from '@/features/voice/store'
import { api, queryKeys } from '@/lib/api'
import { cn } from '@/lib/cn'
import { Logo } from './Logo'
import { NAV_SECTIONS } from './nav'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const live = useVoiceStore((s) => isLive(s.status))
  const { data: openDiscrepancies } = useQuery({
    queryKey: [...queryKeys.discrepancies, 'open'],
    queryFn: () => api.discrepancies('open'),
  })

  const badges: Record<string, number | undefined> = {
    discrepancies: openDiscrepancies?.length,
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-bg-elevated/70 backdrop-blur-xl">
      <div className="px-5 pt-5 pb-6">
        <NavLink to="/" onClick={onNavigate}>
          <Logo />
        </NavLink>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.to}
                    data-nav={item.id}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                        isActive ? 'text-fg' : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute inset-0 rounded-xl border border-accent/20 bg-accent-soft"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          />
                        )}
                        <item.icon className={cn('relative size-4', isActive && 'text-accent')} />
                        <span className="relative flex-1">{item.label}</span>
                        {item.id === 'receiving' && live && (
                          <span className="relative flex items-center gap-1.5 text-[10px] font-semibold text-danger">
                            <span className="relative flex size-2">
                              <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-70" />
                              <span className="relative inline-flex size-2 rounded-full bg-danger" />
                            </span>
                            LIVE
                          </span>
                        )}
                        {!!badges[item.id] && (
                          <span className="relative rounded-full bg-warning-soft px-1.5 py-px font-mono text-[10px] font-semibold text-warning">
                            {badges[item.id]}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-xl border border-border bg-surface-muted p-3">
        <p className="text-[11px] font-medium text-fg-muted">Powered by</p>
        <p className="text-xs font-semibold">AssemblyAI Voice Agent API</p>
        <p className="mt-0.5 text-[10px] text-fg-subtle">Universal-3 Pro Streaming · tool calling</p>
      </div>
    </aside>
  )
}
