import {
  Activity,
  AudioLines,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Mail,
  PackageCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  id: string
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ id: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Operations',
    items: [
      { id: 'receiving', to: '/receiving', label: 'Receiving Cockpit', icon: AudioLines },
      { id: 'purchase-orders', to: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
      { id: 'receipts', to: '/receipts', label: 'Goods Receipts', icon: PackageCheck },
      { id: 'inventory', to: '/inventory', label: 'Inventory', icon: Boxes },
    ],
  },
  {
    title: 'Exceptions',
    items: [
      { id: 'discrepancies', to: '/discrepancies', label: 'Discrepancies', icon: TriangleAlert },
      { id: 'outbox', to: '/outbox', label: 'Vendor Outbox', icon: Mail },
    ],
  },
  {
    title: 'Audit',
    items: [{ id: 'activity', to: '/activity', label: 'Agent Activity', icon: Activity }],
  },
]

export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)
