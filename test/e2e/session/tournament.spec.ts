import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'
import { checkIn, courtCard, finishMatch, openManagement, queuePanel, setUpSession } from '../support/session'
import { startDueMatch, startTournament } from '../support/tournament'

const players = ['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fin', 'Gil', 'Hal']
const win: [number, number][] = [
  [21, 15],
  [21, 17],
]

test.describe('tournaments', () => {
  test.beforeEach(async ({ page }) => {
    await setUpSession(page, { players })
    await checkIn(page, players)
  })

  test('a single-elimination tournament plays through to its champion', async ({ page }) => {
    await startTournament(page, 'Court 1', { name: 'Club Cup' })

    // Competitors sit out open play: nobody is left waiting in the queue.
    await expect(queuePanel(page)).toContainText('0 checked in and waiting')
    await expect(queuePanel(page).getByRole('heading', { name: /Tournament · 8 competing/ })).toBeVisible()

    // Four doubles teams: two semifinals, then the final, all on Court 1.
    for (const label of ['Semifinal 1', 'Semifinal 2', 'Final']) {
      await startDueMatch(page, 'Court 1', label)
      await finishMatch(page, 'Court 1', win)
    }

    await page.getByRole('tab', { name: 'Tournament' }).click()
    await pageReady(page)
    await expect(page.getByRole('region', { name: 'Champion' })).toContainText('Club Cup champion')

    // Once it's over, everyone is back in open play.
    await openManagement(page)
    await expect(queuePanel(page)).toContainText('8 checked in and waiting')
  })

  test('the Tournament tab starts the next match from "Up next"', async ({ page }) => {
    await startTournament(page, 'Court 1', { name: 'Tab Cup' })
    await page.getByRole('tab', { name: 'Tournament' }).click()
    await pageReady(page)
    const upNext = page.getByRole('region', { name: 'Up next' })
    await upNext.getByRole('button', { name: 'Start' }).first().click()
    await pageReady(page)
    await expect(page.getByRole('region', { name: 'On court now' })).toBeVisible()
  })

  test('competitors are ticked on the board: pairs join, an odd count is refused, and it locks once play starts', async ({ page }) => {
    await startTournament(page, 'Court 1', { name: 'Open Cup', leaveOut: ['Gil', 'Hal'] })
    const section = queuePanel(page).getByRole('list', { name: 'Tournament competitors' })
    await expect(queuePanel(page).getByRole('heading', { name: /6 competing/ })).toBeVisible()
    await expect(queuePanel(page)).toContainText('2 checked in and waiting')

    // One more player can't make a doubles team: the API says what to do.
    await section.getByRole('checkbox', { name: 'Gil is competing' }).check()
    await queuePanel(page).getByRole('button', { name: 'Update tournament (7)' }).click()
    await pageReady(page)
    await expect(page.getByRole('alert').filter({ hasText: "7 players don't split into teams of 2. Add 1 or leave out 1." })).toBeVisible()

    // With a partner, the draw is made again with both of them.
    await section.getByRole('checkbox', { name: 'Gil is competing' }).check()
    await section.getByRole('checkbox', { name: 'Hal is competing' }).check()
    await queuePanel(page).getByRole('button', { name: 'Update tournament (8)' }).click()
    await pageReady(page)
    await expect(queuePanel(page).getByRole('heading', { name: /8 competing/ })).toBeVisible()
    await expect(queuePanel(page)).toContainText('0 checked in and waiting')

    // After the first match starts, the draw can't change: the checkboxes lock and say why.
    await startDueMatch(page, 'Court 1', 'Semifinal 1')
    await expect(section.getByRole('checkbox').first()).toBeDisabled()
    await expect(queuePanel(page)).toContainText('The tournament has started')
  })

  test('a cancelled tournament match waits for a court again', async ({ page }) => {
    await startTournament(page, 'Court 1', { name: 'Cancel Cup' })
    await startDueMatch(page, 'Court 1', 'Semifinal 1')
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Cancel the match on Court 1' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel match' }).click()
    await pageReady(page)
    await expect(courtCard(page, 'Court 1').getByRole('button', { name: 'Start Semifinal 1' })).toBeVisible()
    // Nothing was played, so the competitors can still change.
    await expect(queuePanel(page).getByRole('list', { name: 'Tournament competitors' }).getByRole('checkbox').first()).toBeEnabled()
  })

  test('restarting a tournament match clears its score as well as its clock', async ({ page }) => {
    await startTournament(page, 'Court 1', { name: 'Restart Cup' })
    await startDueMatch(page, 'Court 1', 'Semifinal 1')
    const court = courtCard(page, 'Court 1')

    // A half-entered score…
    await court.getByRole('button', { name: 'Finish match' }).click()
    const dialog = page.getByRole('dialog', { name: 'Finish match on Court 1' })
    await dialog.getByRole('textbox').first().fill('11')
    await page.keyboard.press('Escape')

    // …is gone after a restart.
    await court.getByRole('button', { name: 'Restart the match on Court 1' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Restart the match on Court 1?' })
    await expect(confirm).toContainText('the score goes back to 0–0')
    await confirm.getByRole('button', { name: 'Restart match' }).click()
    await pageReady(page)
    await court.getByRole('button', { name: 'Finish match' }).click()
    await expect(dialog.getByRole('textbox').first()).toHaveValue('')
    // A tournament match needs a result: there's no "Finish without score".
    await expect(dialog.getByRole('button', { name: 'Finish without score' })).toHaveCount(0)
  })
})

test.describe('toasts', () => {
  test('are coloured by kind, from the theme', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben'] })
    await checkIn(page, ['Ana'])
    const success = page.locator('[data-sonner-toast][data-type="success"]').first()
    await expect(success).toBeVisible()
    const colours = await success.evaluate((el) => {
      const probe = document.createElement('div')
      probe.className = 'bg-popover'
      document.body.append(probe)
      const plain = getComputedStyle(probe).backgroundColor
      probe.remove()
      return { toast: getComputedStyle(el).backgroundColor, plain, rich: el.getAttribute('data-rich-colors') }
    })
    expect(colours.rich).toBe('true')
    expect(colours.toast).not.toBe(colours.plain)
  })
})
