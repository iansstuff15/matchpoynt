import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'
import { addPlayer, checkIn, queuePanel, setUpSession } from '../support/session'

test.describe('managing players', () => {
  test.beforeEach(async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben', 'Cy', 'Dee'] })
  })

  test('checking players in moves them into the queue', async ({ page }) => {
    await checkIn(page, ['Ana', 'Ben'])
    const queue = queuePanel(page).getByRole('scrollbar').or(queuePanel(page))
    await expect(queue.getByText('Ana', { exact: true })).toBeVisible()
    await expect(queue.getByText('Ben', { exact: true })).toBeVisible()
    // Still to check in.
    await expect(queuePanel(page).getByRole('button', { name: 'Check Cy in' })).toBeVisible()
    await expect(queuePanel(page).getByRole('button', { name: 'Check Dee in' })).toBeVisible()
  })

  test('a late arrival added from the board joins the queue checked in', async ({ page }) => {
    await addPlayer(page.locator('#main'), 'Eve', 'Add to queue')
    await pageReady(page)
    await expect(queuePanel(page).getByText('Eve', { exact: true })).toBeVisible()
    await expect(queuePanel(page).getByRole('button', { name: 'Check Eve in' })).toHaveCount(0)
    await expect(queuePanel(page).getByRole('button', { name: 'Remove Eve from the session' })).toBeVisible()
  })

  test('removing a player takes them off the session', async ({ page }) => {
    await checkIn(page, ['Ana'])
    await queuePanel(page).getByRole('button', { name: 'Remove Ana from the session' }).click()
    await pageReady(page)
    await expect(queuePanel(page).getByText('Ana', { exact: true })).toHaveCount(0)

    await queuePanel(page).getByRole('button', { name: 'Remove Dee from the session' }).click()
    await pageReady(page)
    await expect(queuePanel(page).getByRole('button', { name: 'Check Dee in' })).toHaveCount(0)
  })

})
