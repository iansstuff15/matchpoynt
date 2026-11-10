import { Check, Pencil, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router'
import ClubPickerTile from '@/components/club/ClubPickerTile'
import ClubPickerTileSkeleton from '@/components/club/ClubPickerTileSkeleton'
import CreateClubDialog from '@/components/club/CreateClubDialog'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { clubSkeletonCards } from '@/config/club'
import { useClubs } from '@/utils/hooks/useClubs'

/**
 * The club picker, styled like a streaming service's profile screen: every
 * club as a big round avatar, "Add club", and an edit mode. `?new=1` opens
 * "Add club" and `?edit=1` starts in edit mode (both from the sidebar switcher).
 */
export default function ClubsPage() {
  const clubs = useClubs()
  const [params, setParams] = useSearchParams()
  const editing = params.has('edit')
  const setEditing = (on: boolean) => setParams(on ? { edit: '1' } : {}, { replace: true })
  const list = clubs.data ?? []

  return (
    <section aria-labelledby="clubs-title" className="club-picker">
      <PageMeta title="Clubs" description="Pick a club to manage: members, planned sessions, descriptions and photos." />
      <h1 id="clubs-title" className="club-picker-title">
        {editing ? 'Edit clubs' : list.length ? 'Which club?' : 'Start your first club'}
      </h1>

      {clubs.isError ? (
        <div className="w-full max-w-xl">
          <ErrorBanner error={clubs.error} action="load your clubs" onRetry={() => void clubs.refetch()} />
        </div>
      ) : (
        <ul className="club-picker-grid" aria-label="Your clubs" aria-busy={clubs.isPending}>
          {clubs.isPending
            ? Array.from({ length: clubSkeletonCards }, (_, i) => (
                <li key={i}>
                  <ClubPickerTileSkeleton />
                </li>
              ))
            : list.map((club) => (
                <li key={club.id}>
                  <ClubPickerTile club={club} editing={editing} />
                </li>
              ))}
          {!clubs.isPending && !editing && (
            <li>
              <CreateClubDialog
                defaultOpen={params.has('new')}
                trigger={
                  <button type="button" className="club-tile" aria-label="Add a club">
                    <span className="club-tile-avatar club-tile-add">
                      <Plus className="size-10" aria-hidden />
                    </span>
                    <span className="club-tile-name">Add club</span>
                  </button>
                }
              />
            </li>
          )}
        </ul>
      )}

      {list.length > 0 && (
        <Button
          variant="outline"
          className="border-deep-muted/60 bg-transparent text-deep-foreground hover:bg-glass hover:text-deep-foreground"
          onClick={() => setEditing(!editing)}
        >
          {editing ? <Check /> : <Pencil />}
          {editing ? 'Done' : 'Edit clubs'}
        </Button>
      )}
    </section>
  )
}
