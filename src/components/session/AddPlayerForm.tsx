import { UserPlus } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { Checkbox } from '@/components/ui/checkbox'
import MemberNameField from '@/components/session/MemberNameField'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Sport } from '@/interfaces/Sport'

interface AddPlayerFormProps {
  sport: Sport
  onAdd: (name: string, tierId: string, checkedIn: boolean) => void
  /** Whether "Already checked in" starts ticked: yes on the board (they're at the venue), no in setup (they check in on arrival). */
  checkedInByDefault?: boolean
  /** Compact, for a row shared with other controls: the name field takes the free width, the tier picker is narrower. */
  compact?: boolean
  submitLabel?: string
  /** The running session, so suggestions leave out its players and put its club first. */
  sessionId?: string
  /** Names already in a setup draft. */
  exclude?: string[]
}

/** Adds a player by name and tier, checked in or not; typing suggests club members, whose tier comes along. */
export default function AddPlayerForm({ sport, onAdd, submitLabel = 'Add to queue', sessionId, exclude, checkedInByDefault = true, compact = false }: AddPlayerFormProps) {
  const nameId = useId()
  const tierId = useId()
  const [name, setName] = useState('')
  const [tier, setTier] = useState(sport.tiers[0]?.id ?? '')
  const [checkedIn, setCheckedIn] = useState(checkedInByDefault)
  const checkedInId = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onAdd(name, tier, checkedIn)
    setName('')
    // Back to the default each time, so one player's tick isn't carried over to the next by accident.
    setCheckedIn(checkedInByDefault)
  }

  return (
    <form onSubmit={submit} className={cn('flex flex-wrap items-end gap-3', compact && 'add-player-compact')} aria-label="Add a player">
      <div className="add-player-name grid gap-1.5">
        <Label htmlFor={nameId}>Player name</Label>
        <MemberNameField
          id={nameId}
          value={name}
          sportId={sport.id}
          sessionId={sessionId}
          exclude={exclude}
          className={compact ? 'w-full' : 'w-60'}
          onChange={setName}
          onPick={(s) => {
            setName(s.name)
            if (s.tierId) setTier(s.tierId)
          }}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={tierId}>Skill tier</Label>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger id={tierId} className={compact ? 'w-32' : 'w-44'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sport.tiers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex h-9 items-center gap-2">
        <Checkbox id={checkedInId} checked={checkedIn} onCheckedChange={(v) => setCheckedIn(v === true)} />
        <Label htmlFor={checkedInId} className="font-normal">
          Already checked in
        </Label>
      </div>
      <Button type="submit" disabled={!name.trim()}>
        <UserPlus />
        {submitLabel}
      </Button>
    </form>
  )
}
