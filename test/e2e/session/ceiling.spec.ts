import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { checkIn, courtCard, finishMatch, setupDialog } from '../support/session'

test.describe('race to the ceiling', () => {
  test('a race to 31 is picked as a scoring format, and the API holds the game to it', async ({ page }) => {
    await gotoReady(page, '/app?new=1')
    const dialog = setupDialog(page)
    await dialog.getByRole('button', { name: 'Next' }).click()
    for (const name of ['Ana', 'Ben', 'Cy', 'Dee']) {
      const form = dialog.getByRole('form', { name: 'Add a player' })
      await form.getByLabel('Player name').fill(name)
      await form.getByRole('button', { name: 'Add player' }).click()
      await expect(dialog.getByRole('button', { name: `Remove ${name}` })).toBeAttached()
    }
    await dialog.getByRole('button', { name: 'Next' }).click()

    // Racing to a ceiling is its own choice, apart from the 21-point formats: one game to 30, 31 or 35.
    await expect(dialog.getByRole('heading', { name: 'Scoring' })).toBeVisible()
    await expect(dialog.getByRole('radio', { name: /^21 points, best of 3/ })).toBeChecked()
    const group = dialog.getByRole('group', { name: 'Race to the ceiling' })
    await expect(group.getByRole('radio')).toHaveCount(3)
    await expect(group).toContainText('no deuce')
    await group.getByRole('radio', { name: 'Race to 31' }).check()
    await dialog.getByRole('button', { name: /Step 6: Fees/ }).click()
    await dialog.getByRole('button', { name: 'Start session' }).click()
    await expect(page).toHaveURL(/\/app\/[0-9a-f-]{36}$/)
    await pageReady(page)
    await expect(page.getByRole('list', { name: 'Session settings' })).toContainText('Race to 31')

    await checkIn(page, ['Ana', 'Ben', 'Cy', 'Dee'])
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)

    // 32–30 would be past the ceiling.
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Finish match' }).click()
    const finish = page.getByRole('dialog', { name: 'Finish match on Court 1' })
    const headers = finish.getByRole('columnheader')
    const sides = [await headers.nth(1).innerText(), await headers.nth(2).innerText()]
    await finish.getByLabel(`Game 1, ${sides[0]} points`).fill('32')
    await finish.getByLabel(`Game 1, ${sides[1]} points`).fill('30')
    await finish.getByRole('button', { name: 'Save result' }).click()
    await expect(finish.getByRole('alert')).toContainText("Game 1: 32–30 isn't a valid score (first to 31).")
    await page.keyboard.press('Escape')

    // 31–30 wins: there's no deuce in a race.
    await finishMatch(page, 'Court 1', [[31, 30]])
    await expect(courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' })).toBeVisible()
  })
})
