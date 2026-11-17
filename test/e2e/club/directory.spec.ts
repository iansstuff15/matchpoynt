import { randomUUID } from 'node:crypto'
import { appNav } from '../support/appShell'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { setUpSession } from '../support/session'

const fee = { kind: 'fixed' as const, currency: 'PHP' as const, base: 15000, perGame: 0 }
const auto = { approval: 'auto' as const, welcomeMessage: 'Welcome! Games start at 7.', welcomeLinks: [{ label: 'Group chat', url: 'https://chat.example.com/lake' }] }

// The player's side: finding clubs, a club's page, asking to join it and its sessions, and invites.
test.describe('club directory (player)', () => {
  test.beforeEach(async ({ api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
  })

  test('lists every club with a handle a page at a time, with search', async ({ page, api }) => {
    for (let i = 1; i <= 14; i++) api.clubs.seed(club(randomUUID(), `Club ${String(i).padStart(2, '0')}`, { handle: `club${i}` }), { mine: false })
    api.clubs.seed(club(randomUUID(), 'No Handle', { handle: null }), { mine: false })
    await gotoReady(page, '/app')
    // Find clubs is in the club switcher's menu now.
    await appNav(page).getByRole('button', { name: 'Switch club' }).click()
    await page.getByRole('menuitem', { name: 'Find clubs' }).click()
    await expect(page).toHaveURL('/choose-club')
    await pageReady(page)
    const list = page.getByRole('list', { name: 'Clubs' })
    await expect(list.getByRole('listitem')).toHaveCount(12)
    // Newest first.
    await expect(list.getByRole('listitem').first()).toContainText('Club 14')
    await page.getByRole('button', { name: 'Show more clubs' }).click()
    await pageReady(page)
    await expect(list.getByRole('listitem')).toHaveCount(14)
    await expect(page.getByText('No Handle')).toHaveCount(0)

    await page.getByLabel('Search clubs').fill('@club1')
    await expect(list.getByRole('listitem')).toHaveCount(6)
    await page.getByLabel('Search clubs').fill('zzz')
    await expect(page.getByText('No clubs match that')).toBeVisible()
  })

  test("a club's page shows its info, fees and leaderboard, and asking to join waits for the owner", async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside', description: 'Smash with friends on Thursdays.', fee, feeSummary: null }), { mine: false, members: ['Ben', 'Cy'] })
    await gotoReady(page, '/explore')
    await page.getByRole('link', { name: "Lakeside: open the club's page" }).click()
    await expect(page).toHaveURL('/c/lakeside')
    await pageReady(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Lakeside' })).toBeVisible()
    await expect(page.getByText('Smash with friends on Thursdays.')).toBeVisible()
    await expect(page.getByText('2 members')).toBeVisible()
    await expect(page.getByText('₱150.00 per player. Each session can set its own.')).toBeVisible()
    await expect(page.getByText('No results yet.')).toBeVisible()
    await expect(page.getByText('This club has no badges yet.')).toBeVisible()
    // Not a member: no welcome, and sessions can't be asked for yet.
    await expect(page.getByRole('heading', { name: /Welcome to/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Join Lakeside' }).click()
    await pageReady(page)
    await expect(page.getByRole('button', { name: 'Request sent' })).toBeDisabled()
    expect(api.clubs.pendingOf(id).joinRequests).toEqual([expect.objectContaining({ username: 'ana.reyes' })])
  })

  test('joining a club with automatic approval shows its welcome, and members can ask to join a running session', async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside', joining: auto }), { mine: false })
    await setUpSession(page, { players: ['Ben', 'Cy'] })
    api.sessions.assignClub(api.sessions.latestId(), id)

    await gotoReady(page, '/c/lakeside')
    await expect(page.getByRole('button', { name: 'Ask to join Badminton session' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Join Lakeside' }).click()
    await pageReady(page)
    await expect(page.getByRole('heading', { name: 'Welcome to Lakeside' })).toBeVisible()
    await expect(page.getByText('Welcome! Games start at 7.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Group chat' })).toHaveAttribute('href', 'https://chat.example.com/lake')
    await expect(page.getByRole('button', { name: 'Member' })).toBeDisabled()

    const sessions = page.getByRole('list', { name: 'Upcoming and running sessions' })
    await expect(sessions).toContainText('Live')
    await page.getByRole('button', { name: 'Ask to join Badminton session' }).click()
    await pageReady(page)
    await expect(sessions).toContainText('Asked to join')
    expect(api.clubs.pendingOf(id).sessionRequests).toEqual([expect.objectContaining({ memberName: 'ana.reyes' })])
  })

  test('an invite sent in the app is accepted from Find clubs', async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false, members: ['Ana Reyes'] })
    api.clubs.inviteInApp(id, 'Ana Reyes', api.profile.user!.id)
    await gotoReady(page, '/explore')
    const invites = page.getByRole('list', { name: 'Club invites' })
    await expect(invites).toContainText('Lakeside')
    await expect(page.getByRole('listitem').filter({ hasText: 'Lakeside' }).last()).toContainText('Accept invite')
    await page.getByRole('button', { name: 'Join Lakeside' }).click()
    await pageReady(page)
    await expect(page.getByRole('heading', { name: /Invites ·/ })).toHaveCount(0)
    await expect(page.getByRole('list', { name: 'Clubs' })).toContainText('Member')
  })

  test('with the directory switched off there is no Find clubs page or link', async ({ page, api }) => {
    api.state.features.web.clubDirectory = false
    await gotoReady(page, '/app')
    await expect(appNav(page).getByRole('link', { name: 'Find clubs' })).toHaveCount(0)
    await gotoReady(page, '/explore')
    await expect(page.getByRole('heading', { name: 'Find clubs' })).toHaveCount(0)
  })
})
