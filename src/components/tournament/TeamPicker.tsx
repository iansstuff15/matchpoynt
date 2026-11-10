import type { PlayerView } from '@matchpoynt/shared'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TeamPickerProps {
  players: PlayerView[]
  perSide: number
  /** Team number (from 0) per player id; missing means no team yet. */
  teamOf: Record<string, number>
  onChange: (teamOf: Record<string, number>) => void
}

const none = 'none'

/** Hand-picked teams: each player gets a team number. The API checks every team is full. */
export default function TeamPicker({ players, perSide, teamOf, onChange }: TeamPickerProps) {
  const count = Math.max(1, Math.ceil(players.length / perSide))
  const size = (team: number) => Object.values(teamOf).filter((t) => t === team).length

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">
        {count} teams of {perSide}. Put each player in a team.
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {players.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
            <span className="min-w-0 truncate text-sm font-medium" title={p.name}>
              {p.name}
            </span>
            <Select
              value={teamOf[p.id] === undefined ? none : String(teamOf[p.id])}
              onValueChange={(v) => {
                const next = { ...teamOf }
                if (v === none) delete next[p.id]
                else next[p.id] = Number(v)
                onChange(next)
              }}
            >
              <SelectTrigger size="sm" className="w-32" aria-label={`Team for ${p.name}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={none}>No team</SelectItem>
                {Array.from({ length: count }, (_, t) => (
                  <SelectItem key={t} value={String(t)} disabled={teamOf[p.id] !== t && size(t) >= perSide}>
                    Team {t + 1} ({size(t)}/{perSide})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
    </div>
  )
}
