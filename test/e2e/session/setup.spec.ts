import { expect, test } from '../support/mockApi'
import { courtCard, queuePanel, setUpSession } from '../support/session'

test.describe('setting up a session', () => {
  test('walks the five steps and opens the new board', async ({ page, api }) => {
    await setUpSession(page, { players: ['Ana', 'Ben', 'Cy', 'Dee'] })

    await expect(page.getByRole('heading', { level: 1, name: 'Session board' })).toBeVisible()
    for (const court of ['Court 1', 'Court 2', 'Court 3', 'Court 4']) await expect(courtCard(page, court)).toBeVisible()

    // Roster players start not checked in: none is matched until they arrive.
    for (const name of ['Ana', 'Ben', 'Cy', 'Dee']) {
      await expect(queuePanel(page).getByRole('button', { name: `Check ${name} in` })).toBeVisible()
    }
    await expect(courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' })).toBeDisabled()
    expect(api.unhandled).toEqual([])
  })

  test('the sidebar lists the running session', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben'] })
    await page.getByRole('button', { name: 'Switch session' }).first().click()
    await expect(page.getByRole('menuitem', { name: /Badminton session/ })).toBeVisible()
  })
})
