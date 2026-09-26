import { useQuery } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { ClipboardList, Mic, Moon, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { api, queryKeys } from '@/lib/api'
import { resetDemo } from '@/lib/demo'
import { toggleTheme } from '@/lib/theme'
import { NAV_ITEMS } from './nav'

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: queryKeys.purchaseOrders,
    queryFn: () => api.purchaseOrders(),
    enabled: open,
  })

  const run = (action: () => void) => {
    onClose()
    action()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-bg/60 px-4 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated shadow-2xl"
          >
            <Command label="Command palette" loop>
              <Command.Input
                autoFocus
                placeholder="Jump to a page, a PO, or run an action…"
                className="h-14 w-full border-b border-border bg-transparent px-5 text-sm outline-none placeholder:text-fg-subtle"
                onKeyDown={(event) => event.key === 'Escape' && onClose()}
              />
              <Command.List className="max-h-[50vh] overflow-y-auto p-2">
                <Command.Empty className="px-4 py-8 text-center text-sm text-fg-subtle">
                  No results.
                </Command.Empty>

                <Group heading="Actions">
                  <Item icon={<Mic />} onSelect={() => run(() => navigate('/receiving'))}>
                    Start voice receiving
                  </Item>
                  <Item icon={<Moon />} onSelect={() => run(toggleTheme)}>
                    Toggle theme
                  </Item>
                  <Item icon={<RotateCcw />} onSelect={() => run(() => void resetDemo())}>
                    Reset demo data
                  </Item>
                </Group>

                <Group heading="Pages">
                  {NAV_ITEMS.map((item) => (
                    <Item key={item.id} icon={<item.icon />} onSelect={() => run(() => navigate(item.to))}>
                      {item.label}
                    </Item>
                  ))}
                </Group>

                <Group heading="Purchase orders">
                  {purchaseOrders.map((po) => (
                    <Item
                      key={po.id}
                      icon={<ClipboardList />}
                      value={`${po.number} ${po.vendor.name}`}
                      onSelect={() => run(() => navigate(`/purchase-orders/${po.number}`))}
                    >
                      <span className="font-mono">{po.number}</span>
                      <span className="text-fg-subtle">· {po.vendor.name}</span>
                    </Item>
                  ))}
                </Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-fg-subtle [&_[cmdk-group-heading]]:uppercase"
    >
      {children}
    </Command.Group>
  )
}

function Item({
  icon,
  children,
  onSelect,
  value,
}: {
  icon: ReactNode
  children: ReactNode
  onSelect: () => void
  value?: string
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg-muted data-[selected=true]:bg-accent-soft data-[selected=true]:text-fg [&>svg]:size-4"
    >
      {icon}
      {children}
    </Command.Item>
  )
}
