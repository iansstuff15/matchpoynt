import type { PlayerView } from '@matchpoynt/shared'
import { LoaderCircle, Medal, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface TournamentCompetitorsProps {
  /** In the tournament now (held out of open play). */
  competitors: PlayerView[]
  /** Checked-in players waiting in open play, who could join. */
  waiting: PlayerView[]
  /** From the API: why competitors can't change (it has started, hand-picked teams), or `null`. */
  blockedReason: string | null
  pending: boolean
  onUpdate: (playerIds: string[]) => void
}

const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((id) => b.has(id))

/**
 * While a tournament runs: who's competing, as checkboxes in the queue panel.
 * Ticks only shape the selection (in doubles players join in pairs); "Update
 * tournament" sends the list, and the API redraws the bracket or says why not.
 */
export default function TournamentCompetitors({ competitors, waiting, blockedReason, pending, onUpdate }: TournamentCompetitorsProps) {
  const saved = new Set(competitors.map((p) => p.id))
  const [picked, setPicked] = useState(saved)
  const [seen, setSeen] = useState(saved)
  // Start again from the API's list whenever it changes.
  if (!same(seen, saved)) {
    setSeen(saved)
    setPicked(saved)
  }
  const players = [...competitors, ...waiting]
  const locked = blockedReason !== null
  const toggle = (id: string, on: boolean) => setPicked((prev) => (on ? new Set(prev).add(id) : new Set([...prev].filter((p) => p !== id))))

  return (
    <section aria-labelledby="tournament-competitors" className="tournament-competitors">
      <h3 id="tournament-competitors" className="queue-section-title flex items-center gap-1.5">
        <Medal className="size-3.5" aria-hidden />
        Tournament · {saved.size} competing
      </h3>
      <ul className="grid gap-1" aria-label="Tournament competitors">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <Checkbox id={`compete-${p.id}`} checked={picked.has(p.id)} disabled={locked || pending} onCheckedChange={(on) => toggle(p.id, on === true)} />
            <Label htmlFor={`compete-${p.id}`} className="font-normal">
              {p.name}
              <span className="sr-only"> is competing</span>
            </Label>
          </li>
        ))}
      </ul>
      {locked ? (
        <p className="text-xs text-muted-foreground">{blockedReason}</p>
      ) : (
        <Button size="sm" variant="outline" className="w-full" disabled={pending || same(picked, saved)} onClick={() => onUpdate([...picked])}>
          {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
          Update tournament ({picked.size})
        </Button>
      )}
    </section>
  )
}
