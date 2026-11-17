import { randomUUID } from 'node:crypto'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { setUpSession } from '../support/session'

// Taking a break: players sit out the queue until they're back, from the board or their own phone.
test.describe('taking a break', () => {
  test('the Queue Master gives a waiting player a break and brings them back', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben', 'Cy', 'Dee', 'Eli'].map((name) => ({ name, checkedIn: true })) })
    const queue = page.getByRole('complementary', { name: 'Queue' })
    await queue.getByRole('button', { name: 'Give Eli a break' }).click()
    await pageReady(page)
    const away = queue.getByRole('list', { name: 'Players on a break' })
    await expect(away).toContainText('Eli')
    await expect(queue.getByRole('button', { name: 'Give Eli a break' })).toHaveCount(0)

    await away.getByRole('button', { name: 'Bring Eli back to the queue' }).click()
    await pageReady(page)
    await expect(queue.getByRole('list', { name: 'Players on a break' })).toHaveCount(0)
    await expect(queue.getByRole('button', { name: 'Give Eli a break' })).toBeVisible()
  })

  test('a player takes a break from their phone, and the board shows it', async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false })
    api.clubs.addViewer(id)
    await setUpSession(page, { players: ['ana.reyes', 'Ben', 'Cy', 'Dee', 'Eli'].map((name) => ({ name, checkedIn: true })) })
    const sessionId = api.sessions.latestId()
    api.sessions.assignClub(sessionId, id)

    await gotoReady(page, `/play/${sessionId}`)
    await page.getByRole('button', { name: 'Take a break' }).click()
    await pageReady(page)
    await expect(page.getByRole('heading', { name: "You're on a break. Come back to the queue when you're ready." })).toBeVisible()

    await gotoReady(page, `/app/${sessionId}`)
    await expect(page.getByRole('list', { name: 'Players on a break' })).toContainText('ana.reyes')

    await gotoReady(page, `/play/${sessionId}`)
    await page.getByRole('button', { name: "I'm back: put me in the queue" }).click()
    await pageReady(page)
    await expect(page.getByRole('button', { name: 'Take a break' })).toBeVisible()
  })
})
