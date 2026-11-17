import type { Features } from '@matchpoynt/shared'
import { ClipboardCheck, Info, Palette, ReceiptText, type LucideIcon } from 'lucide-react'

export type CreateClubStepId = 'details' | 'appearance' | 'fees' | 'review'

/** The create-a-club form's steps. Colours and fees can keep their defaults. */
export const createClubSteps: { id: CreateClubStepId; label: string; description: string; icon: LucideIcon; optional: boolean; feature?: keyof Features['web'] }[] = [
  { id: 'details', label: 'Details', description: 'Name the club, pick its unique @handle, and say what it’s about. The handle is checked before you can go on.', icon: Info, optional: false },
  { id: 'appearance', label: 'Colours', description: 'Pick the club’s colours, or keep Matchpoynt’s.', icon: Palette, optional: true },
  { id: 'fees', label: 'Fees', description: 'The fee offered when you set up the club’s sessions. No fee is the default.', icon: ReceiptText, optional: true, feature: 'fees' },
  { id: 'review', label: 'Review', description: 'Check it over. Photos, members and sessions come next, from the club’s dashboard.', icon: ClipboardCheck, optional: false },
]

/** Which step shows the API's complaint about each field. */
export const createClubFieldSteps: Record<string, CreateClubStepId> = {
  name: 'details',
  handle: 'details',
  description: 'details',
  accent: 'appearance',
  sidebar: 'appearance',
  page: 'appearance',
  fee: 'fees',
}
