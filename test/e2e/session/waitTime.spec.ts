import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'
import { checkIn, courtCard, finishMatch, queuePanel, setUpSession } from '../support/session'

test.describe('wait times in the queue', () => {
  test('each queued player shows how long they have waited, counting up', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben', 'Cy'] })
    await checkIn(page, ['Ana', 'Ben'])
    const ana = queuePanel(page).getByLabel(/^waiting \d+:\d{2}$/).first()
    await expect(ana).toBeVisible()
    const first = await ana.getAttribute('aria-label')
    // It ticks.
    await expect(ana).not.toHaveAttribute('aria-label', first!, { timeout: 5_000 })
    // Players still to check in aren't waiting for a game yet.
    await expect(queuePanel(page).locator('li', { hasText: 'Cy' }).getByLabel(/^waiting/)).toHaveCount(0)
  })

  test('a long wait turns to the warning colour', async ({ page }) => {
    await page.clock.install()
    // Everyone checked in, so the board isn't polling: each reload resets the clock to the API's (real) time, as it should.
    await setUpSession(page, { players: ['Ana'] })
    await checkIn(page, ['Ana'])
    const wait = queuePanel(page).getByLabel(/^waiting/).first()
    await expect(wait).not.toHaveClass(/wait-time-long/)
    await page.clock.fastForward('21:00')
    await expect(wait).toHaveClass(/wait-time-long/)
    await expect(wait).toHaveAttribute('aria-label', /^waiting 2[01]:\d{2}$/)
  })

  test('after a match the wait starts again from zero', async ({ page }) => {
    const players = ['Ana', 'Ben', 'Cy', 'Dee']
    await setUpSession(page, { players })
    await checkIn(page, players)
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await finishMatch(page, 'Court 1', [
      [21, 10],
      [21, 11],
    ])
    for (const label of await queuePanel(page).getByLabel(/^waiting/).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))) {
      expect(label).toMatch(/^waiting 0:0\d$/)
    }
  })
})
