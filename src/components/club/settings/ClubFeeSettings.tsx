import type { ClubSummary, FeeScheme } from '@matchpoynt/shared'
import { Check, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import FeeSchemeFields from '@/components/fees/FeeSchemeFields'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import type { useClubActions } from '@/utils/hooks/useClubs'

interface ClubFeeSettingsProps {
  club: ClubSummary
  actions: ReturnType<typeof useClubActions>
}

const same = (a: FeeScheme | null, b: FeeScheme | null) => JSON.stringify(a) === JSON.stringify(b)

/**
 * The club's fee scheme: saved here, then offered when setting up its
 * sessions (planned or from the board). Sessions keep the fee they started
 * with, so changing it never changes past invoices.
 */
export default function ClubFeeSettings({ club, actions }: ClubFeeSettingsProps) {
  const [draft, setDraft] = useState(club.fee)
  const [seen, setSeen] = useState(club.fee)
  // Start over from the saved fee whenever it changes.
  if (!same(seen, club.fee)) {
    setSeen(club.fee)
    setDraft(club.fee)
  }
  const { saveFee } = actions

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">{club.feeSummary ? `Saved: ${club.feeSummary}.` : 'No fee saved yet.'}</p>
        <FeeSchemeFields fee={draft} onChange={setDraft} />
        {Boolean(saveFee.error) && (
          <ErrorBanner error={saveFee.error} action="save the club's fee" onRetry={saveFee.isPending ? undefined : () => saveFee.mutate(draft)} />
        )}
        <div className="flex justify-end">
          <Button type="button" disabled={saveFee.isPending || same(draft, club.fee)} onClick={() => saveFee.mutate(draft)}>
            {saveFee.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
            Save fee
          </Button>
        </div>
    </div>
  )
}
