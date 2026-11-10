import type { CourtSide, PlayerRef, SessionView } from '@matchpoynt/shared'

// Shows a drag's result immediately, before the API answers. The API's reply
// replaces this; if the API refuses, the board is reloaded. Nothing is decided
// here: it only moves the name the user moved.

function removeFrom(session: SessionView, playerId: string): SessionView {
  const without = <T extends { id: string }>(list: T[]) => list.filter((p) => p.id !== playerId)
  return {
    ...session,
    queue: without(session.queue),
    // The dragged name leaves its lined-up match too; the API's reply regroups the queue.
    upNext: session.upNext && {
      matches: session.upNext.matches.map((m) => ({ sides: [without(m.sides[0]), without(m.sides[1])] })),
      waiting: without(session.upNext.waiting),
    },
    courts: session.courts.map((c) => ({
      ...c,
      lineup: [c.lineup[0].filter((p) => p.id !== playerId), c.lineup[1].filter((p) => p.id !== playerId)],
    })),
  }
}

export function previewAssign(session: SessionView, courtId: string, playerId: string, side: CourtSide): SessionView {
  const player = session.players.find((p) => p.id === playerId)
  if (!player) return session
  const ref: PlayerRef = { id: player.id, name: player.name }
  const next = removeFrom(session, playerId)
  return {
    ...next,
    courts: next.courts.map((c) => {
      if (c.id !== courtId) return c
      const lineup: SessionView['courts'][number]['lineup'] = [[...c.lineup[0]], [...c.lineup[1]]]
      lineup[side].push(ref)
      return { ...c, lineup }
    }),
  }
}

export function previewUnassign(session: SessionView, playerId: string): SessionView {
  const player = session.players.find((p) => p.id === playerId)
  if (!player) return session
  const next = removeFrom(session, playerId)
  return {
    ...next,
    queue: [...next.queue, player],
    upNext: next.upNext && { ...next.upNext, waiting: [...next.upNext.waiting, player] },
  }
}
