import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'
import { addPlayer, queuePanel, setUpSession } from '../support/session'

test.describe('"Already checked in" when adding players', () => {
  test('in setup, ticked players start in the queue; the rest wait to check in', async ({ page }) => {
    await setUpSession(page, {
      players: [
        { name: 'Ana', checkedIn: true },
        { name: 'Ben', checkedIn: false },
        { name: 'Cy', checkedIn: true },
        'Dee',
      ],
    })
    const queue = queuePanel(page)
    await expect(queue).toContainText('2 checked in and waiting')
    for (const name of ['Ben', 'Dee']) await expect(queue.getByRole('button', { name: `Check ${name} in` })).toBeVisible()
    for (const name of ['Ana', 'Cy']) await expect(queue.getByRole('button', { name: `Check ${name} in` })).toHaveCount(0)
  })

  test('in setup the box starts unticked; on the board it starts ticked', async ({ page }) => {
    await page.goto('/app')
    const setup = page.getByRole('dialog', { name: 'Set up your session' })
    await setup.getByRole('button', { name: 'Next' }).click()
    await expect(setup.getByRole('checkbox', { name: 'Already checked in' })).not.toBeChecked()
    await page.keyboard.press('Escape')

    await setUpSession(page, { players: ['Ana'] })
    await expect(page.locator('#main').getByRole('form', { name: 'Add a player' }).getByRole('checkbox', { name: 'Already checked in' })).toBeChecked()
  })

  test('a player added from the board with the box unticked waits to check in', async ({ page }) => {
    await setUpSession(page, { players: ['Ana'] })
    await addPlayer(page.locator('#main'), { name: 'Late Larry', checkedIn: false }, 'Add to queue')
    await pageReady(page)
    await expect(queuePanel(page).getByRole('button', { name: 'Check Late Larry in' })).toBeVisible()
  })

  test('Session settings can mark a waiting player as checked in, but not undo a check-in', async ({ page }) => {
    await setUpSession(page, { players: [{ name: 'Ana', checkedIn: true }, 'Ben'] })
    await page.getByRole('button', { name: 'Session settings' }).click()
    const settings = page.getByRole('dialog', { name: 'Session settings' })
    await settings.getByRole('button', { name: /Members/ }).click()
    await expect(settings.getByRole('checkbox', { name: 'Ana is already checked in' })).toBeDisabled()
    await settings.getByRole('checkbox', { name: 'Ben is already checked in' }).check()
    await settings.getByRole('button', { name: 'Save changes' }).click()
    await expect(settings).toBeHidden()
    await pageReady(page)
    await expect(queuePanel(page)).toContainText('2 checked in and waiting')
  })
})

test.describe('adding players and courts', () => {
  test('Add court sits on the same row as adding a player, and adds the next court', async ({ page }) => {
    await setUpSession(page, { players: ['Ana'] })
    const tools = page.locator('.board-tools')
    const addCourt = tools.getByRole('button', { name: 'Add court' })
    const addPlayerButton = tools.getByRole('form', { name: 'Add a player' }).getByRole('button', { name: 'Add to queue' })
    const [court, player] = await Promise.all([addCourt.boundingBox(), addPlayerButton.boundingBox()])
    // Same row: their vertical positions overlap.
    expect(Math.abs(court!.y - player!.y)).toBeLessThan(court!.height)
    // The queue panel has no add button any more.
    await expect(queuePanel(page).getByRole('button', { name: 'Add player' })).toHaveCount(0)

    await addCourt.click()
    await pageReady(page)
    await expect(page.getByRole('list', { name: 'Courts' }).getByText('Court 5', { exact: true })).toBeVisible()
  })

  test('the section collapses, and stays collapsed after a reload', async ({ page }) => {
    await setUpSession(page, { players: ['Ana'] })
    const form = page.locator('#main').getByRole('form', { name: 'Add a player' })
    await expect(form).toBeVisible()
    await page.getByRole('button', { name: 'Hide adding players and courts' }).click()
    await expect(form).toBeHidden()
    await expect(page.getByRole('button', { name: 'Add court' })).toBeHidden()

    await page.reload()
    await pageReady(page)
    await expect(page.getByRole('button', { name: 'Show adding players and courts' })).toBeVisible()
    await expect(form).toBeHidden()
    await page.getByRole('button', { name: 'Show adding players and courts' }).click()
    await expect(form).toBeVisible()
  })
})
