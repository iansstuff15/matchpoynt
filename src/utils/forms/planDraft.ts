import type { ClubMemberView, PlannedSessionInput, PlannedSessionView, SessionSetupInput, SportId } from '@matchpoynt/shared'
import { sportRules } from '@matchpoynt/shared'
import { newSessionDraft } from '@/utils/forms/sessionDraft'
import { fromLocalInput, toLocalInput } from '@/utils/time/formatWhen'

// The plan-a-session dialog's draft. Form state only: the API validates the
// plan and decides which members and tiers the session gets when it starts.

export interface PlanDraft {
  title: string
  /** `datetime-local` value; empty for "not decided". */
  scheduledFor: string
  /** Courts, scoring, rules and matchmaking, edited with the session setup steps. `members` mirrors the picked club members. */
  setup: SessionSetupInput
}

/** A picked club member as a setup row, showing their tier for the plan's sport (or the sport's first). */
export const memberRow = (member: ClubMemberView, sportId: SportId) => ({
  id: member.id,
  name: member.name,
  tierId: member.tiers.find((t) => t.sportId === sportId)?.tierId ?? sportRules[sportId].tiers[0]?.id ?? '',
})

export function newPlanDraft(sportId: SportId): PlanDraft {
  return { title: '', scheduledFor: '', setup: newSessionDraft(sportId) }
}

export function draftFromPlan(plan: PlannedSessionView, members: ClubMemberView[]): PlanDraft {
  const byId = new Map(members.map((m) => [m.id, m]))
  const { title, scheduledFor, sportId, scoring, rules, matchmaking, courts, memberIds } = plan
  return {
    title,
    scheduledFor: toLocalInput(scheduledFor),
    setup: {
      sportId,
      scoring,
      rules,
      matchmaking,
      courts,
      members: memberIds.flatMap((id) => {
        const m = byId.get(id)
        return m ? [memberRow(m, sportId)] : []
      }),
    },
  }
}

export function planInput(draft: PlanDraft): PlannedSessionInput {
  const { sportId, scoring, rules, matchmaking, courts, members } = draft.setup
  return {
    title: draft.title,
    scheduledFor: fromLocalInput(draft.scheduledFor),
    sportId,
    scoring,
    rules,
    matchmaking,
    courts,
    memberIds: members.map((m) => m.id),
  }
}
