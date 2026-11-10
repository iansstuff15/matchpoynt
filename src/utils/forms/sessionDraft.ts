import { sessionDefaults, sportRules, type SessionSetupInput, type SessionView, type SportId } from '@matchpoynt/shared'

// Builds and reshapes the setup dialog's draft. This is form state only: the
// API validates the draft and decides what it means.

/** Row key for a new court or player in the draft. The API assigns the real id. */
export const draftId = () => crypto.randomUUID()

export const newCourtDraft = (index: number) => ({ id: draftId(), label: `Court ${index + 1}` })

function defaultScoring(sportId: SportId): SessionSetupInput['scoring'] {
  const sport = sportRules[sportId]
  const format = sport.scoring[0]
  const matchFormat = format?.formats.includes(sport.defaultFormat) ? sport.defaultFormat : (format?.formats[0] ?? sport.defaultFormat)
  return { formatId: format?.id ?? '', matchFormat }
}

export function newSessionDraft(sportId: SportId): SessionSetupInput {
  return {
    sportId,
    scoring: defaultScoring(sportId),
    rules: { ...sessionDefaults.rules },
    matchmaking: sessionDefaults.matchmaking,
    courts: Array.from({ length: sessionDefaults.courtCount }, (_, i) => newCourtDraft(i)),
    members: [],
  }
}

/** Switching sport keeps courts and names but resets the sport's own choices. */
export function withSport(draft: SessionSetupInput, sportId: SportId): SessionSetupInput {
  const firstTier = sportRules[sportId].tiers[0]?.id ?? ''
  return { ...draft, sportId, scoring: defaultScoring(sportId), members: draft.members.map((m) => ({ ...m, tierId: firstTier })) }
}

/** The running session as an editable draft. */
export function draftFromSession(session: SessionView): SessionSetupInput {
  const { sportId, scoring, rules, matchmaking } = session
  return {
    sportId,
    scoring,
    rules,
    matchmaking,
    courts: session.courts.map(({ id, label }) => ({ id, label })),
    members: session.players.map(({ id, name, tierId, checkedIn }) => ({ id, name, tierId, checkedIn })),
  }
}

/** Courts and players the dialog shouldn't offer to remove, because a match is in progress, and players already checked in (that can't be undone). */
export function lockedIds(session: SessionView | null | undefined) {
  return {
    courtIds: new Set(session?.courts.filter((c) => c.status === 'playing').map((c) => c.id) ?? []),
    memberIds: new Set(session?.players.filter((p) => p.onCourt).map((p) => p.id) ?? []),
    checkedInIds: new Set(session?.players.filter((p) => p.checkedIn).map((p) => p.id) ?? []),
  }
}

export type DraftLocks = ReturnType<typeof lockedIds>
