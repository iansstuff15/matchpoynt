import { Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MemberSetup } from '@matchpoynt/shared'
import type { Sport } from '@/interfaces/Sport'

interface MemberRowProps {
  member: MemberSetup
  sport: Sport
  locked: boolean
  /** Already checked in at the session: the box stays ticked (a check-in can't be undone). */
  arrived: boolean
  onChange: (member: MemberSetup) => void
  onRemove: () => void
}

export default function MemberRow({ member, sport, locked, arrived, onChange, onRemove }: MemberRowProps) {
  return (
    <li className="flex items-center gap-2">
      <Input
        value={member.name}
        onChange={(e) => onChange({ ...member, name: e.target.value })}
        aria-label="Player name"
        className="flex-1"
      />
      <Select value={member.tierId} onValueChange={(tierId) => onChange({ ...member, tierId })}>
        <SelectTrigger className="w-40" aria-label={`Skill tier for ${member.name || 'player'}`}>
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
      <Checkbox
        checked={arrived || member.checkedIn === true}
        disabled={arrived}
        onCheckedChange={(v) => onChange({ ...member, checkedIn: v === true })}
        aria-label={`${member.name || 'Player'} is already checked in`}
        title={arrived ? 'Checked in' : 'Already checked in'}
      />
      {locked ? (
        <span className="inline-flex w-9 justify-center text-muted-foreground" title="On court: remove after the match">
          <Lock className="size-4" aria-label="On court" />
        </span>
      ) : (
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${member.name || 'player'}`}>
          <Trash2 />
        </Button>
      )}
    </li>
  )
}
