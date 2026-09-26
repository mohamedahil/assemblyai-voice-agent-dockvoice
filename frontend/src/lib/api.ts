import type {
  Dashboard,
  Discrepancy,
  DiscrepancyStatus,
  GRNDetail,
  GRNSummary,
  Item,
  Movement,
  PODetail,
  POStatus,
  POSummary,
  ToolCallRecord,
  ToolResponse,
  VendorMessage,
  VoiceSession,
} from './types'

// Empty in dev (Vite proxies /api); the Render URL in production.
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, body?.detail ?? response.statusText)
  }
  return response.json() as Promise<T>
}

function query(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined)
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : ''
}

export const api = {
  dashboard: () => request<Dashboard>('/dashboard'),

  purchaseOrders: (status?: POStatus) => request<POSummary[]>(`/purchase-orders${query({ status })}`),
  purchaseOrder: (number: string) => request<PODetail>(`/purchase-orders/${number}`),

  receipts: () => request<GRNSummary[]>('/receipts'),
  receipt: (number: string) => request<GRNDetail>(`/receipts/${number}`),

  discrepancies: (status?: DiscrepancyStatus) =>
    request<Discrepancy[]>(`/discrepancies${query({ status })}`),
  vendorMessages: () => request<VendorMessage[]>('/vendor-messages'),

  items: () => request<Item[]>('/inventory/items'),
  movements: (limit = 50) => request<Movement[]>(`/inventory/movements${query({ limit })}`),

  activity: (sessionId?: string) =>
    request<ToolCallRecord[]>(`/activity${query({ session_id: sessionId })}`),

  startVoiceSession: () => request<VoiceSession>('/voice/session', { method: 'POST' }),
  callTool: (sessionId: string, name: string, args: Record<string, unknown>) =>
    request<ToolResponse>(`/voice/sessions/${sessionId}/tools/${name}`, {
      method: 'POST',
      body: JSON.stringify({ arguments: args }),
    }),

  resetDemo: () => request<{ status: string }>('/demo/reset', { method: 'POST' }),
}

/** React Query keys, grouped so a voice action can invalidate everything it touched. */
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  purchaseOrders: ['purchase-orders'] as const,
  receipts: ['receipts'] as const,
  discrepancies: ['discrepancies'] as const,
  vendorMessages: ['vendor-messages'] as const,
  inventory: ['inventory'] as const,
  activity: ['activity'] as const,
}
