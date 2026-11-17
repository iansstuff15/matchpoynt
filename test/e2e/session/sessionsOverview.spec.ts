import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { finishSession, setUpSession } from '../support/session'

// The session board with no session open lists the running and previous sessions; nothing opens by itself.
test.describe('session board overview', () => {
  test('lists running and previous sessions, without any leaderboard, results or invoices', async ({ page }) => {
    // One finished session, then one running.
    await setUpSession(page, { players: ['Ana', 'Ben', 'Cy', 'Dee'] })
    await finishSession(page)
    await setUpSession(page, { players: ['Eli', 'Fay', 'Gus', 'Hal'] })
    const runningId = page.url().split('/').at(-1)!

    await gotoReady(page, '/app')
    await expect(page).toHaveURL('/app')
    const running = page.getByRole('list', { name: 'Running sessions' })
    await expect(running.getByRole('listitem')).toHaveCount(1)
    await expect(page.getByRole('list', { name: 'Previous sessions' }).getByRole('listitem')).toHaveCount(1)
    // No session's results on the board itself: those are on each session's page.
    const board = page.getByRole('region', { name: 'Session board' })
    await expect(board.getByRole('heading', { name: 'Recent results' })).toHaveCount(0)
    await expect(board.getByRole('table')).toHaveCount(0)
    await expect(board.getByText(/invoice/i)).toHaveCount(0)

    await running.getByRole('link', { name: /^Open the board of/ }).click()
    await pageReady(page)
    await expect(page).toHaveURL(`/app/${runningId}`)
  })

  test('with no sessions at all, it offers to set one up', async ({ page }) => {
    await gotoReady(page, '/app')
    await expect(page.getByText('No session yet')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Set up session' })).toBeVisible()
  })
})
