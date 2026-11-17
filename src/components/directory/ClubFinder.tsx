import { Compass, Plus, Search } from 'lucide-react'
import { useId, useState } from 'react'
import DirectoryClubCard from '@/components/directory/DirectoryClubCard'
import MyInvitesCard from '@/components/directory/MyInvitesCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { directorySkeletonCards } from '@/config/directory'
import { useDebounced } from '@/utils/hooks/useDebounced'
import { useDirectory, useJoining, useMyInvites } from '@/utils/hooks/useDirectory'

/** Finding clubs: the viewer's invites, then every club on Matchpoynt, newest first, a page at a time, with search. Each card opens the club's page. */
export default function ClubFinder() {
  const [query, setQuery] = useState('')
  const q = useDebounced(query, 300)
  const clubs = useDirectory(q)
  const invites = useMyInvites()
  const joining = useJoining()
  const searchId = useId()
  const list = clubs.data?.pages.flatMap((p) => p.clubs) ?? []

  return (
    <>
      {invites.data && invites.data.length > 0 && <MyInvitesCard invites={invites.data} joining={joining} />}
      {Boolean(joining.joinClub.error) && joining.joinClub.variables && (
        <ErrorBanner
          error={joining.joinClub.error}
          action={`join ${joining.joinClub.variables.name}`}
          onRetry={() => joining.joinClub.variables && joining.joinClub.mutate(joining.joinClub.variables)}
        />
      )}
      <div className="grid max-w-md gap-1.5">
        <Label htmlFor={searchId}>Search clubs</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id={searchId} type="search" className="pl-9" placeholder="Name or @handle" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      {clubs.isError ? (
        <ErrorBanner error={clubs.error} action="load the clubs" onRetry={() => void clubs.refetch()} />
      ) : clubs.isPending ? (
        <ul className="directory-card-grid" aria-busy="true" aria-label="Loading clubs">
          {Array.from({ length: directorySkeletonCards }, (_, i) => (
            <li key={i}>
              {/* Same frame as DirectoryClubCard: a square, its stage, then the panel with name, handle and button. */}
              <Card className="directory-card gap-0 rounded-[2rem] border-0 bg-transparent p-0">
                <div className="directory-card-stage" style={{ background: 'var(--muted)' }}>
                  <div className="directory-card-meta">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-14 shrink-0 rounded-full" />
                      <div className="grid flex-1 gap-1.5">
                        <Skeleton className="h-7 w-40" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-10 w-full rounded-full" />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : list.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Compass />
            </EmptyMedia>
            <EmptyTitle>{q.trim() ? 'No clubs match that' : 'No clubs yet'}</EmptyTitle>
            <EmptyDescription>{q.trim() ? 'Try another name or @handle.' : 'Clubs show here once they pick a handle.'}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ul className="directory-card-grid" aria-label="Clubs">
            {list.map((club) => (
              <li key={club.id}>
                <DirectoryClubCard club={club} joining={joining} />
              </li>
            ))}
          </ul>
          {clubs.hasNextPage && (
            <Button variant="outline" className="mx-auto" disabled={clubs.isFetchingNextPage} onClick={() => void clubs.fetchNextPage()}>
              <Plus />
              Show more clubs
            </Button>
          )}
        </>
      )}
    </>
  )
}
