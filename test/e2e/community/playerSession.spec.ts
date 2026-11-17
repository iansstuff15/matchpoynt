import { randomUUID } from 'node:crypto'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { setUpSession } from '../support/session'

const person = (userId: string, username: string) => ({ userId, username, displayName: username, email: `${username}@example.com`, avatarUrl: null, avatarPosition: { x: 50, y: 50, zoom: 1 } })

// What a player checks most on "Your session": checking in from the app, their next match and when, their place, friends here and the session's settings.
test.describe('your session, for players', () => {
  test('checks in from the app, then shows the next match, place, friends here and the session', async ({ page, api, context }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false })
    api.clubs.addViewer(id)
    api.community.befriend(person('u-ben', 'Ben'))
    // Ana is on the roster but hasn't checked in at the venue.
    await setUpSession(page, { players: [{ name: 'ana.reyes', checkedIn: false }, ...['Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'].map((name) => ({ name, checkedIn: true }))] })
    api.sessions.assignClub(api.sessions.latestId(), id)

    await gotoReady(page, `/play/${api.sessions.latestId()}`)
    await expect(page.getByRole('heading', { name: 'Check in to join the queue: here, or at the venue.' })).toBeVisible()
    await page.getByRole('button', { name: "I'm here: check me in" }).click()
    await pageReady(page)
    await expect(page.getByRole('button', { name: "I'm here: check me in" })).toHaveCount(0)

    // In the queue now: their next match up front, with roughly when it starts.
    const next = page.getByRole('group', { name: 'Your next match' })
    await expect(next).toContainText('Next: You')
    await expect(next).toContainText(/Starts (any moment now|in about \d+ min)/)
    await expect(page.getByText('Points for–against')).toBeVisible()

    const friends = page.getByRole('list', { name: 'Your friends in this session' })
    await expect(friends.getByRole('listitem')).toHaveCount(1)
    await expect(friends).toContainText('Ben')

    const info = page.getByRole('heading', { name: 'About this session' }).locator('xpath=ancestor::*[@data-slot="card"][1]')
    await expect(info).toContainText('Badminton · ')
    await expect(info).toContainText('Fair queue: the app picks who plays next')

    // Alerts when they're called: asked once, remembered in this browser.
    await context.grantPermissions(['notifications'])
    await page.getByRole('button', { name: "Alert me when I'm called" }).click()
    await expect(page.getByRole('button', { name: 'Alerts on' })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await pageReady(page)
    await expect(page.getByRole('button', { name: 'Alerts on' })).toBeVisible()
  })
})
