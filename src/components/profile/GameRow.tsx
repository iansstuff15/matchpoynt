import type { ProfileGameView } from '@matchpoynt/shared'
import { Badge } from '@/components/ui/badge'
import { sports } from '@/config/sports'
import { formatWhen } from '@/utils/time/formatWhen'

const resultLabel = { win: 'Won', loss: 'Lost' } as const

/** One match they played: with whom, against whom, where, the score and the result. */
export default function GameRow({ game: g }: { game: ProfileGameView }) {
  return (
    <li className="grid gap-1 rounded-lg border p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate font-medium">
          {g.partners.length ? `With ${g.partners.join(' & ')} ` : ''}vs {g.opponents.join(' & ')}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {sports[g.sportId].name} · {g.sessionLabel} · {g.clubName} · {formatWhen(g.finishedAt)}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className="text-muted-foreground tabular-nums">{g.games.map((s) => `${s.a}–${s.b}`).join(', ') || 'No score'}</span>
        {g.result && <Badge variant={g.result === 'win' ? 'default' : 'outline'}>{resultLabel[g.result]}</Badge>}
      </span>
    </li>
  )
}
