import { Compass, Timer } from 'lucide-react'
import { Link } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import ComingUpCard from '@/components/play/ComingUpCard'
import PlaySessionCard from '@/components/play/PlaySessionCard'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { playSkeleton } from '@/config/play'
import { usePlayerSessions } from '@/utils/hooks/usePlayerLive'

/** `/play`: sessions you're signed up for that start soon (the reminder), then your clubs' sessions running now that you're on the roster of, each opening its live view. */
export default function PlayPage() {
  const sessions = usePlayerSessions()
  return (
    <section aria-labelledby="play-list-title" className="app-page">
      <PageMeta title="Playing now" description="Your clubs' sessions running now: open one to see your wait, the courts, who's up next and the queue." />
      <div>
        <h1 id="play-list-title" className="font-display text-2xl font-bold">
          Playing now
        </h1>
        <p className="text-sm text-muted-foreground">Your clubs' sessions running now that you're on the roster of. Open one to follow your wait and the courts.</p>
      </div>
      <ComingUpCard />
      {sessions.isError ? (
        <ErrorBanner error={sessions.error} action="load your sessions" onRetry={() => void sessions.refetch()} />
      ) : sessions.isPending ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading your sessions">
          {Array.from({ length: playSkeleton.sessions }, (_, i) => (
            <li key={i}>
              <Card>
                <CardHeader className="gap-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      ) : sessions.data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Timer />
            </EmptyMedia>
            <EmptyTitle>No sessions running for you</EmptyTitle>
            <EmptyDescription>When one of your clubs runs a session with you on its roster, it shows here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link to="/choose-club">
                <Compass />
                Find clubs
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Your running sessions">
          {sessions.data.map((s) => (
            <li key={s.sessionId} className="relative">
              <PlaySessionCard session={s} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
