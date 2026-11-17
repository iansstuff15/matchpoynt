import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

// Where Firebase's emailed links land once the API has used them, and changing the sign-in email.
test.describe('email links and changing your email', () => {
  test.beforeEach(({ api }) => {
    api.state.features.web.signIn = true
  })

  test('an expired reset link says so and offers a new one', async ({ page }) => {
    await gotoReady(page, '/auth/link-error?reason=expired&mode=resetPassword')
    await expect(page.getByRole('heading', { name: 'This link has expired' })).toBeVisible()
    await expect(page.getByText('this one to reset your password has run out or was already used')).toBeVisible()
    await page.getByRole('link', { name: 'Send a new reset link' }).click()
    await expect(page).toHaveURL('/forgot-password')
  })

  test("an invite's broken link says to ask the club, and an unknown link goes back to sign in", async ({ page }) => {
    await gotoReady(page, '/auth/link-error?reason=invalid&mode=signIn')
    await expect(page.getByRole('heading', { name: "This link isn't working" })).toBeVisible()
    await expect(page.getByText('Ask the club to send you a new invite.')).toBeVisible()
    await gotoReady(page, '/auth/link-error?reason=invalid')
    await expect(page.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/sign-in')
  })

  test('a confirmed email goes on to sign in', async ({ page }) => {
    await gotoReady(page, '/auth/email-confirmed?next=%2Fexplore')
    await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in?confirmed=1&next=%2Fexplore')
  })

  test('after a change, and after undoing one, sign in again with the email filled in', async ({ page }) => {
    await gotoReady(page, '/auth/email-changed?email=ana.new%40example.com')
    await expect(page.getByText('You now sign in with ana.new@example.com.')).toBeVisible()
    await page.getByRole('link', { name: 'Sign in' }).click()
    await pageReady(page)
    await expect(page.getByLabel('Email or username', { exact: true })).toHaveValue('ana.new@example.com')

    await gotoReady(page, '/auth/email-restored?email=ana%40example.com')
    await expect(page.getByRole('heading', { name: 'Change undone' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Choose a new password' })).toHaveAttribute('href', '/forgot-password?email=ana%40example.com')
  })

  test('changing your email sends a link to the new one, from your profile settings', async ({ page, api }) => {
    api.profile.signIn('ana@example.com')
    await gotoReady(page, '/profile')
    await page.getByRole('button', { name: 'Profile settings' }).click()
    await page.getByRole('button', { name: /Account$/ }).click()
    await page.getByRole('link', { name: 'Change your email' }).click()
    await expect(page).toHaveURL('/account/email')
    await pageReady(page)
    await expect(page.getByText('You sign in with ana@example.com.')).toBeVisible()

    // The same email is refused, with the API's reason.
    await page.getByLabel('New email').fill('ana@example.com')
    await page.getByRole('button', { name: 'Send the link' }).click()
    await expect(page.getByRole('alert')).toContainText('That is already your sign-in email.')

    await page.getByLabel('New email').fill('ana.new@example.com')
    await page.getByRole('button', { name: 'Send the link' }).click()
    await pageReady(page)
    await expect(page.getByRole('status').filter({ hasText: 'Check ana.new@example.com' })).toBeVisible()
    expect(api.profile.emailChanges).toEqual(['ana.new@example.com'])
  })
})
