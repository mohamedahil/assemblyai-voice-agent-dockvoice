import { formatDate } from '@/lib/format'
import type { POSummary } from '@/lib/types'

// Backend dates are plain `YYYY-MM-DD`; parse them as local midnight so they don't shift a day.
const localDay = (date: string) => new Date(`${date}T00:00:00`)

export const formatDay = (date: string) => formatDate(localDay(date).toISOString())

export function isOverdue(po: POSummary): boolean {
  if (po.status === 'received' || po.status === 'closed') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return localDay(po.expected_date) < today
}
