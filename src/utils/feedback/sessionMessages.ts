import type { CourtView, GameScore, SessionView } from '@matchpoynt/shared'

// Wording for toasts about board changes. Presentation only: every fact comes
// from the server's views, nothing is decided here.

export const sideNames = (side: CourtView['sides'][number]) => side.map((p) => p.name).join(' & ') || 'Side'

export const matchup = (court: CourtView) => `${sideNames(court.sides[0])} vs ${sideNames(court.sides[1])}`

export const courtLabel = (session: SessionView | null | undefined, courtId: string) =>
  session?.courts.find((c) => c.id === courtId)?.label ?? 'the court'

export const playerName = (session: SessionView | null | undefined, playerId: string) =>
  session?.players.find((p) => p.id === playerId)?.name ?? 'the player'

export const scoreLine = (games: GameScore[]) => games.map((g) => `${g.a}–${g.b}`).join(', ')

/** Courts that the server started without being asked to (auto-fill). */
export function autoStarted(prev: SessionView | null | undefined, next: SessionView, requestedCourtId?: string): CourtView[] {
  const wasPlaying = new Set(prev?.courts.filter((c) => c.status === 'playing').map((c) => c.id) ?? [])
  return next.courts.filter((c) => c.status === 'playing' && !wasPlaying.has(c.id) && c.id !== requestedCourtId)
}

/** Names of players the server now shows as checked in who weren't before (QR scans seen by a refresh). */
export function newlyCheckedIn(prev: SessionView | null | undefined, next: SessionView | null): string[] {
  if (!prev || !next || prev.id !== next.id) return []
  const waiting = new Set(prev.awaitingCheckIn.map((p) => p.id))
  return next.players.filter((p) => p.checkedIn && waiting.has(p.id)).map((p) => p.name)
}
