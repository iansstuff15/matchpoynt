import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'
import { checkIn, courtCard, setUpSession, setupDialog } from '../support/session'

const players = ['Ana', 'Ben', 'Cy', 'Dee']

test.describe('session settings', () => {
  test('manual queueing makes the Queue Master place every player', async ({ page }) => {
    await setUpSession(page, { players })
    await checkIn(page, players)

    const queueing = page.getByRole('switch', { name: 'Automatic queueing' })
    await expect(queueing).toBeChecked()
    await queueing.click()
    await pageReady(page)
    await expect(queueing).not.toBeChecked()

    // Nothing is picked for an empty court any more: the API says why it can't start.
    const court = courtCard(page, 'Court 1')
    await expect(court.getByRole('button', { name: 'Start match' })).toBeDisabled()
    await expect(court.locator('.court-reason')).not.toBeEmpty()

    await queueing.click()
    await pageReady(page)
    await expect(court.getByRole('button', { name: 'Start next match' })).toBeEnabled()
  })

  test('turning on auto-fill in Session settings starts matches on its own', async ({ page }) => {
    await setUpSession(page, { players })

    await page.getByRole('button', { name: 'Session settings' }).click()
    const dialog = setupDialog(page, 'Session settings')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: /Rules/ }).click()
    await dialog.getByLabel('Fill courts automatically').check()
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()
    await pageReady(page)

    // Once enough players have arrived, a court fills without anyone pressing Start.
    await checkIn(page, players)
    await expect(courtCard(page, 'Court 1').getByRole('button', { name: 'Finish match' })).toBeVisible()
  })

  test('a setup started with auto-fill fills a court as players check in', async ({ page }) => {
    await setUpSession(page, { players, autoFill: true })
    await checkIn(page, players)
    await expect(courtCard(page, 'Court 1').getByRole('button', { name: 'Finish match' })).toBeVisible()
  })
})
