import type { ClubSummary, ClubView } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { clubSetup } from '@/utils/club/setup'

const centred = { x: 50, y: 50, zoom: 1 }
const club = (o: Partial<ClubSummary> = {}): ClubSummary => ({
  id: 'c1',
  name: 'Smash Club',
  handle: null,
  socialLinks: [],
  description: null,
  avatarUrl: null,
  coverUrl: null,
  avatarPosition: centred,
  coverPosition: centred,
  theme: null,
  savedThemes: [],
  paymentQrs: [],
  fee: null,
  feeSummary: null,
  members: 0,
  plannedSessions: 0,
  joining: { approval: 'manual', welcomeMessage: null, welcomeLinks: [] },
  ...o,
})
const view = (o: Partial<Omit<ClubView, 'setup'>> = {}): Omit<ClubView, 'setup'> => ({
  club: club(),
  members: [],
  planned: [],
  sessions: [],
  badges: [],
  joinRequests: [],
  sessionRequests: [],
  sessionsNextBefore: null,
  ...o,
})

describe('clubSetup', () => {
  it('lists everything a new club still has to set up, in order', () => {
    expect(clubSetup(view(), true)).toEqual(['handle', 'description', 'avatar', 'cover', 'colors', 'fee', 'social', 'members', 'session'].map((id) => ({ id, done: false })))
  })

  it('ticks off what is set, and leaves out the fee while fees are off', () => {
    const done = clubSetup(
      view({ club: club({ handle: 'smash', description: 'Tuesdays', avatarUrl: '/a', fee: { kind: 'fixed', currency: 'PHP', base: 100, perGame: 0 }, socialLinks: [{ platform: 'website', url: 'https://smash.club/' }] }) }),
      true,
    )
    expect(done.filter((i) => i.done).map((i) => i.id)).toEqual(['handle', 'description', 'avatar', 'fee', 'social'])
    expect(clubSetup(view(), false).map((i) => i.id)).not.toContain('fee')
  })
})
