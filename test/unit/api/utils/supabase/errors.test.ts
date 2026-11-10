import { describe, expect, it } from 'vitest'
import { ApiError } from '@/utils/http/errors'
import { dbFail } from '@/utils/supabase/errors'

const fails = (error: Parameters<typeof dbFail>[0]) => {
  try {
    dbFail(error)
  } catch (e) {
    return e as ApiError
  }
  throw new Error('expected dbFail to throw')
}

describe('dbFail', () => {
  it('does nothing without an error', () => {
    expect(() => dbFail(null)).not.toThrow()
  })

  it.each([
    [{ message: 'version_conflict', code: 'P0001' }, 'conflict', 409, 'changed on another device'],
    [{ message: 'new row violates row-level security policy', code: '42501' }, 'forbidden', 403, "don't have access"],
    [{ message: 'duplicate key', code: '23505', details: 'sessions_one_active_per_owner' }, 'conflict', 409, 'already have a session'],
    [{ message: 'violates check constraint "session_courts_label_check"', code: '23514' }, 'invalid', 400, 'Court names must be'],
    [{ message: 'function public.save_session does not exist', code: 'PGRST202' }, 'unavailable', 503, 'pnpm db:migrate'],
    [{ message: "Could not find the 'check_in_slug' column of 'sessions' in the schema cache", code: 'PGRST204' }, 'unavailable', 503, 'pnpm db:migrate'],
    [{ message: 'column session_players.checked_in_at does not exist', code: '42703' }, 'unavailable', 503, 'pnpm db:migrate'],
    [{ message: 'TypeError: fetch failed', code: '' }, 'unavailable', 503, "couldn't reach the database"],
    [{ message: 'something odd', code: 'XX123' }, 'server_error', 500, 'code XX123'],
  ])('%#: maps %o to %s', (error, code, status, text) => {
    const e = fails(error)
    expect(e.code).toBe(code)
    expect(e.status).toBe(status)
    expect(e.message).toContain(text)
    expect(e.cause).toBe(error)
  })
})
