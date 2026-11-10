import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'
import { checkIn, courtCard, finishMatch, openLeaderboard, openManagement, queuePanel, setUpSession, standing } from '../support/session'

const players = ['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fin', 'Gil', 'Hal']

test.describe('restarting and cancelling', () => {
  test.beforeEach(async ({ page }) => {
    await setUpSession(page, { players })
    await checkIn(page, players)
  })

  test("a court's match restarts from 0:00 with the same players", async ({ page }) => {
    const court = courtCard(page, 'Court 1')
    await court.getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    const sides = await court.getByRole('listitem').allInnerTexts()
    // Let the clock run, so a restart visibly sets it back.
    await expect(court.getByText(/^0:0[2-9]$/)).toBeVisible({ timeout: 15_000 })

    await court.getByRole('button', { name: 'Restart the match on Court 1' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Restart the match on Court 1?' })
    await confirm.getByRole('button', { name: 'Restart match' }).click()
    await expect(confirm).toBeHidden()
    await pageReady(page)

    await expect(court.getByText(/^0:0[01]$/)).toBeVisible()
    expect(await court.getByRole('listitem').allInnerTexts()).toEqual(sides)
    await expect(court.getByRole('button', { name: 'Finish match' })).toBeVisible()
  })

  test('cancelling the confirm leaves the match running', async ({ page }) => {
    const court = courtCard(page, 'Court 1')
    await court.getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await court.getByRole('button', { name: 'Restart the match on Court 1' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
    await expect(court.getByRole('button', { name: 'Finish match' })).toBeVisible()
  })

  test('cancelling a match records nothing: the players go back to the queue and the court opens', async ({ page }) => {
    const court = courtCard(page, 'Court 1')
    await court.getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await expect(queuePanel(page)).toContainText('4 checked in and waiting')

    await court.getByRole('button', { name: 'Cancel the match on Court 1' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Cancel the match on Court 1?' })
    await confirm.getByRole('button', { name: 'Keep playing' }).click()
    await expect(court.getByRole('button', { name: 'Finish match' })).toBeVisible()

    await court.getByRole('button', { name: 'Cancel the match on Court 1' }).click()
    await confirm.getByRole('button', { name: 'Cancel match' }).click()
    await expect(confirm).toBeHidden()
    await pageReady(page)
    await expect(court.getByRole('button', { name: 'Start next match' })).toBeVisible()
    await expect(queuePanel(page)).toContainText('8 checked in and waiting')
    await page.getByRole('tab', { name: 'Leaderboard' }).click()
    await pageReady(page)
    await expect(page.getByText('No results yet')).toBeVisible()
  })

  test('the session starts over: results cleared, courts open, everyone back in the queue', async ({ page }) => {
    // One result, and a match still on court.
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    const [winners] = await finishMatch(page, 'Court 1', [
      [21, 15],
      [21, 17],
    ])
    await courtCard(page, 'Court 2').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await openLeaderboard(page)
    await expect(standing(page, winners[0]!)).toContainText('1–0')
    await openManagement(page)

    await page.getByRole('button', { name: 'Start over' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Start this session over?' })
    await expect(confirm).toContainText("This can't be undone.")
    await confirm.getByRole('button', { name: 'Start over' }).click()
    await expect(confirm).toBeHidden()
    await pageReady(page)

    for (const label of ['Court 1', 'Court 2', 'Court 3', 'Court 4']) {
      await expect(courtCard(page, label).getByRole('button', { name: 'Finish match' })).toHaveCount(0)
    }
    // Everyone is still checked in and waiting.
    await expect(queuePanel(page)).toContainText('8 checked in and waiting')
    // The leaderboard is empty again (no podium to wait for).
    await page.getByRole('tab', { name: 'Leaderboard' }).click()
    await pageReady(page)
    await expect(page.getByText('No results yet')).toBeVisible()
  })
})

test.describe('removing courts', () => {
  test('an open court can be removed after a confirm; a playing court has no remove button', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben', 'Cy', 'Dee'] })
    await checkIn(page, ['Ana', 'Ben', 'Cy', 'Dee'])
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await expect(courtCard(page, 'Court 1').getByRole('button', { name: 'Remove Court 1' })).toHaveCount(0)

    await courtCard(page, 'Court 3').getByRole('button', { name: 'Remove Court 3' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Remove Court 3?' })
    await confirm.getByRole('button', { name: 'Remove court' }).click()
    await expect(confirm).toBeHidden()
    await pageReady(page)
    const courts = page.getByRole('list', { name: 'Courts' })
    await expect(courts.getByText('Court 3', { exact: true })).toHaveCount(0)
    for (const label of ['Court 1', 'Court 2', 'Court 4']) await expect(courts.getByText(label, { exact: true })).toBeVisible()
  })

  test('the last court stays, and its button says why', async ({ page }) => {
    await setUpSession(page, { players: ['Ana'] })
    for (const label of ['Court 4', 'Court 3', 'Court 2']) {
      await courtCard(page, label).getByRole('button', { name: `Remove ${label}` }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Remove court' }).click()
      await pageReady(page)
    }
    const last = courtCard(page, 'Court 1').getByRole('button', { name: 'Remove Court 1' })
    await expect(last).toBeDisabled()
    await expect(last).toHaveAttribute('title', 'A session needs at least one court.')
  })
})
