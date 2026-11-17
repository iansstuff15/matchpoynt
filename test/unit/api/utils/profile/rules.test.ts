import type { ProfileInput, ProfileView } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { manageClubsBlockedReason, missingFields, passwordProblem, suggestedFromUser, validateProfile } from '@/utils/profile/rules'

const input = (o: Partial<ProfileInput> = {}): ProfileInput => ({
  firstName: 'Ana',
  lastName: 'Reyes',
  displayName: 'Ana R',
  username: 'ana.reyes',
  phone: '+63 917 555 0101',
  city: 'Manila',
  role: 'both',
  acceptTerms: true,
  sports: [{ sportId: 'badminton', tierId: 'intermediate' }],
  ...o,
})

describe('validateProfile', () => {
  it('accepts a complete profile', () => {
    expect(validateProfile(input())).toEqual({})
  })
  it.each([
    [{ firstName: ' ' }, 'profile', 'first and last name'],
    [{ username: '' }, 'profile', 'Pick a username'],
    [{ username: 'a!' }, 'profile', '3 to 30 characters'],
    [{ username: '.ana' }, 'profile', 'start and end with a letter or number'],
    [{ phone: 'call me' }, 'profile', "phone number has characters"],
    [{ sports: [] }, 'sports', 'at least one sport'],
    [{ sports: [{ sportId: 'badminton', tierId: '3.5' }] }, 'sports', 'badminton skill tier'],
    [{ sports: [{ sportId: 'tennis', tierId: '3.0' }, { sportId: 'tennis', tierId: '3.5' }] }, 'sports', 'only be picked once'],
    [{ acceptTerms: false }, 'agreements', 'terms of use'],
  ] as const)('%#: rejects %o on the %s step', (patch, step, text) => {
    expect(validateProfile(input(patch as Partial<ProfileInput>))[step]).toContain(text)
  })
})

describe('passwordProblem', () => {
  it('needs 8+ characters with a letter and a number', () => {
    expect(passwordProblem('short1')).toContain('8 characters')
    expect(passwordProblem('longenough')).toContain('letter and one number')
    expect(passwordProblem('court2026')).toBeNull()
  })
})

describe('missingFields', () => {
  const empty: ProfileView = { firstName: null, lastName: null, displayName: null, username: null, phone: null, city: null, role: null, termsAcceptedAt: null, sports: [] }
  it('lists every required field that is empty, ignoring optional ones', () => {
    // The display name is the username, so only the username is asked for.
    expect(missingFields(empty)).toEqual(['firstName', 'lastName', 'username', 'role', 'terms', 'sports'])
    expect(
      missingFields({ ...empty, firstName: 'A', lastName: 'B', displayName: 'AB', username: 'ab1', role: 'player', termsAcceptedAt: 'x', sports: [{ sportId: 'padel', tierId: '3' }] }),
    ).toEqual([])
  })
})

describe('provider data', () => {
  it('suggests names from the name on a Google sign-in', () => {
    expect(suggestedFromUser({ name: 'Ana Maria Reyes' })).toEqual({ firstName: 'Ana', lastName: 'Maria Reyes', username: 'anamariareyes' })
    expect(suggestedFromUser({ name: '  Ana   Reyes ' })).toEqual({ firstName: 'Ana', lastName: 'Reyes', username: 'anareyes' })
  })
  it('suggests nothing without a name', () => {
    expect(suggestedFromUser({ name: null })).toEqual({})
    expect(suggestedFromUser({ name: '   ' })).toEqual({})
  })
})

describe('manageClubsBlockedReason', () => {
  it('keeps player-only accounts out of club management, with how to change it', () => {
    expect(manageClubsBlockedReason('player', false)).toMatch(/Queue Master/)
    expect(manageClubsBlockedReason('queue_master', false)).toBeNull()
    expect(manageClubsBlockedReason('both', false)).toBeNull()
  })
  it('lets guests and unfinished profiles through (they are sent to finish it first)', () => {
    expect(manageClubsBlockedReason('player', true)).toBeNull()
    expect(manageClubsBlockedReason(null, false)).toBeNull()
  })
})
