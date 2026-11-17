import { appNav } from '../support/appShell'
import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

const person = (userId: string, username: string) => ({ userId, username, displayName: username, email: `${username}@example.com`, avatarUrl: null, avatarPosition: { x: 50, y: 50, zoom: 1 } })

// Friends: anyone signed in (players, members, club owners) adds people and answers requests.
test.describe('friends', () => {
  test.beforeEach(({ api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
  })

  test('find someone and ask them to be friends, then cancel it', async ({ page, api }) => {
    api.clubs.people.push(person('u-ben', 'ben.lim'))
    await gotoReady(page, '/app')
    await appNav(page).getByRole('link', { name: 'Friends' }).click()
    await expect(page).toHaveURL('/friends')
    await pageReady(page)
    await expect(page.getByText('No friends yet. Search for people to add them.')).toBeVisible()

    await page.getByLabel('Search people').fill('ben')
    await page.getByRole('button', { name: 'Add @ben.lim as a friend' }).click()
    await pageReady(page)
    await expect(page.getByRole('list', { name: 'People found' })).toContainText('Asked')
    const sent = page.getByRole('list', { name: 'Requests you sent' })
    await expect(sent).toContainText('ben.lim')

    await sent.getByRole('button', { name: 'Cancel your request to @ben.lim' }).click()
    await pageReady(page)
    await expect(page.getByRole('list', { name: 'Requests you sent' })).toHaveCount(0)
  })

  test('accept a request, then remove the friend', async ({ page, api }) => {
    api.community.requestFrom(person('u-cy', 'cy.tan'))
    await gotoReady(page, '/friends')
    await expect(page.getByText('1 waiting for your answer.')).toBeVisible()
    await page.getByRole('list', { name: 'Requests to answer' }).getByRole('button', { name: 'Accept @cy.tan' }).click()
    await pageReady(page)
    const friends = page.getByRole('list', { name: 'Your friends' })
    await expect(friends).toContainText('cy.tan')

    await friends.getByRole('button', { name: 'Remove @cy.tan' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove friend' }).click()
    await pageReady(page)
    await expect(page.getByRole('list', { name: 'Your friends' })).toHaveCount(0)
  })

  test("open someone's profile from the friend search and add them from it", async ({ page, api }) => {
    api.clubs.people.push(person('u-dee', 'dee.santos'))
    api.community.setProfile('u-dee', {
      city: 'Quezon City',
      sports: [{ sportId: 'badminton', tierId: 'intermediate' }],
      clubs: [{ id: 'k-1', name: 'Westside Smashers', handle: 'westside', avatarUrl: null, avatarPosition: { x: 50, y: 50, zoom: 1 } }],
    })
    await gotoReady(page, '/friends')
    await page.getByLabel('Search people').fill('dee')
    await page.getByRole('link', { name: "View @dee.santos's profile" }).click()
    await expect(page).toHaveURL('/u/dee.santos')
    await pageReady(page)
    await expect(page.getByRole('heading', { name: '@dee.santos', level: 1 })).toBeVisible()
    await expect(page.getByText('Quezon City')).toBeVisible()
    await expect(page.getByRole('list', { name: "@dee.santos's clubs" })).toContainText('Westside Smashers')

    await page.getByRole('button', { name: 'Add @dee.santos as a friend' }).click()
    await pageReady(page)
    await expect(page.getByRole('button', { name: 'Cancel your friend request to @dee.santos' })).toBeVisible()
  })

  test('an unknown username says so, and your own profile links to your profile page', async ({ page }) => {
    await gotoReady(page, '/u/nobody.here')
    await expect(page.getByRole('alert')).toContainText("There's nobody on Matchpoynt with that username.")
    await gotoReady(page, '/u/ana.reyes')
    await expect(page.getByRole('main').getByRole('link', { name: 'Your profile' })).toBeVisible()
  })
})
