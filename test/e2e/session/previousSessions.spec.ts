import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { checkIn, courtCard, finishMatch, finishSession, setUpSession, standing } from '../support/session'

const players = ['Ana', 'Ben', 'Cy', 'Dee']

test.describe('previous sessions on the session board', () => {
  test('a finished session keeps its leaderboard, listed on the session board after newer sessions', async ({ page }) => {
    // A session with one result, then finished.
    await setUpSession(page, { players })
    const firstId = page.url().split('/').at(-1)!
    await checkIn(page, players)
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    const [winners, losers] = await finishMatch(page, 'Court 1', [
      [21, 11],
      [21, 13],
    ])
    await finishSession(page)

    // A newer session starts and finishes, so the first is no longer the latest.
    await gotoReady(page, '/app?new=1')
    const dialog = page.getByRole('dialog', { name: 'Set up your session' })
    await expect(dialog).toBeVisible()
    for (const step of ['Courts', 'Members', 'Scoring', 'Rules', 'Matchmaking']) {
      await expect(dialog.getByRole('heading', { name: step })).toBeVisible()
      await dialog.getByRole('button', { name: 'Next' }).click()
    }
    await dialog.getByRole('button', { name: 'Start session' }).click()
    await expect(page).toHaveURL(/\/app\/[0-9a-f-]{36}$/)
    await pageReady(page)
    await finishSession(page)

    // The session board lists both, newest first, and nothing opens by itself.
    await gotoReady(page, '/app')
    await expect(page).toHaveURL('/app')
    const cards = page.getByRole('list', { name: 'Previous sessions' }).getByRole('listitem')
    await expect(cards).toHaveCount(2)
    await expect(cards.nth(1)).toContainText('1 match · 4 players')
    await expect(cards.nth(0)).toContainText('0 matches · 0 players')

    // The older one opens its own page with the final standings.
    await cards.nth(1).getByRole('link', { name: /See the leaderboard/ }).click()
    await expect(page).toHaveURL(`/app/${firstId}`)
    await pageReady(page)
    await expect(page.getByText('These are the final standings.')).toBeVisible()
    for (const name of winners) await expect(standing(page, name)).toContainText('1–0')
    for (const name of losers) await expect(standing(page, name)).toContainText('0–1')
  })

  test('old Past sessions links land on the session board', async ({ page }) => {
    await gotoReady(page, '/app/past')
    await expect(page).toHaveURL('/app')
    await expect(page.getByText('No session yet')).toBeVisible()
  })

  test('the session switcher leads back to all sessions', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben'] })
    await page.getByRole('button', { name: 'Switch session' }).first().click()
    await page.getByRole('menuitem', { name: 'All sessions' }).click()
    await expect(page).toHaveURL('/app')
  })
})
