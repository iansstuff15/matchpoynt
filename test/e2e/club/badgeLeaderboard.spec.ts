import { createBadge } from '../support/badges'
import { createClub, openClubPage } from '../support/club'
import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { checkIn, courtCard, finishMatch, openLeaderboard, setUpSession, standing } from '../support/session'

const players = ['Ana', 'Ben', 'Cy', 'Dee']

test.describe('club badges on the leaderboard', () => {
  test('players earn the club\'s badges, and members show their career badges', async ({ page, api }) => {
    // The club, its badges, and a member who will play.
    await createClub(page, 'Northside Rally')
    const clubId = api.clubs.idOf('Northside Rally')
    await createBadge(page, { name: 'First Blood', conditions: [{ metric: 'Wins', min: 1 }], icon: { search: 'smash', pick: 'Smash GIF' } })
    await createBadge(page, { name: 'Club Winner', scope: 'Across all club sessions', conditions: [{ metric: 'Wins', min: 1 }], icon: { search: 'crown', pick: 'Crown GIF' } })
    await openClubPage(page, 'Members')
    for (const name of players) {
      await page.getByRole('button', { name: 'Add member' }).click()
      const add = page.getByRole('dialog', { name: 'Add a member' })
      await add.getByLabel('Name').fill(name)
      await add.getByRole('button', { name: 'Add member' }).click()
      await expect(add).toBeHidden()
      await pageReady(page)
    }

    // A session the club runs (as when one of its planned sessions starts), and one match.
    await setUpSession(page, { players })
    api.sessions.assignClub(api.sessions.latestId(), clubId)
    await checkIn(page, players)
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    const [winners, losers] = await finishMatch(page, 'Court 1', [
      [21, 12],
      [21, 9],
    ])

    // Winners carry both badges on the leaderboard.
    await openLeaderboard(page)
    for (const name of winners) {
      await expect(standing(page, name)).toContainText('First Blood')
      await expect(standing(page, name)).toContainText('Club Winner')
    }
    for (const name of losers) await expect(standing(page, name)).not.toContainText('First Blood')

    // On the club's Members tab, the winners now show their career badge (matched by name).
    await gotoReady(page, `/clubs/${clubId}/members`)
    for (const name of winners) await expect(page.getByLabel(`${name}'s club badges`)).toBeVisible()
    for (const name of losers) await expect(page.getByLabel(`${name}'s club badges`)).toHaveCount(0)
  })
})
