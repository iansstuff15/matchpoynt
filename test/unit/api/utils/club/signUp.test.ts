import { signUpLimits } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { maxPlayersProblem, signUpBlockedReason, spotsLeft, type SignUpPlan } from '@/utils/club/signUp'

const now = Date.parse('2026-11-18T12:00:00Z')
const plan = (over: Partial<SignUpPlan> = {}): SignUpPlan => ({ signUp: 'open', maxPlayers: 8, players: 4, when: '2026-11-20T18:00:00Z', joined: false, ...over })

describe('spotsLeft', () => {
  it('counts places under the cap, never below zero', () => {
    expect(spotsLeft(8, 5)).toBe(3)
    expect(spotsLeft(8, 9)).toBe(0)
    expect(spotsLeft(null, 30)).toBeNull()
  })
})

describe('maxPlayersProblem', () => {
  it('takes no cap or a whole number in range that fits the roster', () => {
    expect(maxPlayersProblem(null, 10)).toBeNull()
    expect(maxPlayersProblem(undefined, 10)).toBeNull()
    expect(maxPlayersProblem(12, 10)).toBeNull()
    expect(maxPlayersProblem(1, 0)).toContain(`from ${signUpLimits.minPlayers}`)
    expect(maxPlayersProblem(4.5, 0)).toContain('whole number')
    expect(maxPlayersProblem(8, 10)).toContain('already has 10 players')
  })
})

describe('signUpBlockedReason', () => {
  it('lets a member sign up for an open plan with places left, and leave one they are on', () => {
    expect(signUpBlockedReason(plan(), true, now)).toBeNull()
    expect(signUpBlockedReason(plan({ joined: true }), false, now)).toBeNull()
    expect(signUpBlockedReason(plan({ maxPlayers: null, players: 100 }), true, now)).toBeNull()
  })

  it('refuses full plans, approval plans, twice, leaving when not on it, and started plans', () => {
    expect(signUpBlockedReason(plan({ players: 8 }), true, now)).toContain("It's full")
    expect(signUpBlockedReason(plan({ signUp: 'approval' }), true, now)).toContain('Ask to join')
    expect(signUpBlockedReason(plan({ joined: true }), true, now)).toBe("You're already signed up.")
    expect(signUpBlockedReason(plan(), false, now)).toBe("You're not signed up for this session.")
    expect(signUpBlockedReason(plan({ when: '2026-11-18T11:00:00Z', joined: true }), false, now)).toBe('This session has already started.')
  })
})
