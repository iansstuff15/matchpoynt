import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { checkIn, courtCard, finishMatch, finishSession, setUpSession } from '../support/session'

test.describe('deleting a session', () => {
  test('a running session is deleted from its board, after a confirm', async ({ page, api }) => {
    await setUpSession(page, { players: ['Ana', 'Ben'] })
    const id = api.sessions.latestId()

    await page.getByRole('button', { name: 'Delete session' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Delete Badminton session?' })
    await expect(confirm).toContainText('To keep the results, finish the session instead.')
    await confirm.getByRole('button', { name: 'Keep session' }).click()
    await expect(page).toHaveURL(`/app/${id}`)

    await page.getByRole('button', { name: 'Delete session' }).click()
    await confirm.getByRole('button', { name: 'Delete session' }).click()
    // With nothing else running or finished, the board offers to set up a new session.
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByText('No session yet')).toBeVisible()
    await expect(page.locator('#main').getByText('0 running')).toBeVisible()

    // Its link no longer opens it.
    await gotoReady(page, `/app/${id}`)
    await expect(page.getByRole('alert')).toContainText('Session not found')
  })

  test('deleting one session leaves the others running', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben'] })
    await setUpSession(page, { players: ['Cy'] })
    await expect(page.locator('#main').getByText('2 running')).toBeVisible()

    await page.getByRole('button', { name: 'Delete session' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete session' }).click()
    await pageReady(page)
    // The other session's board opens.
    await expect(page).toHaveURL(/\/app\/[0-9a-f-]{36}$/)
    await expect(page.locator('#main').getByText('1 running')).toBeVisible()
  })

  test('a finished session is deleted from its page, and from Past sessions', async ({ page }) => {
    const players = ['Ana', 'Ben', 'Cy', 'Dee']
    await setUpSession(page, { players })
    await checkIn(page, players)
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await finishMatch(page, 'Court 1', [
      [21, 9],
      [21, 8],
    ])
    await finishSession(page)

    // A second finished session, to delete from the list.
    await setUpSession(page, { players: ['Eve'] })
    await finishSession(page)

    await gotoReady(page, '/app/past')
    const cards = page.getByRole('list', { name: 'Finished sessions' }).getByRole('listitem')
    await expect(cards).toHaveCount(2)
    await cards.nth(0).getByRole('button', { name: /^Delete / }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete session' }).click()
    await pageReady(page)
    await expect(cards).toHaveCount(1)

    // The remaining one, from its own page.
    await cards.nth(0).getByRole('link', { name: /See the leaderboard/ }).click()
    await pageReady(page)
    await expect(page.getByText('These are the final standings.')).toBeVisible()
    await page.getByRole('button', { name: 'Delete session' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete session' }).click()
    await expect(page).toHaveURL('/app/past')
    await pageReady(page)
    await expect(page.getByText('No finished sessions yet')).toBeVisible()
  })
})
