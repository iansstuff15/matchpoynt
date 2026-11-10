import { randomInt } from 'node:crypto'
import type { EngineContext } from '@/interfaces/SessionState'

/** The real clock, ids and random draws for one request. Tests pass their own (test/unit/support/session.ts). */
export const engineContext = (): EngineContext => ({
  now: Date.now(),
  newId: () => crypto.randomUUID(),
  random: () => randomInt(0, 2 ** 32) / 2 ** 32,
})
