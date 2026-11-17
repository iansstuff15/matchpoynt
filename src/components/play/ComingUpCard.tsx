import { BellRing, CalendarClock } from 'lucide-react'
import { Link } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { sports } from '@/config/sports'
import { signUpLimits } from '@matchpoynt/shared'
import { useUpcomingSessions } from '@/utils/hooks/useDirectory'
import { formatWhen } from '@/utils/time/formatWhen'

/** The reminder: planned sessions you're signed up for that start in the next day, soonest first. Nothing when there are none. */
export default function ComingUpCard() {
  const upcoming = useUpcomingSessions()
  if (upcoming.data?.length === 0) return null
  return (
    <Card aria-labelledby="coming-up-title" className="border-primary/40">
      <CardHeader>
        <CardTitle id="coming-up-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <BellRing className="size-5" aria-hidden />
          Coming up
        </CardTitle>
        <CardDescription>Sessions you're signed up for in the next {signUpLimits.reminderWindowHours} hours.</CardDescription>
      </CardHeader>
      <CardContent>
        {upcoming.isError ? (
          <ErrorBanner error={upcoming.error} action="load your upcoming sessions" onRetry={() => void upcoming.refetch()} />
        ) : !upcoming.data ? (
          <ul className="grid gap-2" aria-busy="true" aria-label="Loading your upcoming sessions">
            <li className="rounded-lg border p-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-1 h-4 w-64" />
            </li>
          </ul>
        ) : (
          <ul className="grid gap-2" aria-label="Your upcoming sessions">
            {upcoming.data.map((s) => (
              <li key={s.planId}>
                <Link to={`/c/${s.clubHandle}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted" aria-label={`${s.title} at ${s.clubName}, ${formatWhen(s.when)}`}>
                  <CalendarClock className="size-5 shrink-0 text-primary" aria-hidden />
                  <span className="grid min-w-0">
                    <span className="truncate font-medium">{s.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {sports[s.sportId].name} · {s.clubName} · <time dateTime={s.when}>{formatWhen(s.when)}</time>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
