import type {
  TournamentMatchView,
  TournamentRoundView,
  TournamentSectionView,
  TournamentSideView,
  TournamentStandingView,
  TournamentView,
} from '@matchpoynt/shared'
import type { SlotState, TournamentMatchState, TournamentState } from '@/interfaces/TournamentState'
import { championId, eliminated, matchStatus, poolEntrants, readyMatches, sidePlayers, standings } from '@/utils/tournament/progress'

// The tournament's read model: every label, order, standing and flag the
// Tournament tab and the public page show is decided here.

export interface TournamentViewContext {
  /** A player's name by id. */
  name: (playerId: string) => string
  /** Why a ready match can't start now; omitted on the public page, where nothing starts. */
  blockedReason?: (m: TournamentMatchState) => string | null
  courtLabels: string[]
  publicUrl: string | null
}

const poolLetter = (pool: number) => String.fromCharCode(65 + pool)

/** "Final", "Semifinal", "Quarterfinal", then "Round of 16" and up, counted back from the last round. */
function knockoutRoundName(round: number, rounds: number): string {
  const fromEnd = rounds - round
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semifinal'
  if (fromEnd === 2) return 'Quarterfinal'
  return `Round of ${2 ** (fromEnd + 1)}`
}

function roundLabels(t: TournamentState) {
  const maxRound = (stage: TournamentMatchState['stage']) => Math.max(0, ...t.matches.filter((m) => m.stage === stage).map((m) => m.round))
  const knockoutRounds = maxRound('knockout')
  const winnersRounds = maxRound('winners')
  const losersRounds = maxRound('losers')

  const round = (m: TournamentMatchState): string => {
    switch (m.stage) {
      case 'knockout':
        return knockoutRoundName(m.round, knockoutRounds)
      case 'winners':
        return m.round === winnersRounds ? 'Winners final' : `Winners round ${m.round}`
      case 'losers':
        return m.round === losersRounds ? 'Losers final' : `Losers round ${m.round}`
      case 'final':
        return m.round === 1 ? 'Grand final' : 'Grand final reset'
      case 'pool':
        return m.pool !== null && t.format === 'pools-knockout' ? `Pool ${poolLetter(m.pool)}, round ${m.round}` : `Round ${m.round}`
    }
  }
  const single = (m: TournamentMatchState) => t.matches.filter((o) => o.stage === m.stage && o.round === m.round && o.pool === m.pool).length === 1
  // "Quarterfinal 2" for named knockout rounds; "Winners round 1, match 3" and "Pool A, round 2, match 1" elsewhere.
  const match = (m: TournamentMatchState) => {
    if (single(m) && m.stage !== 'pool') return round(m)
    return m.stage === 'knockout' ? `${round(m)} ${m.index + 1}` : `${round(m)}, match ${m.index + 1}`
  }
  return { round, match }
}

/** Builds the Tournament tab's (and public page's) view. */
export function toTournamentView(t: TournamentState, ctx: TournamentViewContext): TournamentView {
  const labels = roundLabels(t)
  const byId = new Map(t.matches.map((m) => [m.id, m]))
  const out = eliminated(t)
  const players = (ids: string[]) => ids.map((id) => ({ id, name: ctx.name(id) }))
  const teamLabel = (ids: string[]) => {
    const names = ids.map(ctx.name)
    return names.length <= 2 ? names.join(' & ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`
  }
  const entrant = (id: string | null) => t.entrants.find((e) => e.id === id)

  const side = (m: TournamentMatchState, at: 0 | 1, slot: SlotState): TournamentSideView => {
    if (m.sides) return { entrantId: null, label: teamLabel(m.sides[at]), players: players(m.sides[at]), placeholder: null }
    const e = entrant(slot.entrantId)
    if (e) return { entrantId: e.id, label: teamLabel(e.playerIds), players: players(e.playerIds), placeholder: null }
    if (slot.empty) return { entrantId: null, label: 'Bye', players: [], placeholder: 'Bye' }
    const src = slot.source ? byId.get(slot.source.matchId) : undefined
    const placeholder = src ? `${slot.source!.take === 'winner' ? 'Winner' : 'Loser'} of ${labels.match(src)}` : 'To be decided'
    return { entrantId: null, label: placeholder, players: [], placeholder }
  }

  const matchView = (m: TournamentMatchState): TournamentMatchView => {
    const status = matchStatus(m)
    const blocked = status === 'ready' && ctx.blockedReason ? ctx.blockedReason(m) : null
    return {
      id: m.id,
      label: labels.match(m),
      stage: m.stage,
      round: m.round,
      status,
      sides: [side(m, 0, m.slots[0]), side(m, 1, m.slots[1])],
      winner: m.result && m.result !== 'void' ? m.result.winner : null,
      games: m.games,
      courtLabel: m.courtLabel,
      canStart: status === 'ready' && Boolean(ctx.blockedReason) && blocked === null,
      startBlockedReason: blocked,
    }
  }

  const roundsOf = (matches: TournamentMatchState[]): TournamentRoundView[] => {
    const groups = new Map<number, TournamentMatchState[]>()
    for (const m of matches) groups.set(m.round, [...(groups.get(m.round) ?? []), m])
    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, ms]) => ({ label: labels.round(ms[0]!), matches: ms.sort((a, b) => a.index - b.index).map(matchView) }))
  }

  const table = (matches: TournamentMatchState[], ids: string[], advance = 0): TournamentStandingView[] =>
    standings(matches, ids).map((row, i) => ({
      rank: i + 1,
      id: row.id,
      label: t.teamMode === 'rotating' ? ctx.name(row.id) : teamLabel(entrant(row.id)?.playerIds ?? []),
      played: row.played,
      wins: row.wins,
      losses: row.losses,
      pointsFor: row.pointsFor,
      pointsAgainst: row.pointsAgainst,
      advancing: i < advance,
    }))

  const of = (stage: TournamentMatchState['stage']) => t.matches.filter((m) => m.stage === stage)
  const sections: TournamentSectionView[] = []
  switch (t.format) {
    case 'single-elimination':
      sections.push({ id: 'knockout', label: 'Bracket', kind: 'bracket', rounds: roundsOf(of('knockout')), standings: [] })
      break
    case 'double-elimination':
      sections.push({ id: 'winners', label: 'Winners bracket', kind: 'bracket', rounds: roundsOf(of('winners')), standings: [] })
      if (of('losers').length) sections.push({ id: 'losers', label: 'Losers bracket', kind: 'bracket', rounds: roundsOf(of('losers')), standings: [] })
      sections.push({
        id: 'final',
        label: 'Grand final',
        kind: 'bracket',
        rounds: of('final').map((m) => ({ label: labels.round(m), matches: [matchView(m)] })),
        standings: [],
      })
      break
    case 'round-robin': {
      const ids = t.teamMode === 'rotating' ? t.playerIds : t.entrants.map((e) => e.id)
      sections.push({ id: 'round-robin', label: 'Round robin', kind: 'pool', rounds: roundsOf(of('pool')), standings: table(of('pool'), ids) })
      break
    }
    case 'pools-knockout':
      poolEntrants(t).forEach((entrants, p) => {
        const matches = t.matches.filter((m) => m.pool === p)
        sections.push({
          id: `pool-${p}`,
          label: `Pool ${poolLetter(p)}`,
          kind: 'pool',
          rounds: roundsOf(matches),
          standings: table(
            matches,
            entrants.map((e) => e.id),
            t.pools?.advance ?? 0,
          ),
        })
      })
      sections.push({ id: 'knockout', label: 'Knockout', kind: 'bracket', rounds: roundsOf(of('knockout')), standings: [] })
      break
  }

  const champion = championId(t)
  const championView = champion
    ? t.teamMode === 'rotating'
      ? { label: ctx.name(champion), players: players([champion]) }
      : { label: teamLabel(entrant(champion)?.playerIds ?? []), players: players(entrant(champion)?.playerIds ?? []) }
    : null

  const real = t.matches.filter((m) => m.result !== 'void' && !(m.result && m.result.walkover))
  const hint =
    t.status === 'finished'
      ? null
      : ctx.blockedReason && ctx.courtLabels.length === 0
        ? 'Switch a court to tournament play to start matches.'
        : t.format === 'pools-knockout' && !of('knockout').length
          ? 'The knockout is drawn when every pool match has a result.'
          : null

  return {
    name: t.name,
    format: t.format,
    teamMode: t.teamMode,
    status: t.status,
    champion: championView,
    entrants: t.entrants.map((e) => ({ id: e.id, label: teamLabel(e.playerIds), players: players(e.playerIds), seed: e.seed, eliminated: out.has(e.id) })),
    sections,
    upNext: readyMatches(t).map(matchView),
    playing: t.matches.filter((m) => matchStatus(m) === 'playing').map(matchView),
    matchesPlayed: real.filter((m) => m.result !== null).length,
    matchesTotal: real.length,
    courtLabels: ctx.courtLabels,
    hint,
    publicUrl: ctx.publicUrl,
  }
}

/** One line for a court card: "Semifinal 1", with each side's names. */
export function courtMatchLine(t: TournamentState, m: TournamentMatchState, name: (id: string) => string): { label: string; sides: [string, string] } {
  const [a, b] = sidePlayers(t, m)
  const team = (ids: string[]) => ids.map(name).join(' & ')
  return { label: roundLabels(t).match(m), sides: [team(a), team(b)] }
}
