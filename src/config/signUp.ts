import type { AccountRole } from '@matchpoynt/shared'
import { ClipboardCheck, IdCard, KeyRound, Trophy, type LucideIcon } from 'lucide-react'
import type { SignUpStep } from '@/interfaces/SignUpStep'

export const signUpSteps: SignUpStep[] = [
  { id: 'account', label: 'Account', description: 'Your email and a password.', icon: KeyRound },
  { id: 'profile', label: 'About you', description: 'Your name, and the name others see on boards.', icon: IdCard },
  { id: 'sports', label: 'Sports', description: 'What you play, and your level in each. Tiers are per sport.', icon: Trophy },
  { id: 'agreements', label: 'Finish', description: 'How you will use Matchpoynt, and the terms.', icon: ClipboardCheck },
]

export const accountRoleOptions: { id: AccountRole; label: string; description: string; icon?: LucideIcon }[] = [
  { id: 'queue_master', label: 'I run sessions', description: 'Set up courts, run the queue and record results as a Queue Master.' },
  { id: 'player', label: 'I play', description: 'Join sessions and follow your results and rankings.' },
  { id: 'both', label: 'Both', description: 'Sometimes you run the night, sometimes you just play.' },
]
