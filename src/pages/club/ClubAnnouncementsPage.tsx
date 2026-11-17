import type { ClubAnnouncementInput, ClubAnnouncementView } from '@matchpoynt/shared'
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import AnnouncementDialog from '@/components/announcements/AnnouncementDialog'
import AnnouncementItem from '@/components/announcements/AnnouncementItem'
import AnnouncementsSkeleton from '@/components/announcements/AnnouncementsSkeleton'
import ConfirmButton from '@/components/common/ConfirmButton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useAnnouncementActions, useClubAnnouncements } from '@/utils/hooks/useClubAnnouncements'
import { useClubPage } from '@/utils/hooks/useClubPage'

/** `/clubs/<id>/announcements`: news for the club's members, posted, pinned, edited and deleted here. */
export default function ClubAnnouncementsPage() {
  const { view } = useClubPage()
  const clubId = view.club.id
  const list = useClubAnnouncements(clubId)
  const { post, edit, remove } = useAnnouncementActions(clubId)
  // `undefined`: closed; `null`: posting a new one; otherwise the one being edited.
  const [editing, setEditing] = useState<ClubAnnouncementView | null | undefined>(undefined)
  const saving = editing ? edit : post
  const open = (target: ClubAnnouncementView | null) => {
    post.reset()
    edit.reset()
    setEditing(target)
  }
  const submit = (input: ClubAnnouncementInput) => {
    const done = { onSuccess: () => setEditing(undefined) }
    if (editing) edit.mutate({ id: editing.id, input }, done)
    else post.mutate(input, done)
  }

  return (
    <>
      <PageMeta title={`Announcements · ${view.club.name}`} description={`News for ${view.club.name}'s members, shown on the club's page.`} />
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">Members see these on the club's page, newest first, with pinned ones on top.</p>
          <Button onClick={() => open(null)} disabled={!list.data || list.data.addBlockedReason !== null} title={list.data?.addBlockedReason ?? undefined}>
            <Plus />
            New announcement
          </Button>
        </div>
        {remove.isError && <ErrorBanner error={remove.error} action={`delete “${remove.variables?.title ?? 'the announcement'}”`} onRetry={() => remove.variables && remove.mutate(remove.variables)} />}
        {list.isError ? (
          <ErrorBanner error={list.error} action="load the announcements" onRetry={() => void list.refetch()} />
        ) : !list.data ? (
          <AnnouncementsSkeleton />
        ) : list.data.announcements.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Megaphone />
              </EmptyMedia>
              <EmptyTitle>No announcements yet</EmptyTitle>
              <EmptyDescription>Post court changes, events or reminders, and members see them on the club's page.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="grid gap-3" aria-label="Announcements">
            {list.data.announcements.map((a) => (
              <AnnouncementItem
                key={a.id}
                announcement={a}
                actions={
                  <>
                    <Button variant="ghost" size="icon-sm" onClick={() => open(a)} aria-label={`Edit “${a.title}”`} title="Edit">
                      <Pencil />
                    </Button>
                    <ConfirmButton
                      iconOnly
                      variant="ghost"
                      icon={Trash2}
                      label={`Delete “${a.title}”`}
                      title={`Delete “${a.title}”?`}
                      description="Members won't see it any more. This can't be undone."
                      confirmLabel="Delete announcement"
                      pending={remove.isPending && remove.variables?.id === a.id}
                      onConfirm={() => remove.mutate({ id: a.id, title: a.title })}
                    />
                  </>
                }
              />
            ))}
          </ul>
        )}
      </div>
      <AnnouncementDialog
        open={editing !== undefined}
        initial={editing ? { title: editing.title, body: editing.body, pinned: editing.pinned } : null}
        pinBlockedReason={list.data?.pinBlockedReason ?? null}
        pending={saving.isPending}
        error={saving.error}
        onOpenChange={(o) => !o && setEditing(undefined)}
        onSubmit={submit}
      />
    </>
  )
}
