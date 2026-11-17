import { randomUUID } from 'node:crypto'
import { createClub, openClubPage, openClubSettings } from '../support/club'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady, reloadReady } from '../support/pageReady'
import { setUpSession } from '../support/session'

const person = (n: number, name: string) => ({
  userId: `user-${n}`,
  username: name.toLowerCase().replace(' ', '.'),
  displayName: name,
  email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
  avatarUrl: null,
  avatarPosition: { x: 50, y: 50, zoom: 1 },
})

// The owner's side: inviting people in the app, how people join, requests to join the club and its sessions.
test.describe('club joining (owner)', () => {
  test.beforeEach(async ({ api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
  })

  test('adding a member suggests up to 5 people by name, email or username, and picking one invites them in the app', async ({ page, api }) => {
    api.clubs.people.push(...['Maria Santos', 'Mark Cruz', 'Marco Lim', 'Mara Tan', 'Marty Go', 'Marisol Uy'].map((name, i) => person(i, name)))
    await createClub(page, 'Lakeside')
    await openClubPage(page, 'Members')
    await page.getByRole('button', { name: 'Add member' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Add a member' })
    await dialog.getByLabel('Name').fill('mar')
    const options = page.getByRole('option')
    await expect(options).toHaveCount(5)
    // Each row shows the photo (initials here), the name, @username and email.
    await expect(options.first()).toContainText('Maria Santos')
    await expect(options.first()).toContainText('@maria.santos · maria.santos@example.com')

    // Matching works on the email too.
    await dialog.getByLabel('Name').fill('marisol.uy@')
    await expect(options).toHaveCount(1)
    await options.first().click()
    await expect(dialog.getByRole('status').filter({ hasText: 'gets an invite in the app' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Add member' }).click()
    await pageReady(page)
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('row', { name: /marisol\.uy/ })).toContainText('Invited in app')
    expect(api.clubs.pendingOf(api.clubs.idOf('Lakeside')).appInvites).toEqual([expect.objectContaining({ userId: 'user-5' })])
  })

  test('the joining settings choose automatic approval and a welcome message with links', async ({ page }) => {
    await createClub(page, 'Lakeside')
    const settings = await openClubSettings(page, 'Joining')
    await settings.getByRole('radio', { name: /They join at once/ }).check()
    await settings.getByLabel('Welcome message (optional)').fill('Bring indoor shoes!')
    await settings.getByRole('button', { name: 'Add link' }).click()
    await settings.getByLabel('Link 1 name').fill('Group chat')
    await settings.getByLabel('Link 1 address').fill('chat.example.com/lakeside')
    await settings.getByRole('button', { name: 'Save joining' }).click()
    await pageReady(page)
    await expect(page.getByText('People who ask now join at once').first()).toBeVisible()
    // Saved as the API tidied it: the address gained https://.
    await expect(settings.getByLabel('Link 1 address')).toHaveValue('https://chat.example.com/lakeside')
    await expect(settings.getByRole('button', { name: 'Save joining' })).toBeDisabled()
  })

  test("the club QR opens the club's join link", async ({ page }) => {
    await createClub(page, 'Lakeside')
    await page.getByRole('button', { name: 'Club QR' }).click()
    const dialog = page.getByRole('dialog', { name: 'Join Lakeside' })
    await expect(dialog.getByRole('img', { name: /QR code for .*\/join\/lakeside$/ })).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: 'Join link' })).toHaveValue(/\/join\/lakeside$/)
  })

  test('approving a request to join adds them to the roster, linked to their account', async ({ page, api }) => {
    await createClub(page, 'Lakeside')
    const clubId = api.clubs.idOf('Lakeside')
    api.clubs.requestToJoin(clubId, { userId: 'user-9', name: 'maria.s', username: 'maria.s', tiers: [{ sportId: 'badminton', tierId: 'intermediate' }] })
    api.clubs.requestToJoin(clubId, { userId: 'user-8', name: 'ben.t', username: 'ben.t' })
    await openClubPage(page, 'Members')
    await reloadReady(page)
    const requests = page.getByRole('list', { name: 'Requests to join' })
    await expect(requests.getByRole('listitem')).toHaveCount(2)
    await expect(requests.getByRole('listitem').first()).toContainText('Badminton Intermediate')

    await page.getByRole('button', { name: 'Approve maria.s' }).click()
    await pageReady(page)
    await expect(requests.getByRole('listitem')).toHaveCount(1)
    await expect(page.getByRole('row', { name: /maria\.s/ })).toContainText('@maria.s')

    await requests.getByRole('button', { name: 'Decline' }).click()
    await pageReady(page)
    await expect(page.getByRole('heading', { name: /Asking to join/ })).toHaveCount(0)
    await expect(page.getByRole('row', { name: /ben\.t/ })).toHaveCount(0)
  })

  test("approving a member's request to join a running session adds them to its roster", async ({ page, api }) => {
    const clubId = randomUUID()
    api.clubs.seed(club(clubId, 'Smash Club', { handle: 'smash' }), { members: ['Ben'] })
    await setUpSession(page, { players: ['Ana', 'Cy'] })
    const sessionId = api.sessions.latestId()
    api.sessions.assignClub(sessionId, clubId)
    api.clubs.requestSession(clubId, 'Ben', sessionId)

    await gotoReady(page, `/clubs/${clubId}/sessions`)
    await expect(page.getByRole('list', { name: 'Requests to join sessions' })).toContainText('Ben → Badminton session')
    await page.getByRole('button', { name: 'Add Ben to Badminton session' }).click()
    await pageReady(page)
    await expect(page.getByRole('heading', { name: /Asking to play/ })).toHaveCount(0)
    expect(api.sessions.runningIn(clubId)[0]!.names).toContain('Ben')
  })

  test('the club list loads a page at a time', async ({ page, api }) => {
    for (let i = 1; i <= 13; i++) api.clubs.seed(club(randomUUID(), `Club ${String(i).padStart(2, '0')}`))
    await gotoReady(page, '/clubs')
    const list = page.getByRole('list', { name: 'Your clubs' })
    await expect(list.getByRole('link')).toHaveCount(12)
    await page.getByRole('button', { name: 'Show more clubs' }).click()
    await pageReady(page)
    await expect(list.getByRole('link')).toHaveCount(13)
    await expect(page.getByRole('button', { name: 'Show more clubs' })).toHaveCount(0)
  })
})
