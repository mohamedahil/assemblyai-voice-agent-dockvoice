import { toast } from 'sonner'
import { initialVoiceState, isLive, useVoiceStore } from '@/features/voice/store'
import { api } from './api'
import { queryClient } from './queryClient'

/** Reseed the ERP so every demo starts from the same clean dock. */
export async function resetDemo(): Promise<void> {
  if (isLive(useVoiceStore.getState().status)) {
    toast.warning('End the voice session before resetting the demo.')
    return
  }
  await toast
    .promise(api.resetDemo(), {
      loading: 'Resetting demo data…',
      success: 'Demo data reset: PO-4582 is waiting at the dock',
      error: 'Reset failed',
    })
    .unwrap()
  useVoiceStore.setState(initialVoiceState)
  await queryClient.invalidateQueries()
}
