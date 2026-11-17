import type { PlayerLiveQueued } from '@matchpoynt/shared'
import { Users } from 'lucide-react'
import { useRef } from 'react'
import { useLiveRows } from '@/animations/useLiveRows'
import WaitTime from '@/components/session/queue/WaitTime'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'

interface PlayerQueueCardProps {
  queue: PlayerLiveQueued[]
  checkingIn: number
  now: number
}

/** Everyone waiting, in call order, with how long each has waited; the list scrolls under the header, and players slide to new places as it refreshes. The viewer's row stands out. */
export default function PlayerQueueCard({ queue, checkingIn, now }: PlayerQueueCardProps) {
  // As the queue refreshes, players slide to their new places in the call order.
  const list = useRef<HTMLOListElement>(null)
  useLiveRows(
    list,
    queue.map((p) => p.name),
  )
  return (
    <Card data-play-reveal aria-labelledby="play-queue-title">
      <CardHeader>
        <CardTitle id="play-queue-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <Users className="size-5" aria-hidden />
          Queue
        </CardTitle>
        <CardDescription>
          {queue.length} waiting{checkingIn > 0 ? ` · ${checkingIn} still to check in` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody is waiting right now.</p>
        ) : (
          <ScrollArea className="play-queue-scroll">
            <ol ref={list} className="grid gap-1.5 pr-3" aria-label="Players waiting, in call order">
              {queue.map((p, i) => (
                <li
                  key={p.name}
                  data-flip-id={p.name}
                  data-play-row={i < 12 ? '' : undefined}
                  className={cn('flex items-center gap-3 rounded-lg border px-3 py-2 text-sm', p.isMe && 'play-mine')}
                  aria-current={p.isMe ? 'true' : undefined}
                >
                  <span className="w-6 font-display font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {p.name}
                    {p.isMe && <span className="ml-2 text-xs text-primary">You</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">{p.gamesPlayed} played</span>
                  <WaitTime waitingSince={p.waitingSince} now={now} />
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
