import { RotateCcw } from 'lucide-react'
import ConfirmButton from '@/components/common/ConfirmButton'

interface StartOverButtonProps {
  pending: boolean
  onConfirm: () => void
}

/** "Start over" on the board's header: clears every result and starts the session again with the same setup, after a confirm. */
export default function StartOverButton({ pending, onConfirm }: StartOverButtonProps) {
  return (
    <ConfirmButton
      variant="outline"
      label="Start over"
      icon={RotateCcw}
      title="Start this session over?"
      description="Every result and match on court is cleared, and the leaderboard empties. Courts, settings and players stay, check-ins included, and everyone goes back to the queue in the order they arrived. This can't be undone."
      confirmLabel="Start over"
      pending={pending}
      onConfirm={onConfirm}
    />
  )
}
