import type { ClubSummary } from '@matchpoynt/shared'
import { Trash2 } from 'lucide-react'
import ConfirmButton from '@/components/common/ConfirmButton'
import type { useClubActions } from '@/utils/hooks/useClubs'

/** Deleting the club: confirmed first. Sessions it already ran keep their results. */
export default function ClubDeleteSettings({ club, actions }: { club: ClubSummary; actions: ReturnType<typeof useClubActions> }) {
  const { deleteClub } = actions
  return (
    <div className="grid gap-4 rounded-lg border border-destructive/40 p-4">
      <p className="text-sm text-muted-foreground">
        Removes the club, its members, planned sessions, photos, badges, invoices, expenses and billers. Sessions it already ran keep their results and leaderboards.
      </p>
      <div>
        <ConfirmButton
          label="Delete this club"
          icon={Trash2}
          title={`Delete ${club.name}?`}
          description="Its members, planned sessions and photos are removed for good. Past sessions keep their results."
          confirmLabel="Delete club"
          cancelLabel="Keep club"
          pending={deleteClub.isPending}
          onConfirm={() => deleteClub.mutate()}
        />
      </div>
    </div>
  )
}
