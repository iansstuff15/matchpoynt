import { sessionDefaults, sportRules, type SessionSetupInput, type SetupStepId } from '@matchpoynt/shared'
import type { CourtState, EngineContext, SessionState } from '@/interfaces/SessionState'
import { invalid } from '@/utils/http/errors'
import { autoFill, insertPlayer, settleCheckIns, tidyLineups } from '@/utils/session/engine'
import { playersPerSide } from '@/utils/session/rules'
import { heldPlayers } from '@/utils/tournament/progress'

type StepErrors = Partial<Record<SetupStepId, string>>

/** Problems that block saving a setup, keyed by the dialog step that shows them. */
export function validateSetup(input: SessionSetupInput): StepErrors {
  const errors: StepErrors = {}
  const sport = sportRules[input.sportId]
  const labels = input.courts.map((c) => c.label.trim().toLowerCase())

  if (input.courts.length === 0) errors.courts = 'Add at least one court.'
  else if (input.courts.length > sessionDefaults.maxCourts) errors.courts = `A session can have up to ${sessionDefaults.maxCourts} courts.`
  else if (labels.some((l) => !l)) errors.courts = 'Every court needs a name.'
  else if (new Set(labels).size !== labels.length) errors.courts = 'Court names must be different.'

  if (input.members.length > sessionDefaults.maxPlayers) errors.members = `A session can have up to ${sessionDefaults.maxPlayers} players.`
  else if (input.members.some((m) => !m.name.trim())) errors.members = 'Every player needs a name.'
  else if (input.members.some((m) => !sport.tiers.some((t) => t.id === m.tierId))) {
    errors.members = `Every player needs a ${sport.name.toLowerCase()} skill tier.`
  }

  const format = sport.scoring.find((f) => f.id === input.scoring.formatId)
  if (!format) errors.scoring = 'Choose a scoring format.'
  else if (!format.formats.includes(input.scoring.matchFormat)) errors.scoring = 'That format does not support this match type.'

  const limit = input.rules.timeLimitMinutes
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 240)) {
    errors.rules = 'Time limit must be a whole number of minutes, from 1 to 240.'
  }
  return errors
}

function assertValid(input: SessionSetupInput) {
  const errors = validateSetup(input)
  const first = Object.values(errors)[0]
  if (first) throw invalid(first, errors)
}

function settingsOf(input: SessionSetupInput): SessionState['settings'] {
  const { sportId, scoring, rules, matchmaking } = input
  return { sportId, scoring, rules, matchmaking }
}

/** A running tournament fixes the team size and keeps its players: settings can't pull them out from under it. */
function assertTournamentKept(state: SessionState, input: SessionSetupInput) {
  const t = state.tournament
  if (!t || t.status !== 'active') return
  const next = { ...state.settings, ...settingsOf(input) }
  if (playersPerSide(next) !== playersPerSide(state.settings)) {
    throw invalid('A tournament is running with this many players per side. Cancel it, or let it finish, before changing the match type.', {
      scoring: 'Tournament running',
    })
  }
  const kept = new Set(input.members.map((m) => m.id))
  const leaving = [...heldPlayers(t)].filter((id) => !kept.has(id)).map((id) => state.players[id]?.name ?? 'A player')
  if (leaving.length) {
    throw invalid(`${leaving.join(', ')} ${leaving.length === 1 ? 'is' : 'are'} still in the tournament, so they stay on the roster.`, {
      members: 'In the tournament',
    })
  }
}

/** A new session from the setup dialog. Client ids are never trusted: every row gets a server id. */
export function createSession(ownerId: string, input: SessionSetupInput, ctx: EngineContext): SessionState {
  assertValid(input)
  let state: SessionState = {
    id: ctx.newId(),
    ownerId,
    version: 0,
    status: 'active',
    title: null,
    clubId: null,
    publicSlug: null,
    checkInSlug: null,
    settings: settingsOf(input),
    tournament: null,
    tournamentSlug: null,
    players: {},
    courts: input.courts.map((c, position) => ({ id: ctx.newId(), label: c.label.trim(), position, status: 'open', lineup: [[], []], tournament: false })),
    matches: {},
  }
  // Roster players start not checked in, unless marked as already here.
  for (const member of input.members) state = insertPlayer(state, { ...member, id: ctx.newId() }, ctx, member.checkedIn === true)
  return autoFill(state, ctx)
}

/**
 * Applies an edited setup. The sport is fixed for a session. Courts with a
 * match and players on court are always kept. Ids the session doesn't know
 * are replaced with server ids, so a client can't overwrite another row.
 */
export function applySetup(state: SessionState, input: SessionSetupInput, ctx: EngineContext): SessionState {
  if (state.status !== 'active') throw invalid('This session has ended.')
  if (input.sportId !== state.settings.sportId) {
    throw invalid('A session is for one sport. Start a new session to switch.', { courts: 'Sport cannot change' })
  }
  assertValid(input)
  assertTournamentKept(state, input)

  const known = new Map(state.courts.map((c) => [c.id, c]))
  const wanted = new Set(input.courts.map((c) => c.id))
  const courts: CourtState[] = [
    ...input.courts.map((c): CourtState => {
      const existing = known.get(c.id)
      return existing
        ? { ...existing, label: c.label.trim() }
        : { id: ctx.newId(), label: c.label.trim(), position: 0, status: 'open', lineup: [[], []], tournament: false }
    }),
    ...state.courts.filter((c) => c.status === 'playing' && !wanted.has(c.id)),
  ].map((c, position) => ({ ...c, position }))

  let next: SessionState = { ...state, settings: settingsOf(input), courts }

  const memberIds = new Set(input.members.map((m) => m.id))
  const players = { ...next.players }
  for (const p of Object.values(players)) {
    if (p.active && p.status === 'waiting' && !memberIds.has(p.id)) players[p.id] = { ...p, active: false }
  }
  next = { ...next, players }

  for (const member of input.members) {
    const existing = next.players[member.id]
    // Ticking "already checked in" checks a waiting player in; unticking never undoes a recorded check-in.
    const checkedInAt = existing && existing.checkedInAt === null && member.checkedIn === true ? ctx.now : existing?.checkedInAt
    next = existing?.active
      ? { ...next, players: { ...next.players, [member.id]: { ...existing, name: member.name.trim(), tierId: member.tierId, checkedInAt: checkedInAt ?? null } } }
      : insertPlayer(next, { ...member, id: ctx.newId() }, ctx, member.checkedIn === true)
  }

  // Players just ticked as checked in join the queue now, as a check-in does.
  return autoFill(settleCheckIns(tidyLineups(next)), ctx)
}
