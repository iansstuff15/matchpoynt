import { maxPlayersProblem } from '@/utils/club/signUp'
import {
  clubLimits,
  sportRules,
  type ClubInfoInput,
  type ClubMemberInput,
  type ClubMemberView,
  type PlannedSessionInput,
  type PlanStepId,
  type SessionSetupInput,
} from '@matchpoynt/shared'
import { keptFee } from '@/utils/fees/rules'
import { handleProblem, normalizeHandle } from '@/utils/social/handles'
import { invalid } from '@/utils/http/errors'
import { validateSetup } from '@/utils/session/setup'

// Club rules: what a club, a member and a planned session must look like, and
// how a plan becomes a session setup. Pure functions; the routes do the I/O.

type Errors<K extends string> = Partial<Record<K, string>>

function assertNone<K extends string>(errors: Errors<K>) {
  const first = Object.values<string | undefined>(errors).find(Boolean)
  if (first) throw invalid(first, errors as Record<string, string>)
}

const blankToNull = (v: string | null) => (v?.trim() ? v.trim() : null)

/** Trims a club's info and checks it. */
export function validateClubInfo(input: ClubInfoInput): Errors<'name' | 'handle' | 'description'> {
  const errors: Errors<'name' | 'handle' | 'description'> = {}
  const name = input.name.trim()
  if (!name) errors.name = 'Give the club a name.'
  else if (name.length > clubLimits.nameMaxLength) errors.name = `Club names can be up to ${clubLimits.nameMaxLength} characters.`
  const handle = handleProblem(input.handle, 'handle')
  if (handle) errors.handle = handle
  if ((input.description?.trim().length ?? 0) > clubLimits.descriptionMaxLength) {
    errors.description = `Descriptions can be up to ${clubLimits.descriptionMaxLength} characters.`
  }
  return errors
}

export function cleanClubInfo(input: ClubInfoInput): ClubInfoInput {
  assertNone(validateClubInfo(input))
  return { name: input.name.trim(), handle: normalizeHandle(input.handle), description: blankToNull(input.description) }
}

/** An account can run up to `clubLimits.maxClubs` clubs. */
export function addClubBlockedReason(clubCount: number): string | null {
  return clubCount >= clubLimits.maxClubs ? `You can run up to ${clubLimits.maxClubs} clubs. Delete one to make room.` : null
}

/** Checks a member: a name, optional contact, and at most one valid tier per sport. */
export function validateMember(input: ClubMemberInput): Errors<'name' | 'contact' | 'tiers'> {
  const errors: Errors<'name' | 'contact' | 'tiers'> = {}
  const name = input.name.trim()
  if (!name) errors.name = 'Every member needs a name.'
  else if (name.length > 60) errors.name = 'Member names can be up to 60 characters.'
  if ((input.contact?.trim().length ?? 0) > clubLimits.contactMaxLength) {
    errors.contact = `Contact details can be up to ${clubLimits.contactMaxLength} characters.`
  }
  const sports = input.tiers.map((t) => t.sportId)
  if (new Set(sports).size !== sports.length) errors.tiers = 'Give each sport one skill tier.'
  else {
    const bad = input.tiers.find((t) => !sportRules[t.sportId]?.tiers.some((tier) => tier.id === t.tierId))
    if (bad) errors.tiers = `Pick a ${sportRules[bad.sportId]?.name.toLowerCase() ?? 'valid'} skill tier from the list.`
  }
  return errors
}

export function cleanMember(input: ClubMemberInput): ClubMemberInput {
  assertNone(validateMember(input))
  return { name: input.name.trim(), contact: blankToNull(input.contact), tiers: input.tiers, ...(input.role && { role: input.role }) }
}

/** A club roster holds up to `clubLimits.maxMembers` people. */
export function addMemberBlockedReason(memberCount: number): string | null {
  return memberCount >= clubLimits.maxMembers ? `A club can have up to ${clubLimits.maxMembers} members.` : null
}

/** A member's tier in a sport: theirs if set, otherwise the sport's first tier. */
export function tierFor(member: ClubMemberView, sportId: SessionSetupInput['sportId']): string {
  return member.tiers.find((t) => t.sportId === sportId)?.tierId ?? sportRules[sportId].tiers[0]?.id ?? ''
}

/**
 * The session setup a plan stands for, with the members' current names and
 * tiers. Members who have left the club since are skipped.
 */
export function planToSetup(plan: PlannedSessionInput, members: ClubMemberView[]): SessionSetupInput {
  const byId = new Map(members.map((m) => [m.id, m]))
  const { sportId, scoring, rules, matchmaking, courts, fee } = plan
  return {
    sportId,
    scoring,
    rules,
    matchmaking,
    fee,
    courts,
    members: plan.memberIds.flatMap((id) => {
      const member = byId.get(id)
      return member ? [{ id, name: member.name, tierId: tierFor(member, sportId) }] : []
    }),
  }
}

/** Problems that block saving a plan, keyed by the dialog step that shows them. */
export function validatePlan(input: PlannedSessionInput, members: ClubMemberView[]): Errors<PlanStepId> {
  const errors: Errors<PlanStepId> = {}
  const title = input.title.trim()
  if (!title) errors.details = 'Give the session a title.'
  else if (title.length > clubLimits.titleMaxLength) errors.details = `Titles can be up to ${clubLimits.titleMaxLength} characters.`
  else if (input.scheduledFor !== null && Number.isNaN(Date.parse(input.scheduledFor))) errors.details = 'Pick a valid date and time.'

  const known = new Set(members.map((m) => m.id))
  if (new Set(input.memberIds).size !== input.memberIds.length) errors.members = 'Each member can be on the roster once.'
  else if (input.memberIds.some((id) => !known.has(id))) errors.members = "Some players aren't members of this club any more. Reload and pick again."
  const cap = maxPlayersProblem(input.maxPlayers, input.memberIds.length)
  if (cap && !errors.details) errors.details = cap

  return { ...validateSetup(planToSetup(input, members)), ...errors }
}

export function cleanPlan(input: PlannedSessionInput, members: ClubMemberView[]): PlannedSessionInput {
  assertNone(validatePlan(input, members))
  return {
    ...input,
    title: input.title.trim(),
    scheduledFor: input.scheduledFor === null ? null : new Date(input.scheduledFor).toISOString(),
    courts: input.courts.map((c) => ({ id: c.id, label: c.label.trim() })),
    fee: keptFee(input.fee),
    signUp: input.signUp ?? 'approval',
    maxPlayers: input.maxPlayers ?? null,
  }
}

/** A club keeps up to `clubLimits.maxPlannedSessions` plans at once. */
export function addPlanBlockedReason(planCount: number): string | null {
  return planCount >= clubLimits.maxPlannedSessions ? `A club can keep up to ${clubLimits.maxPlannedSessions} planned sessions. Start or delete one first.` : null
}
