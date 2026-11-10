import type { MatchResult } from '@matchpoynt/shared'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils/cn'

interface RecentMatchesProps {
  matches: MatchResult[]
}

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** Latest finished matches with their game scores. */
export default function RecentMatches({ matches }: RecentMatchesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Recent results</CardTitle>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Finished matches show up here.</p>
        ) : (
          <ol className="divide-y">
            {matches.map((m) => (
              <li key={m.id} className="grid gap-1 py-3 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{m.courtLabel}</span>
                  <time dateTime={m.finishedAt}>{time(m.finishedAt)}</time>
                </div>
                {m.sides.map((side, i) => {
                  const won = m.winner === (i === 0 ? 'a' : 'b')
                  return (
                    <div key={i} className={cn('flex min-w-0 items-center justify-between gap-3', won && 'font-semibold')}>
                      <span className="min-w-0 truncate" title={side.map((p) => p.name).join(' & ')}>
                        {side.map((p) => p.name).join(' & ')}
                      </span>
                      <span className="shrink-0 tabular-nums">{m.games.map((g) => (i === 0 ? g.a : g.b)).join(' · ')}</span>
                    </div>
                  )
                })}
                {m.winner === null && (
                  <Badge variant="outline" className="w-fit">
                    No score
                  </Badge>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
