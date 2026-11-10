import type { TournamentFormat, TournamentSeeding, TournamentTeamBuild, TournamentTeamMode } from '@matchpoynt/shared'
import { GitFork, Grid3x3, Hand, LayoutList, Network, Repeat, Scale, Shuffle, Trophy, Users, type LucideIcon } from 'lucide-react'

/** Presentation of the tournament choices. The API decides what each one means. */

interface Choice<T extends string> {
  id: T
  label: string
  description: string
  icon: LucideIcon
}

export const tournamentFormats: Choice<TournamentFormat>[] = [
  { id: 'single-elimination', label: 'Single elimination', description: 'Lose once and you are out. Top seeds get byes when the draw is not full.', icon: GitFork },
  { id: 'double-elimination', label: 'Double elimination', description: 'A losers bracket gives everyone a second chance; the final may be played twice.', icon: Network },
  { id: 'round-robin', label: 'Round robin', description: 'Everyone plays everyone. The table decides the winner.', icon: Grid3x3 },
  { id: 'pools-knockout', label: 'Pools then knockout', description: 'Round-robin pools first; the best of each pool go into a knockout.', icon: LayoutList },
]

export const tournamentTeamModes: Choice<TournamentTeamMode>[] = [
  { id: 'fixed', label: 'Fixed teams', description: 'Partners stay together for the whole tournament.', icon: Users },
  { id: 'rotating', label: 'Rotating partners', description: 'Players enter alone and get new partners every round. Round robin only; players are ranked one by one.', icon: Repeat },
]

export const tournamentTeamBuilds: Choice<TournamentTeamBuild>[] = [
  { id: 'balanced', label: 'Balanced by tier', description: 'Strongest with weakest, so teams are even.', icon: Scale },
  { id: 'random', label: 'Random draw', description: 'Partners drawn at random.', icon: Shuffle },
  { id: 'manual', label: 'Pick partners', description: 'Choose each team yourself.', icon: Hand },
]

export const tournamentSeedings: Choice<TournamentSeeding>[] = [
  { id: 'tier', label: 'By skill tier', description: 'Strongest seeded first, so they meet late.', icon: Trophy },
  { id: 'random', label: 'Random draw', description: 'Seeds drawn at random.', icon: Shuffle },
]

/** How often the public tournament page refreshes. */
export const tournamentPollMs = 15_000

/** Standings table columns. */
export const standingColumns = [
  { key: 'rank', label: '#', className: 'w-10', title: 'Place' },
  { key: 'name', label: 'Entrant', className: '', title: undefined },
  { key: 'played', label: 'Played', className: 'w-16 text-right', title: undefined },
  { key: 'record', label: 'W–L', className: 'w-16 text-right', title: 'Wins and losses' },
  { key: 'diff', label: '+/−', className: 'hidden w-16 text-right sm:table-cell', title: 'Points won minus points lost' },
] as const
