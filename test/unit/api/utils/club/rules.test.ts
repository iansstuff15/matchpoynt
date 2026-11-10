import type { ClubMemberView, PlannedSessionInput } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { addClubBlockedReason, cleanClubInfo, cleanPlan, planToSetup, tierFor, validateClubInfo, validateMember, validatePlan } from '@/utils/club/rules'

const members: ClubMemberView[] = [
  { id: 'm1', name: 'Ana', contact: null, email: null, linked: false, invite: null, badges: [], tiers: [{ sportId: 'badminton', tierId: 'advanced' }] },
  { id: 'm2', name: 'Ben', contact: 'ben@example.com', email: null, linked: false, invite: null, badges: [], tiers: [] },
]

const plan = (o: Partial<PlannedSessionInput> = {}): PlannedSessionInput => ({
  title: 'Thursday open play',
  scheduledFor: '2026-11-05T18:00:00.000Z',
  sportId: 'badminton',
  scoring: { formatId: 'bwf-21', matchFormat: 'doubles' },
  rules: { queueing: 'automatic', autoFill: false, timeLimitMinutes: null, lateJoiners: 'fair' },
  matchmaking: 'rotation',
  courts: [{ id: 'c1', label: ' Court 1 ' }],
  memberIds: ['m1', 'm2'],
  ...o,
})

describe('club info', () => {
  it('trims and keeps an empty description as none', () => {
    expect(cleanClubInfo({ name: '  Smash Club ', description: '   ' })).toEqual({ name: 'Smash Club', description: null })
  })
  it('names what is wrong', () => {
    expect(validateClubInfo({ name: ' ', description: null }).name).toContain('name')
    expect(validateClubInfo({ name: 'A', description: 'x'.repeat(1001) }).description).toContain('1000')
  })
  it('caps how many clubs an account runs', () => {
    expect(addClubBlockedReason(19)).toBeNull()
    expect(addClubBlockedReason(20)).toContain('up to 20')
  })
})

describe('validateMember', () => {
  it('accepts a name with valid tiers', () => {
    expect(validateMember({ name: 'Ana', contact: null, tiers: [{ sportId: 'badminton', tierId: 'beginner' }] })).toEqual({})
  })
  it('rejects unknown tiers and repeated sports', () => {
    expect(validateMember({ name: 'Ana', contact: null, tiers: [{ sportId: 'badminton', tierId: 'legend' }] }).tiers).toContain('badminton')
    const twice = [
      { sportId: 'badminton' as const, tierId: 'beginner' },
      { sportId: 'badminton' as const, tierId: 'advanced' },
    ]
    expect(validateMember({ name: 'Ana', contact: null, tiers: twice }).tiers).toContain('one skill tier')
  })
})

describe('planToSetup', () => {
  it("uses each member's current name and tier for the plan's sport, falling back to the first tier", () => {
    expect(planToSetup(plan(), members).members).toEqual([
      { id: 'm1', name: 'Ana', tierId: 'advanced' },
      { id: 'm2', name: 'Ben', tierId: tierFor(members[1]!, 'badminton') },
    ])
  })
  it('skips members who have left the club', () => {
    expect(planToSetup(plan({ memberIds: ['m1', 'gone'] }), members).members.map((m) => m.id)).toEqual(['m1'])
  })
})

describe('validatePlan', () => {
  it('accepts a complete plan and tidies it', () => {
    expect(validatePlan(plan(), members)).toEqual({})
    expect(cleanPlan(plan({ title: '  Open play ' }), members)).toMatchObject({ title: 'Open play', courts: [{ id: 'c1', label: 'Court 1' }] })
  })
  it('keys problems by dialog step', () => {
    expect(validatePlan(plan({ title: ' ' }), members).details).toContain('title')
    expect(validatePlan(plan({ scheduledFor: 'soon' }), members).details).toContain('date')
    expect(validatePlan(plan({ memberIds: ['m1', 'm1'] }), members).members).toContain('once')
    expect(validatePlan(plan({ memberIds: ['stranger'] }), members).members).toContain("aren't members")
    expect(validatePlan(plan({ courts: [] }), members).courts).toContain('court')
  })
})
