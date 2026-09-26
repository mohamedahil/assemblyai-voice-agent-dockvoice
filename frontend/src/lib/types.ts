// Mirrors backend/app/schemas.py. Keep the two in sync.

export type POStatus = 'open' | 'partially_received' | 'received' | 'closed'
export type DraftState = 'draft' | 'awaiting_confirmation' | 'posted' | 'cancelled'
export type DiscrepancyType = 'shortage' | 'over_receipt' | 'damaged'
export type DiscrepancyStatus = 'open' | 'vendor_notified' | 'resolved'
export type MessageStatus = 'sent' | 'simulated' | 'failed'
export type LineStatus = 'pending' | 'match' | 'short' | 'over'
export type Phase = 'identify' | 'counting' | 'confirming' | 'posted'

export interface Vendor {
  id: number
  code: string
  name: string
  email: string
  contact_name: string
  city: string
}

export interface Item {
  id: number
  sku: string
  name: string
  category: string
  unit: string
  unit_cost: number
  on_hand: number
  quarantined: number
  reorder_point: number
  bin_location: string
}

export interface POLine {
  id: number
  line_no: number
  item: Item
  ordered_qty: number
  received_qty: number
  outstanding_qty: number
}

export interface POSummary {
  id: number
  number: string
  vendor: Vendor
  status: POStatus
  order_date: string
  expected_date: string
  total_value: number
  line_count: number
  received_pct: number
}

export interface PODetail extends POSummary {
  lines: POLine[]
  receipts: GRNSummary[]
}

export interface DraftLine {
  po_line_id: number
  line_no: number
  sku: string
  name: string
  unit: string
  expected_qty: number
  received_qty: number | null
  damaged_qty: number
  damage_note: string | null
  variance: number | null
  status: LineStatus
}

export interface DraftView {
  draft_id: number
  session_id: string
  po_number: string
  vendor_name: string
  state: DraftState
  version: number
  lines: DraftLine[]
  pending_items: string[]
  grn_number: string | null
  updated_at: string
}

export interface GRNSummary {
  id: number
  number: string
  po_number: string
  vendor_name: string
  source: string
  received_at: string
  total_units: number
  discrepancy_count: number
}

export interface GRNLine {
  id: number
  item: Item
  expected_qty: number
  received_qty: number
  damaged_qty: number
  damage_note: string | null
}

export interface Discrepancy {
  id: number
  type: DiscrepancyType
  quantity: number
  value: number
  note: string | null
  status: DiscrepancyStatus
  created_at: string
  item: Item
  po_number: string
  grn_number: string
  vendor_name: string
}

export interface GRNDetail extends GRNSummary {
  lines: GRNLine[]
  discrepancies: Discrepancy[]
}

export interface Movement {
  id: number
  item: Item
  type: 'receipt' | 'issue' | 'quarantine'
  quantity: number
  on_hand_after: number
  reference: string
  created_at: string
}

export interface VendorMessage {
  id: number
  vendor: Vendor
  po_number: string
  to_email: string
  subject: string
  body_text: string
  body_html: string
  due_date: string | null
  status: MessageStatus
  error: string | null
  created_at: string
}

export interface ToolCallRecord {
  id: number
  session_id: string
  name: string
  arguments: Record<string, unknown>
  result: Record<string, unknown>
  ok: boolean
  duration_ms: number
  created_at: string
}

export interface Dashboard {
  receipts_today: number
  units_today: number
  open_pos: number
  open_discrepancies: number
  open_shortage_value: number
  fill_rate: number
  inventory_value: number
  low_stock_items: number
  daily: { day: string; receipts: number; units: number }[]
  vendors: { vendor_name: string; receipts: number; fill_rate: number; shortage_value: number }[]
  recent_receipts: GRNSummary[]
}

export type ToolDefinition = Record<string, unknown> & { name: string }

export interface VoiceSession {
  session_id: string
  token: string
  ws_url: string
  max_session_seconds: number
  session_config: Record<string, unknown>
}

export interface ToolResponse {
  ok: boolean
  result: Record<string, unknown>
  phase: Phase
  tools: ToolDefinition[]
  draft: DraftView | null
}
