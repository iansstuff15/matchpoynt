import type { CourtView, PlayerView, SessionView, UpNextView } from '@matchpoynt/shared'
import type { PlayerState, SessionState } from '@/interfaces/SessionState'
import { features } from '@/config/features'
import { checkInUrl } from '@/utils/session/checkIn'
import { publicUrl } from '@/utils/session/publish'
import { activePlayers, addCourtBlockedReason, removeCourtBlockedReason, endBlockedReason, awaitingCheckIn, fairQueue, isCheckedIn, upcomingMatches, openMatchFor, playersPerMatch, startBlockedReason } from '@/utils/session/engine'
import { playersPerSide } from '@/utils/session/rules'
import { courtAssignments, tournamentMatchBlockedReason, tournamentMatchFor } from '@/utils/tournament/play'
import { heldPlayers } from '@/utils/tournament/progress'
import { competitorsBlockedReason } from '@/utils/tournament/setup'
import { tournamentUrl } from '@/utils/tournament/publish'
import { courtMatchLine, toTournamentView } from '@/utils/tournament/view'

const toPlayerView = (p: PlayerState): PlayerView => ({
  id: p.id,
  name: p.name,
  tierId: p.tierId,
  gamesPlayed: p.gamesPlayed,
  onCourt: p.status === 'playing',
  checkedIn: isCheckedIn(p),
  // Waiting for their next game since they joined the queue: on check-in, or when their last match finished.
  waitingSince: p.status === 'waiting' && isCheckedIn(p) ? new Date(p.queuedAt).toISOString() : null,
})

function upNextView(state: SessionState): UpNextView | null {
  const upcoming = upcomingMatches(state)
  if (!upcoming) return null
  const player = (id: string) => toPlayerView(state.players[id]!)
  return {
    matches: upcoming.matches.map(([a, b]) => ({ sides: [a.map(player), b.map(player)] })),
    waiting: upcoming.waiting.map(player),
  }
}

/** The board's read model. Every ordering and derived flag is decided here, not in the browser. */
/** Active players still in the running tournament, by name. */
const competitorIds = (state: SessionState) =>
  [...heldPlayers(state.tournament)].filter((id) => state.players[id]?.active).sort((a, b) => state.players[a]!.name.localeCompare(state.players[b]!.name))

export function toSessionView(state: SessionState, now: number = Date.now()): SessionView {
  const limitMs = state.settings.rules.timeLimitMinutes === null ? null : state.settings.rules.timeLimitMinutes * 60_000
  const name = (id: string) => ({ id, name: state.players[id]?.name ?? 'Removed player' })
  const active = activePlayers(state)
  const addCourtBlocked = addCourtBlockedReason(state)
  const playerName = (id: string) => state.players[id]?.name ?? 'Removed player'
  const assignments = courtAssignments(state)
  const t = state.tournament

  const courts: CourtView[] = [...state.courts]
    .sort((a, b) => a.position - b.position)
    .map((court) => {
      const match = openMatchFor(state, court.id)
      const blocked = startBlockedReason(state, court)
      const placed = court.lineup[0].length + court.lineup[1].length
      const due = match ? tournamentMatchFor(state, match.id) : assignments.get(court.id)
      return {
        id: court.id,
        label: court.label,
        status: court.status,
        sides: match ? [match.sides[0].map(name), match.sides[1].map(name)] : [[], []],
        startedAt: match ? new Date(match.startedAt).toISOString() : null,
        endsAt: match && limitMs !== null ? new Date(match.startedAt + limitMs).toISOString() : null,
        matchId: match?.id ?? null,
        lineup: [court.lineup[0].map(name), court.lineup[1].map(name)],
        openSlots: court.status === 'open' ? playersPerMatch(state) - placed : 0,
        canStart: blocked === null,
        removeBlockedReason: removeCourtBlockedReason(state, court),
        startBlockedReason: court.status === 'open' ? blocked : null,
        tournament: court.tournament,
        tournamentMatch: court.tournament && t && due ? courtMatchLine(t, due, playerName) : null,
      }
    })

  const endBlocked = endBlockedReason(state)
  return {
    id: state.id,
    title: state.title,
    clubId: state.clubId,
    version: state.version,
    ...state.settings,
    courts,
    queue: fairQueue(state).map(toPlayerView),
    upNext: upNextView(state),
    awaitingCheckIn: awaitingCheckIn(state).map(toPlayerView),
    // Who's in the running tournament (held out of open play), and whether the board can still change that.
    tournamentCompetitors: competitorIds(state).map((id) => toPlayerView(state.players[id]!)),
    competitorsBlockedReason: state.tournament?.status === 'active' ? competitorsBlockedReason(state) : null,
    checkIn: {
      url: checkInUrl(state.checkInSlug),
      checkedIn: active.filter(isCheckedIn).length,
      total: active.length,
    },
    players: [...active].sort((a, b) => a.name.localeCompare(b.name)).map(toPlayerView),
    playersPerMatch: playersPerMatch(state),
    playersPerSide: playersPerSide(state.settings),
    serverTime: new Date(now).toISOString(),
    canStartMatch: state.courts.some((c) => startBlockedReason(state, c) === null),
    canAddCourt: addCourtBlocked === null,
    canEnd: endBlocked === null,
    endBlockedReason: endBlocked,
    addCourtBlockedReason: addCourtBlocked,
    // A link only exists while publishing is switched on.
    publicUrl: features().web.publishSessions ? publicUrl(state.publicSlug) : null,
    tournament: t
      ? toTournamentView(t, {
          name: playerName,
          blockedReason: (m) => tournamentMatchBlockedReason(state, m),
          courtLabels: [...state.courts].sort((a, b) => a.position - b.position).filter((c) => c.tournament).map((c) => c.label),
          publicUrl: features().web.publishTournaments ? tournamentUrl(state.tournamentSlug) : null,
        })
      : null,
  }
}
