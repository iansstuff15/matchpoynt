import type { ClubMemberView, FeeScheme, PlannedSessionInput, PlannedSessionView, PlanSignUp, SessionSetupInput, SportId } from '@matchpoynt/shared'
import { sportRules } from '@matchpoynt/shared'
import { newSessionDraft } from '@/utils/forms/sessionDraft'
import { fromLocalInput, toLocalInput } from '@/utils/time/formatWhen'

// The plan-a-session dialog's draft. Form state only: the API validates the
// plan and decides which members and tiers the session gets when it starts.

export interface PlanDraft {
  title: string
  /** `datetime-local` value; empty for "not decided". */
  scheduledFor: string
  /** How members get on the roster. */
  signUp: PlanSignUp
  /** The player cap as typed; empty for no cap. */
  maxPlayers: string
  /** Courts, scoring, rules and matchmaking, edited with the session setup steps. `members` mirrors the picked club members. */
  setup: SessionSetupInput
}

/** A picked club member as a setup row, showing their tier for the plan's sport (or the sport's first). */
export const memberRow = (member: ClubMemberView, sportId: SportId) => ({
  id: member.id,
  name: member.name,
  tierId: member.tiers.find((t) => t.sportId === sportId)?.tierId ?? sportRules[sportId].tiers[0]?.id ?? '',
})

/** A new plan, charging the club's saved fee (if it has one). */
export function newPlanDraft(sportId: SportId, clubFee: FeeScheme | null = null): PlanDraft {
  return { title: '', scheduledFor: '', signUp: 'approval', maxPlayers: '', setup: { ...newSessionDraft(sportId), fee: clubFee } }
}

export function draftFromPlan(plan: PlannedSessionView, members: ClubMemberView[]): PlanDraft {
  const byId = new Map(members.map((m) => [m.id, m]))
  const { title, scheduledFor, sportId, scoring, rules, matchmaking, fee, courts, memberIds } = plan
  return {
    title,
    scheduledFor: toLocalInput(scheduledFor),
    signUp: plan.signUp,
    maxPlayers: plan.maxPlayers === null ? '' : String(plan.maxPlayers),
    setup: {
      sportId,
      scoring,
      rules,
      matchmaking,
      fee,
      courts,
      members: memberIds.flatMap((id) => {
        const m = byId.get(id)
        return m ? [memberRow(m, sportId)] : []
      }),
    },
  }
}

export function planInput(draft: PlanDraft): PlannedSessionInput {
  const { sportId, scoring, rules, matchmaking, fee, courts, members } = draft.setup
  return {
    title: draft.title,
    scheduledFor: fromLocalInput(draft.scheduledFor),
    sportId,
    scoring,
    rules,
    matchmaking,
    fee,
    courts,
    memberIds: members.map((m) => m.id),
    signUp: draft.signUp,
    // Only turns what's typed into a number; whether it's allowed is the API's call.
    maxPlayers: draft.maxPlayers.trim() === '' ? null : Number(draft.maxPlayers),
  }
}
