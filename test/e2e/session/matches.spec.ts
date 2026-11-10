import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'
import { checkIn, courtCard, finishMatch, openLeaderboard, openManagement, setUpSession, standing } from '../support/session'

const players = ['Ana', 'Ben', 'Cy', 'Dee']

test.describe('running matches and the leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await setUpSession(page, { players })
    await checkIn(page, players)
  })

  test('a finished match puts its winners on top of the leaderboard', async ({ page }) => {
    const court = courtCard(page, 'Court 1')
    await court.getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await expect(court.getByRole('button', { name: 'Finish match' })).toBeVisible()

    const [winners, losers] = await finishMatch(page, 'Court 1', [
      [21, 15],
      [21, 17],
    ])
    await expect(court.getByRole('button', { name: 'Start next match' })).toBeVisible()

    await openLeaderboard(page)
    for (const name of winners) await expect(standing(page, name)).toContainText('1–0')
    for (const name of losers) await expect(standing(page, name)).toContainText('0–1')
    // No banner above the podium any more.
    await expect(page.getByRole('region', { name: 'Leaderboard spotlight' })).toHaveCount(0)
    const top = page.getByRole('list', { name: 'Top three' })
    await expect(top.getByRole('listitem', { name: new RegExp(`^Place 1: (${winners.join('|')})$`) })).toBeVisible()
  })

  test('the leaderboard updates after every match', async ({ page }) => {
    // Best of 3 by default: a side needs two games.
    const first = await finishAfterStart(page, [
      [21, 10],
      [21, 12],
    ])
    await openLeaderboard(page)
    for (const name of first[0]) await expect(standing(page, name)).toContainText('1–0')

    await openManagement(page)
    const second = await finishAfterStart(page, [
      [12, 21],
      [15, 21],
    ])
    await openLeaderboard(page)

    // Every player's record is the sum of both results.
    for (const name of players) {
      const wins = Number(first[0].includes(name)) + Number(second[1].includes(name))
      const losses = 2 - wins
      await expect(standing(page, name)).toContainText(`${wins}–${losses}`)
    }
    await expect(page.getByText('No score')).toHaveCount(0)
  })
})

async function finishAfterStart(page: import('@playwright/test').Page, games: [number, number][]) {
  const court = courtCard(page, 'Court 1')
  await court.getByRole('button', { name: 'Start next match' }).click()
  await pageReady(page)
  return finishMatch(page, 'Court 1', games)
}
