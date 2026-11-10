import type { PlayerSport, SportId } from '@matchpoynt/shared'
import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sportList, sports as sportConfig } from '@/config/sports'
import type { Sport } from '@/interfaces/Sport'
import { cn } from '@/utils/cn'

interface SportsStepProps {
  sports: PlayerSport[]
  onChange: (sports: PlayerSport[]) => void
}

function SportRow({ sport, picked, onToggle, onTier }: { sport: Sport; picked?: PlayerSport; onToggle: (on: boolean) => void; onTier: (tierId: string) => void }) {
  const id = useId()
  const Icon = sport.icon
  return (
    <li className={cn('flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors', picked && 'border-primary bg-primary/5')}>
      <Checkbox id={id} checked={Boolean(picked)} onCheckedChange={(v) => onToggle(v === true)} />
      <Label htmlFor={id} className="flex flex-1 cursor-pointer items-center gap-2 font-medium">
        <Icon className="size-4 text-primary" aria-hidden />
        {sport.name}
      </Label>
      {picked && (
        <Select value={picked.tierId} onValueChange={onTier}>
          <SelectTrigger className="w-44" aria-label={`Your ${sport.name.toLowerCase()} skill tier`}>
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
      )}
    </li>
  )
}

/** Pick sports and a tier in each; a player can be a different level in every sport. */
export default function SportsStep({ sports, onChange }: SportsStepProps) {
  const toggle = (sportId: SportId, on: boolean) =>
    onChange(on ? [...sports, { sportId, tierId: sportConfig[sportId].tiers[0]?.id ?? '' }] : sports.filter((s) => s.sportId !== sportId))
  const setTier = (sportId: SportId, tierId: string) => onChange(sports.map((s) => (s.sportId === sportId ? { ...s, tierId } : s)))

  return (
    <ul className="grid gap-2" aria-label="Sports you play">
      {sportList.map((sport) => (
        <SportRow
          key={sport.id}
          sport={sport}
          picked={sports.find((s) => s.sportId === sport.id)}
          onToggle={(on) => toggle(sport.id, on)}
          onTier={(tierId) => setTier(sport.id, tierId)}
        />
      ))}
    </ul>
  )
}
