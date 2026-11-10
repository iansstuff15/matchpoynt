import { Trophy } from 'lucide-react'
import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface CourtTournamentSwitchProps {
  courtLabel: string
  on: boolean
  /** A court with a match on can't switch until it finishes. */
  disabled: boolean
  onChange: (on: boolean) => void
}

/** "Tournament" switch on a court card. Switching the first court on opens the tournament setup. */
export default function CourtTournamentSwitch({ courtLabel, on, disabled, onChange }: CourtTournamentSwitchProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-2" title={disabled ? 'Finish the match on this court first' : undefined}>
      <Switch id={id} checked={on} disabled={disabled} onCheckedChange={onChange} aria-label={`Tournament play on ${courtLabel}`} />
      <Label htmlFor={id} className="gap-1 text-xs font-medium text-muted-foreground">
        <Trophy className="size-3.5" aria-hidden />
        Tournament
      </Label>
    </div>
  )
}
