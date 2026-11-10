import { tournamentLimits, type SessionView, type TournamentSetupInput } from '@matchpoynt/shared'

// The tournament setup dialog's draft. Form state only: the API forms the
// teams, checks the counts and draws the bracket.

export interface TournamentDraft extends Omit<TournamentSetupInput, 'teams'> {
  /** Hand-picked teams: team number per player id. */
  teamOf: Record<string, number>
}

/** Everyone checked in takes part by default. */
export function newTournamentDraft(session: SessionView, courtId: string, name: string): TournamentDraft {
  return {
    courtId,
    name,
    format: 'single-elimination',
    teamMode: 'fixed',
    teamBuild: 'balanced',
    playerIds: session.players.filter((p) => p.checkedIn).map((p) => p.id),
    teamOf: {},
    seeding: 'tier',
    pools: { count: 2, advance: 2 },
    rounds: tournamentLimits.defaultRounds,
  }
}

/** The request body: hand-picked teams grouped by team number, players in the order picked. */
export function tournamentInput(draft: TournamentDraft): TournamentSetupInput {
  const { teamOf, ...rest } = draft
  const teams: string[][] = []
  for (const id of draft.playerIds) {
    const t = teamOf[id]
    if (t === undefined) continue
    ;(teams[t] ??= []).push(id)
  }
  return { ...rest, teams: teams.filter(Boolean) }
}
