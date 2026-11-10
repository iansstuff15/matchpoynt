import type { TournamentSeeding, TournamentTeamBuild } from '@matchpoynt/shared'
import type { EntrantState } from '@/interfaces/TournamentState'
import { invalid } from '@/utils/http/errors'

// Forming entrants: teams from players, and seeding them. Pure; draws come
// from the injected random source.

interface Player {
  id: string
  name: string
}

/** Shuffles a copy, using the injected random source (Fisher–Yates). */
export function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * Teams of `perSide` from the players: as given (`manual`), drawn at random,
 * or balanced so every team's skill adds up about the same (strongest with
 * weakest, snake order).
 */
export function buildTeams(
  players: Player[],
  perSide: number,
  build: TournamentTeamBuild,
  manual: string[][],
  rank: (id: string) => number,
  random: () => number,
): string[][] {
  if (perSide === 1) return players.map((p) => [p.id])
  if (players.length % perSide !== 0) {
    const extra = players.length % perSide
    throw invalid(
      `${players.length} players don't split into teams of ${perSide}. Add ${perSide - extra} or leave out ${extra}.`,
      { teams: 'Uneven teams' },
    )
  }
  const count = players.length / perSide

  if (build === 'manual') {
    const ids = new Set(players.map((p) => p.id))
    const used = manual.flat()
    if (manual.length !== count || manual.some((team) => team.length !== perSide)) {
      throw invalid(`Make ${count} teams of ${perSide}: every player in exactly one team.`, { teams: 'Teams incomplete' })
    }
    if (new Set(used).size !== used.length || used.some((id) => !ids.has(id)) || used.length !== ids.size) {
      throw invalid('Put every player taking part in exactly one team.', { teams: 'Teams incomplete' })
    }
    return manual.map((team) => [...team])
  }

  if (build === 'random') {
    const drawn = shuffle(players, random)
    return Array.from({ length: count }, (_, i) => drawn.slice(i * perSide, (i + 1) * perSide).map((p) => p.id))
  }

  // Balanced: strongest first (ties drawn at random), dealt in snake order.
  const ranked = shuffle(players, random).sort((a, b) => rank(b.id) - rank(a.id))
  const teams: string[][] = Array.from({ length: count }, () => [])
  ranked.forEach((p, i) => {
    const lap = Math.floor(i / count)
    const at = i % count
    teams[lap % 2 === 0 ? at : count - 1 - at]!.push(p.id)
  })
  return teams
}

/** Seeds the entrants: strongest average tier first (ties drawn), or all drawn at random. */
export function seedEntrants(teams: string[][], seeding: TournamentSeeding, rank: (id: string) => number, random: () => number, newId: () => string): EntrantState[] {
  const strength = (team: string[]) => team.reduce((sum, id) => sum + rank(id), 0) / team.length
  const drawn = shuffle(teams, random)
  const ordered = seeding === 'tier' ? drawn.sort((a, b) => strength(b) - strength(a)) : drawn
  return ordered.map((playerIds, i) => ({ id: newId(), playerIds, seed: i + 1 }))
}
