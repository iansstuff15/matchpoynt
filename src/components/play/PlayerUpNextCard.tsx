import type { PlayerLiveUpNext } from '@matchpoynt/shared'
import { Swords } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils/cn'

/** The matches the queue makes next, in order (automatic queueing). The viewer's match stands out. */
export default function PlayerUpNextCard({ matches }: { matches: PlayerLiveUpNext[] }) {
  return (
    <Card data-play-reveal aria-labelledby="play-up-next-title">
      <CardHeader>
        <CardTitle id="play-up-next-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <Swords className="size-5" aria-hidden />
          Up next
        </CardTitle>
        <CardDescription>The next matches, in the order courts get them.</CardDescription>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough players waiting to make a match yet.</p>
        ) : (
          <ol className="grid gap-2" aria-label="Next matches">
            {matches.map((m, i) => (
              <li key={i} data-play-row className={cn('flex items-baseline gap-3 rounded-lg border p-3 text-sm', m.mine && 'play-mine')} aria-current={m.mine ? 'true' : undefined}>
                <span className="font-display font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="min-w-0">
                  {m.sides[0].join(' & ')} <span className="text-muted-foreground">vs</span> {m.sides[1].join(' & ')}
                  {m.mine && <span className="ml-2 font-medium text-primary">Your match</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
