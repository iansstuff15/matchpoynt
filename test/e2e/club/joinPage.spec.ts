import { randomUUID } from 'node:crypto'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

// The club QR's page: the club's cover behind one card that signs in or up, fills in what's missing, then joins.
test.describe('club join page', () => {
  test.beforeEach(async ({ api }) => {
    api.state.features.web.signIn = true
    api.clubs.seed(club(randomUUID(), 'Lakeside', { handle: 'lakeside', description: 'Thursday smash nights.' }), { mine: false, members: ['Ben'] })
  })

  test('signed out, it offers sign in, sign up and Google, coming back to the join page', async ({ page }) => {
    await gotoReady(page, '/join/lakeside')
    await expect(page.getByRole('heading', { level: 1, name: 'Lakeside' })).toBeVisible()
    await expect(page.getByText('Sign in to join')).toBeVisible()
    await expect(page.getByText('1 member')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Email or username' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute('href', '/api/auth/oauth/google?next=%2Fjoin%2Flakeside')

    await page.getByRole('tab', { name: 'Create account' }).click()
    // Mandatory fields first: Next stays off until the account step is filled in.
    const next = page.getByRole('button', { name: 'Next' })
    await expect(next).toBeDisabled()
    await expect(page.getByRole('status').filter({ hasText: 'Enter your email address.' })).toBeVisible()
  })

  test('signed in with details missing, it asks for them on the card, then asks the club', async ({ page, api }) => {
    api.profile.signIn('ana@example.com', { username: null, displayName: null })
    await gotoReady(page, '/join/lakeside')
    await expect(page.getByText("You're invited to join")).toBeVisible()
    const next = page.getByRole('button', { name: 'Next' })
    await expect(next).toBeDisabled()
    await expect(page.getByRole('status').filter({ hasText: 'Pick a username.' })).toBeVisible()
    await page.getByLabel('Username').fill('ana.reyes')
    await expect(page.getByRole('status').filter({ hasText: '@ana.reyes is available' })).toBeVisible()
    while (await next.isVisible()) await next.click()
    await page.getByRole('button', { name: 'Save profile' }).click()
    await pageReady(page)

    await page.getByRole('button', { name: 'Ask to join Lakeside' }).click()
    await pageReady(page)
    await expect(page.getByRole('status').filter({ hasText: 'Request sent.' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open the club' })).toHaveAttribute('href', '/c/lakeside')
  })

  test('with automatic approval it joins at once and shows the welcome', async ({ page, api }) => {
    api.clubs.seed(
      club(randomUUID(), 'Open Court', { handle: 'opencourt', joining: { approval: 'auto', welcomeMessage: 'See you Saturday!', welcomeLinks: [] } }),
      { mine: false },
    )
    api.profile.signIn('ana@example.com')
    await gotoReady(page, '/join/opencourt')
    await page.getByRole('button', { name: 'Join Open Court' }).click()
    await pageReady(page)
    await expect(page.getByRole('status').filter({ hasText: 'You joined Open Court' })).toContainText('See you Saturday!')
  })

  test('an unknown handle says so', async ({ page }) => {
    await gotoReady(page, '/join/nobodyhere')
    await expect(page.getByRole('heading', { name: "Couldn't open this invite" })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('No club has that handle.')
  })
})
