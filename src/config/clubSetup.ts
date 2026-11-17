import type { ClubSetupItemId } from '@matchpoynt/shared'
import { AtSign, CalendarPlus, FileText, Image, ImagePlus, Link2, Palette, ReceiptText, UserPlus, type LucideIcon } from 'lucide-react'
import type { ClubPage, ClubSettingsGroup } from '@/types/club'

/** What finishing a setup item does: open a settings group, a photo's editor, or one of the club's pages. */
export type ClubSetupAction = { settings: ClubSettingsGroup } | { photo: 'avatar' | 'cover' } | { page: ClubPage }

/** The dashboard checklist's wording for each setup item. Which are done comes from the API. */
export const clubSetupItems: Record<ClubSetupItemId, { label: string; description: string; button: string; icon: LucideIcon; action: ClubSetupAction }> = {
  handle: { label: 'Pick the club’s @handle', description: 'Its unique name on Matchpoynt, like @riverside.', button: 'Pick a handle', icon: AtSign, action: { settings: 'general' } },
  description: { label: 'Describe the club', description: 'Where and when you play, who it’s for.', button: 'Add a description', icon: FileText, action: { settings: 'general' } },
  avatar: { label: 'Add a profile photo', description: 'Your logo or a square photo, shown on every card.', button: 'Add photo', icon: Image, action: { photo: 'avatar' } },
  cover: { label: 'Add a cover photo', description: 'A wide photo for the top of the club page.', button: 'Add cover', icon: ImagePlus, action: { photo: 'cover' } },
  colors: { label: 'Pick the club’s colours', description: 'Or keep Matchpoynt’s: they’re the default.', button: 'Pick colours', icon: Palette, action: { settings: 'appearance' } },
  fee: { label: 'Set a fee scheme', description: 'Offered when you set up the club’s sessions. No fee is the default.', button: 'Set fees', icon: ReceiptText, action: { settings: 'fees' } },
  social: { label: 'Add social links', description: 'Where people can find the club online.', button: 'Add links', icon: Link2, action: { settings: 'social' } },
  members: { label: 'Add members', description: 'The people who play with the club, with their skill tiers.', button: 'Add members', icon: UserPlus, action: { page: 'members' } },
  session: { label: 'Plan a session', description: 'Prepare it now, start it when play begins.', button: 'Plan a session', icon: CalendarPlus, action: { page: 'sessions' } },
}
