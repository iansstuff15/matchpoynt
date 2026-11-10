import type { SessionSetupInput } from '@matchpoynt/shared'
import type { EngineContext, SessionState } from '@/interfaces/SessionState'
import { checkInPlayer } from '@/utils/session/engine'
import { createSession } from '@/utils/session/setup'

/** Deterministic ids and a settable clock for engine tests. */
export function testContext(start = 1_000): EngineContext & { tick: (ms?: number) => void } {
  let n = 0
  // A fixed pseudo-random sequence (LCG), so draws repeat run to run.
  let seed = 42
  const ctx = {
    now: start,
    newId: () => `id-${++n}`,
    random: () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 2 ** 32
      return seed / 2 ** 32
    },
    tick: (ms = 1_000) => {
      ctx.now += ms
    },
  }
  return ctx
}

export function setupInput(overrides: Partial<SessionSetupInput> = {}): SessionSetupInput {
  return {
    sportId: 'badminton',
    scoring: { formatId: 'bwf-21', matchFormat: 'doubles' },
    rules: { queueing: 'automatic', autoFill: false, timeLimitMinutes: null, lateJoiners: 'fair' },
    matchmaking: 'rotation',
    courts: [1, 2, 3, 4].map((i) => ({ id: `client-court-${i}`, label: `Court ${i}` })),
    members: ['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'].map((name, i) => ({
      id: `client-${i}`,
      name,
      tierId: 'beginner',
    })),
    ...overrides,
  }
}

/** Checks every roster player in, in roster order, one tick apart. */
export function checkInEveryone(state: SessionState, ctx: ReturnType<typeof testContext>): SessionState {
  let next = state
  for (const p of Object.values(state.players)) {
    if (p.active && p.checkedInAt === null) next = checkInPlayer(next, p.id, ctx)
  }
  return next
}

/** A new session with the whole roster at the venue, ready to play. */
export function readySession(input: SessionSetupInput = setupInput(), ctx = testContext()): SessionState {
  return checkInEveryone(createSession('o', input, ctx), ctx)
}
