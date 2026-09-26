import { Menu, Moon, RotateCcw, Search, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui/Button'
import { StatusPill } from '@/features/voice/components/StatusPill'
import { resetDemo } from '@/lib/demo'
import { toggleTheme, useTheme } from '@/lib/theme'
import { NAV_ITEMS } from './nav'

export function Topbar({ onOpenPalette, onOpenMenu }: { onOpenPalette: () => void; onOpenMenu: () => void }) {
  const theme = useTheme()
  const { pathname } = useLocation()
  const section = NAV_ITEMS.find((item) => pathname.startsWith(item.to))

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/70 px-4 backdrop-blur-xl sm:px-6">
      <Button variant="ghost" size="sm" className="lg:hidden" onClick={onOpenMenu} aria-label="Open menu">
        <Menu className="size-4" />
      </Button>

      <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
        <span className="text-fg-subtle">DockVoice</span>
        <span className="text-fg-subtle">/</span>
        <span className="truncate font-medium">{section?.label ?? 'Overview'}</span>
      </div>

      <button
        onClick={onOpenPalette}
        className="ml-auto flex h-9 w-full max-w-72 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 text-sm text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded-md border border-border px-1.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>

      <StatusPill />
      <Clock />

      <Button variant="ghost" size="sm" onClick={() => void resetDemo()} title="Reset demo data">
        <RotateCcw className="size-4" />
        <span className="hidden xl:inline">Reset demo</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </header>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span className="hidden font-mono text-xs text-fg-subtle tabular-nums md:inline">
      {now.toLocaleTimeString('en-US', { hour12: false })}
    </span>
  )
}
