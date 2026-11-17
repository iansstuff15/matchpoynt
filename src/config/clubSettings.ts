import type { Features } from '@matchpoynt/shared'
import { DoorOpen, Info, Link2, Palette, QrCode, ReceiptText, Trash2, type LucideIcon } from 'lucide-react'
import type { ClubSettingsGroup } from '@/types/club'

/** The club settings dialog's groups: their sidebar entries and headings. */
export const clubSettingsMeta: Record<ClubSettingsGroup, { label: string; description: string; icon: LucideIcon; feature?: keyof Features['web'] }> = {
  general: { label: 'General', description: 'The club’s name, its unique @handle and its description.', icon: Info },
  social: { label: 'Social links', description: 'Where to find the club online: its pages on social media and its website.', icon: Link2 },
  joining: { label: 'Joining', description: 'Whether people who ask join at once or wait for you, and the welcome they get.', icon: DoorOpen, feature: 'clubDirectory' },
  appearance: { label: 'Appearance', description: 'The club’s colours in the app and on the sessions it runs: accent, sidebar and page.', icon: Palette },
  fees: { label: 'Fees', description: 'The fee scheme offered when you set up the club’s sessions. Players are invoiced when a session ends.', icon: ReceiptText, feature: 'fees' },
  payments: { label: 'Payment QR codes', description: 'QR codes players pay you with (an e-wallet, a bank). Members who still owe see them when a session ends, and in their session history.', icon: QrCode, feature: 'fees' },
  delete: { label: 'Delete club', description: 'Remove the club for good.', icon: Trash2 },
}
