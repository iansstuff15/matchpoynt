import type { JoinClubResponse } from '@matchpoynt/shared'
import { ArrowRight, Clock, DoorOpen, ExternalLink, LoaderCircle, PartyPopper } from 'lucide-react'
import { Link } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useJoining, usePlayerClub } from '@/utils/hooks/useDirectory'

/**
 * The join card's action once signed in with a complete profile: join (at
 * once, or ask the owner), then the club's welcome; or where the person
 * already stands.
 */
export default function JoinAction({ handle }: { handle: string }) {
  const page = usePlayerClub(handle)
  const { joinClub } = useJoining()
  const result: JoinClubResponse['status'] | undefined = joinClub.data?.status
  const clubLink = (
    <Button asChild size="lg" variant={result === 'joined' ? 'default' : 'outline'} className="w-full">
      <Link to={`/c/${handle}`}>
        <ArrowRight />
        Open the club
      </Link>
    </Button>
  )

  if (page.isError) return <ErrorBanner error={page.error} action="load the club" onRetry={() => void page.refetch()} />
  if (!page.data) return <Skeleton className="h-11 w-full" />
  const { club, welcome } = page.data

  if (club.membership === 'member' || club.membership === 'owner') {
    return (
      <div className="grid gap-4">
        {welcome ? (
          <div role="status" className="grid gap-3 rounded-lg bg-primary/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <PartyPopper className="size-4" aria-hidden />
              {result === 'joined' ? `You joined ${club.name}` : club.membership === 'owner' ? 'This is your club' : `You're a member of ${club.name}`}
            </p>
            {welcome.message && <p className="whitespace-pre-line">{welcome.message}</p>}
            {welcome.links.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label={`Links from ${club.name}`}>
                {welcome.links.map((l) => (
                  <li key={l.url}>
                    <Button asChild variant="outline" size="sm">
                      <a href={l.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink />
                        {l.label}
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
        {clubLink}
      </div>
    )
  }
  if (club.membership === 'requested') {
    return (
      <div className="grid gap-4">
        <p role="status" className="flex items-start gap-2 rounded-lg bg-muted p-4 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Request sent. {club.name} reviews requests to join; you'll be a member once they approve.
        </p>
        {clubLink}
      </div>
    )
  }
  const busy = joinClub.isPending
  return (
    <div className="grid gap-3">
      {Boolean(joinClub.error) && <ErrorBanner error={joinClub.error} action={`join ${club.name}`} onRetry={() => joinClub.mutate({ handle, name: club.name })} />}
      <Button size="lg" className="w-full" disabled={busy} onClick={() => joinClub.mutate({ handle, name: club.name })}>
        {busy ? <LoaderCircle className="animate-spin" /> : <DoorOpen />}
        {club.membership === 'invited' ? 'Accept invite' : club.approval === 'auto' ? `Join ${club.name}` : `Ask to join ${club.name}`}
      </Button>
      {club.approval === 'manual' && club.membership !== 'invited' && <p className="text-center text-xs text-muted-foreground">The club reviews each request.</p>}
    </div>
  )
}
