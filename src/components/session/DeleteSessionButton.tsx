import { Trash2 } from 'lucide-react'
import ConfirmButton from '@/components/common/ConfirmButton'

interface DeleteSessionButtonProps {
  /** What the session is called, e.g. "Badminton session" or its title. */
  label: string
  pending: boolean
  /** Icon only (on a card). */
  iconOnly?: boolean
  onConfirm: () => void
}

/**
 * "Delete session": removes a session for good, running or finished. Unlike
 * "Finish session" nothing is kept, so it always asks first.
 */
export default function DeleteSessionButton({ label, pending, iconOnly, onConfirm }: DeleteSessionButtonProps) {
  return (
    <ConfirmButton
      iconOnly={iconOnly}
      variant={iconOnly ? 'ghost' : 'outline'}
      label={iconOnly ? `Delete ${label}` : 'Delete session'}
      icon={Trash2}
      title={`Delete ${label}?`}
      description="Its board, players, every result and its leaderboard are removed for good, and any published links stop working. To keep the results, finish the session instead. This can't be undone."
      confirmLabel="Delete session"
      cancelLabel="Keep session"
      pending={pending}
      onConfirm={onConfirm}
    />
  )
}
