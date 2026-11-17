import type { ClubView, PlannedSessionView } from '@matchpoynt/shared'
import { CalendarPlus, CalendarX2, Plus } from 'lucide-react'
import { useState } from 'react'
import ClubSessionCard from '@/components/club/ClubSessionCard'
import PlannedSessionCard from '@/components/club/PlannedSessionCard'
import PlanSessionDialog from '@/components/club/PlanSessionDialog'
import SessionRequestsCard from '@/components/club/SessionRequestsCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { defaultSportId } from '@/config/sports'
import { draftFromPlan, newPlanDraft } from '@/utils/forms/planDraft'
import { useOlderClubSessions, type useClubActions } from '@/utils/hooks/useClubs'
import { useFeatures } from '@/utils/hooks/useFeatures'

interface ClubSessionsPanelProps {
  view: ClubView
  actions: ReturnType<typeof useClubActions>
}

/** Sessions page: members asking to play, planned sessions (plan, edit, cover photo, start, delete), then the sessions the club has run, older ones a page at a time. */
export default function ClubSessionsPanel({ view, actions }: ClubSessionsPanelProps) {
  const older = useOlderClubSessions(view.club.id, view.sessionsNextBefore)
  const { web } = useFeatures()
  const { createPlan, updatePlan, deletePlan, uploadPlanCover, removePlanCover, startPlan } = actions
  // `null` while closed; `'new'` to plan one; a plan to edit.
  const [editing, setEditing] = useState<PlannedSessionView | 'new' | null>(null)
  const save = editing === 'new' ? createPlan : updatePlan
  const open = (next: PlannedSessionView | 'new') => {
    createPlan.reset()
    updatePlan.reset()
    setEditing(next)
  }
  const busy = <V,>(m: { isPending: boolean; variables?: V }, id: string, idOf: (v: V) => string) => m.isPending && m.variables !== undefined && idOf(m.variables) === id

  return (
    <div className="space-y-10">
      {web.clubDirectory && view.sessionRequests.length > 0 && <SessionRequestsCard requests={view.sessionRequests} actions={actions} />}
      <section aria-labelledby="club-plans-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="club-plans-title" className="font-display text-xl font-semibold">
              Planned sessions
            </h2>
            <p className="text-sm text-muted-foreground">Prepare courts, rules and the roster ahead of time, then start with one click.</p>
          </div>
          <Button onClick={() => open('new')}>
            <CalendarPlus />
            Plan a session
          </Button>
        </div>
        {view.planned.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarX2 />
              </EmptyMedia>
              <EmptyTitle>Nothing planned</EmptyTitle>
              <EmptyDescription>Plan your next club night: pick the sport, courts and who's coming, and add a cover photo.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="club-card-grid">
            {view.planned.map((plan) => (
              <li key={plan.id}>
                <PlannedSessionCard
                  plan={plan}
                  starting={busy(startPlan, plan.id, (p) => p.id)}
                  coverBusy={busy(uploadPlanCover, plan.id, (v) => v.plan.id) || busy(removePlanCover, plan.id, (p) => p.id)}
                  deleting={busy(deletePlan, plan.id, (p) => p.id)}
                  onStart={() => startPlan.mutate(plan)}
                  onEdit={() => open(plan)}
                  onUploadCover={(file) => uploadPlanCover.mutate({ plan, file })}
                  onRemoveCover={() => removePlanCover.mutate(plan)}
                  onDelete={() => deletePlan.mutate(plan)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {view.sessions.length > 0 && (
        <section aria-labelledby="club-history-title" className="space-y-4">
          {/* The first page comes with the club; older ones load a page at a time. */}
          <div>
            <h2 id="club-history-title" className="font-display text-xl font-semibold">
              Club sessions
            </h2>
            <p className="text-sm text-muted-foreground">Sessions started from this club's plans, newest first.</p>
          </div>
          <ul className="club-card-grid">
            {[...view.sessions, ...(older.data?.pages.flatMap((p) => p.sessions) ?? [])].map((s) => (
              <li key={s.id}>
                <ClubSessionCard session={s} />
              </li>
            ))}
          </ul>
          {older.isError && <ErrorBanner error={older.error} action="load older sessions" onRetry={() => void older.refetch()} />}
          {(older.data ? older.hasNextPage : view.sessionsNextBefore !== null) && (
            <Button variant="outline" className="mx-auto flex" disabled={older.isFetching} onClick={() => void (older.data ? older.fetchNextPage() : older.refetch())}>
              <Plus />
              Show older sessions
            </Button>
          )}
        </section>
      )}

      <PlanSessionDialog
        open={editing !== null}
        editing={editing !== 'new' && editing !== null}
        initial={editing === 'new' || editing === null ? newPlanDraft(defaultSportId, view.club.fee) : draftFromPlan(editing, view.members)}
        club={view.club}
        members={view.members}
        pending={save.isPending}
        error={save.error}
        onOpenChange={(next) => !next && setEditing(null)}
        onSubmit={(plan) => {
          const done = { onSuccess: () => setEditing(null) }
          if (editing === 'new') createPlan.mutate(plan, done)
          else if (editing) updatePlan.mutate({ id: editing.id, plan }, done)
        }}
      />
    </div>
  )
}
