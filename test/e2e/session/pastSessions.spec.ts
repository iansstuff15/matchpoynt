import { appNav } from '../support/appShell'
import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { checkIn, courtCard, finishMatch, finishSession, setUpSession, standing } from '../support/session'

const players = ['Ana', 'Ben', 'Cy', 'Dee']

test.describe('past sessions', () => {
  test('a finished session keeps its leaderboard, reachable from Past sessions after newer sessions', async ({ page }) => {
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
    for (const step of ['Courts', 'Members', 'Scoring', 'Rules']) {
      await expect(dialog.getByRole('heading', { name: step })).toBeVisible()
      await dialog.getByRole('button', { name: 'Next' }).click()
    }
    await dialog.getByRole('button', { name: 'Start session' }).click()
    await expect(page).toHaveURL(/\/app\/[0-9a-f-]{36}$/)
    await pageReady(page)
    await finishSession(page)

    // Past sessions lists both, newest first; the sidebar highlights only Past sessions.
    await appNav(page).getByRole('link', { name: 'Past sessions' }).click()
    await expect(page).toHaveURL('/app/past')
    await pageReady(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Past sessions' })).toBeVisible()
    await expect(appNav(page).getByRole('link', { name: 'Past sessions' })).toHaveAttribute('aria-current', 'page')
    await expect(appNav(page).getByRole('link', { name: 'Session board' })).not.toHaveAttribute('aria-current', 'page')
    const cards = page.getByRole('list', { name: 'Finished sessions' }).getByRole('listitem')
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

  test('with nothing finished yet, the page says so and links to the board', async ({ page }) => {
    await gotoReady(page, '/app/past')
    await expect(page.getByText('No finished sessions yet')).toBeVisible()
    await page.getByRole('link', { name: 'Go to the board' }).click()
    await expect(page).toHaveURL('/app')
  })

  test('the session switcher links to Past sessions', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben'] })
    await page.getByRole('button', { name: 'Switch session' }).first().click()
    await page.getByRole('menuitem', { name: 'Past sessions' }).click()
    await expect(page).toHaveURL('/app/past')
  })
})
