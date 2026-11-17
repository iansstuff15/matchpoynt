import type { ClubView } from '@matchpoynt/shared'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'
import { clubPageHref } from '@/utils/hooks/useSelectedClub'
import { formatWhen } from '@/utils/time/formatWhen'

const shown = 3

/** What's coming up and what was played last: the next planned sessions and the latest ones run. */
export default function ClubSessionsCard({ view }: { view: ClubView }) {
  const label = (s: { title: string | null; sportId: keyof typeof sports }) => s.title ?? `${sports[s.sportId].name} session`
  return (
    <Card aria-labelledby="club-dash-sessions-title">
      <CardHeader>
        <CardTitle id="club-dash-sessions-title" className="flex items-center gap-2 font-display">
          <CalendarDays className="size-5" aria-hidden />
          Sessions
        </CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to={clubPageHref(view.club.id, 'sessions')}>
              All sessions
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <section aria-labelledby="club-dash-planned" className="grid gap-1.5">
          <h4 id="club-dash-planned" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Planned
          </h4>
          {view.planned.length ? (
            <ul className="grid gap-1">
              {view.planned.slice(0, shown).map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span className="truncate font-medium">{p.title}</span>
                  <span className="shrink-0 text-muted-foreground">{p.scheduledFor ? formatWhen(p.scheduledFor) : 'No date yet'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nothing planned.</p>
          )}
        </section>
        <section aria-labelledby="club-dash-recent" className="grid gap-1.5">
          <h4 id="club-dash-recent" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Latest
          </h4>
          {view.sessions.length ? (
            <ul className="grid gap-1">
              {view.sessions.slice(0, shown).map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <Link to={`/app/${s.id}`} className="truncate font-medium hover:underline">
                    {label(s)}
                  </Link>
                  <span className="shrink-0 text-muted-foreground">{s.status === 'active' ? 'Running now' : formatWhen(s.endedAt ?? s.startedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No sessions run yet.</p>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
