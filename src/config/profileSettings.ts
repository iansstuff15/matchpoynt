import { KeyRound, Link2, Trophy, UserRound, type LucideIcon } from 'lucide-react'

export type ProfileSettingsGroup = 'details' | 'sports' | 'social' | 'account'

/** The profile settings dialog's groups, in its sidebar's order. */
export const profileSettingsGroups: { id: ProfileSettingsGroup; label: string; description: string; icon: LucideIcon }[] = [
  { id: 'details', label: 'Details', description: 'Your names, unique @username, contact details and how you use Matchpoynt.', icon: UserRound },
  { id: 'sports', label: 'Sports', description: 'What you play, and your level in each. Tiers are per sport.', icon: Trophy },
  { id: 'social', label: 'Social links', description: 'Where people can find you online.', icon: Link2 },
  { id: 'account', label: 'Account', description: 'Your sign-in email and password.', icon: KeyRound },
]
