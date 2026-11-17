import type { MemberHistory } from '@/utils/profile/history'
import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

const smash = '11111111-1111-4111-8111-111111111111'
const dink = '22222222-2222-4222-8222-222222222222'
const tuesday = '33333333-3333-4333-8333-333333333333'
const thursday = '44444444-4444-4444-8444-444444444444'
const openPlay = '55555555-5555-4555-8555-555555555555'

const match = (id: string, sessionId: string, sides: [string[], string[]], winner: 'a' | 'b', at: string) => ({
  id,
  sessionId,
  courtId: 'c1',
  courtLabel: 'Court 1',
  sides,
  startedAt: Date.parse(at) - 600_000,
  finishedAt: Date.parse(at),
  games: [winner === 'a' ? { a: 21, b: 15 } : { a: 15, b: 21 }],
  winner,
})

// Ana plays badminton at Smash Club (two sessions, three wins) and pickleball at Dink Society (one loss).
const histories: MemberHistory[] = [
  {
    clubId: smash,
    clubName: 'Smash Club',
    memberName: 'Ana Reyes',
    badges: [{ id: 'b1', name: 'Rally Queen', description: null, scope: 'session', conditions: [{ metric: 'wins', min: 2 }], iconUrl: null, iconSource: null, summary: 'At least 2 wins in one session' }],
    sessions: [
      { id: tuesday, label: 'Tuesday night', sportId: 'badminton', endedAt: '2026-11-03T12:00:00Z' },
      { id: thursday, label: 'Thursday night', sportId: 'badminton', endedAt: '2026-11-05T12:00:00Z' },
    ],
    players: [
      { id: 'p1', sessionId: tuesday, name: 'Ana Reyes' },
      { id: 'p2', sessionId: tuesday, name: 'Ben' },
      { id: 'p3', sessionId: thursday, name: 'Ana Reyes' },
      { id: 'p4', sessionId: thursday, name: 'Cy' },
    ],
    matches: [
      match('m1', tuesday, [['p1'], ['p2']], 'a', '2026-11-03T10:00:00Z'),
      match('m2', tuesday, [['p2'], ['p1']], 'b', '2026-11-03T11:00:00Z'),
      match('m3', thursday, [['p3'], ['p4']], 'a', '2026-11-05T10:00:00Z'),
    ],
  },
  {
    clubId: dink,
    clubName: 'Dink Society',
    memberName: 'Ana',
    badges: [],
    sessions: [{ id: openPlay, label: 'Open play', sportId: 'pickleball', endedAt: '2026-11-07T12:00:00Z' }],
    players: [
      { id: 'q1', sessionId: openPlay, name: 'Ana' },
      { id: 'q2', sessionId: openPlay, name: 'Fay' },
    ],
    matches: [match('n1', openPlay, [['q1'], ['q2']], 'b', '2026-11-07T10:00:00Z')],
  },
]

test.describe('your record across clubs and sports', () => {
  test.beforeEach(({ api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    api.profile.histories = histories
  })

  test('the overview totals every club and breaks it down by sport and club', async ({ page }) => {
    await gotoReady(page, '/app')
    await page.getByRole('link', { name: 'Your record' }).first().click()
    await expect(page).toHaveURL('/record')
    await pageReady(page)
    await expect(page.getByRole('heading', { name: 'All sports and clubs' })).toBeVisible()
    await expect(page.getByText('75%', { exact: true })).toBeVisible()
    const sports = page.getByRole('region', { name: 'By sport' })
    await expect(sports.getByText('Badminton')).toBeVisible()
    await expect(sports.getByText('Pickleball')).toBeVisible()
    const clubs = page.getByRole('region', { name: 'By club' })
    await expect(clubs.getByText('Smash Club')).toBeVisible()
    await expect(clubs.getByText('Dink Society')).toBeVisible()
  })

  test('match history filters by sport and club, and a session opens its own games', async ({ page }) => {
    // Old tab links land on their own pages.
    await gotoReady(page, '/record?tab=games')
    await expect(page).toHaveURL('/record/games')
    const games = page.getByRole('list', { name: 'Your games' })
    await expect(games.getByRole('listitem')).toHaveCount(4)

    await page.getByLabel('Sport').click()
    await page.getByRole('option', { name: 'Pickleball' }).click()
    await pageReady(page)
    await expect(games.getByRole('listitem')).toHaveCount(1)
    await expect(games).toContainText('vs Fay')
    await expect(page).toHaveURL(/sport=pickleball/)

    await page.getByRole('button', { name: 'Show all games' }).click()
    await pageReady(page)
    await expect(games.getByRole('listitem')).toHaveCount(4)

    await page.getByRole('link', { name: 'Your sessions' }).first().click()
    await pageReady(page)
    await expect(page).toHaveURL('/record/sessions')
    const sessions = page.getByRole('list', { name: 'Your sessions' })
    await expect(sessions.getByRole('listitem').first()).toContainText('Open play')
    await expect(sessions.getByRole('listitem').filter({ hasText: 'Tuesday night' })).toContainText('#1 of 2')
    // Each session's results can be shared as images, as from its leaderboard.
    await page.getByRole('button', { name: 'Share your results from Tuesday night' }).click()
    const share = page.getByRole('dialog', { name: /Share .*achievements/ })
    await expect(share).toBeVisible()
    await expect(share.getByRole('img').first()).toBeVisible({ timeout: 15_000 })
    await share.getByRole('button', { name: 'Close' }).first().click()
    await expect(share).toHaveCount(0)
    await page.getByRole('button', { name: 'Games in Tuesday night' }).click()
    await pageReady(page)
    await expect(page).toHaveURL(/\/record\/games\?session=/)
    await expect(page.getByRole('status').filter({ hasText: 'Only Tuesday night at Smash Club.' })).toBeVisible()
    await expect(games.getByRole('listitem')).toHaveCount(2)
  })

  test('the badge collection shows each badge with its club, sport and where it was earned', async ({ page }) => {
    await gotoReady(page, '/profile')
    await page.getByRole('link', { name: 'Your collection' }).click()
    await expect(page).toHaveURL('/record/badges')
    await pageReady(page)
    const smashBadges = page.getByRole('region', { name: 'Smash Club badges' })
    const rally = smashBadges.getByRole('listitem').filter({ hasText: 'Rally Queen' })
    await expect(rally).toContainText('Earned in Tuesday night')
    await expect(rally).toContainText('Badminton')
    await expect(rally.getByLabel('Earned 1 time')).toBeVisible()
  })

  test('rivals: who they played against and with most, and how it went', async ({ page }) => {
    await gotoReady(page, '/record/rivals')
    // Ben is Ana's opponent in two Tuesday matches (one win each way would show 1–1; Ana won both).
    const rivals = page.getByRole('table', { name: 'Rivals' })
    await expect(rivals.getByRole('row', { name: /Ben/ })).toContainText('2')
    await expect(rivals.getByRole('row', { name: /Ben/ })).toContainText('2–0')
    await expect(page.getByRole('heading', { name: 'Partners' })).toBeVisible()
  })
})
