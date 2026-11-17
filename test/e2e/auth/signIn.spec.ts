import { expect, test } from '../support/mockApi'
import { gotoReady } from '../support/pageReady'

test.describe('sign in', () => {
  test('email then password, with "Forgot password?" and no emailed sign-in link', async ({ page, api }) => {
    api.state.features.web.signIn = true
    await gotoReady(page, '/sign-in')
    await page.getByLabel('Email or username', { exact: true }).fill('ana@example.com')
    await page.getByRole('button', { name: 'Continue' }).click()

    const form = page.getByRole('form', { name: 'Enter your password' })
    await expect(form.getByText('ana@example.com')).toBeVisible()
    await expect(form.getByLabel('Password', { exact: true })).toBeFocused()
    await expect(form.getByRole('link', { name: 'Forgot password?' })).toBeVisible()
    await expect(form.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByText(/sign-in link/i)).toHaveCount(0)
    expect(api.unhandled).toEqual([])
  })
  test("the password step shows whose account it is: their photo, name and @username", async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.accounts.set('maria@example.com', { username: 'maria.s', displayName: 'Maria Santos', avatarUrl: null })
    await gotoReady(page, '/sign-in')
    await page.getByLabel('Email or username', { exact: true }).fill('maria@example.com')
    await page.getByRole('button', { name: 'Continue' }).click()
    const form = page.getByRole('form', { name: 'Enter your password' })
    await expect(form.getByLabel('Signing in as @maria.s')).toContainText('Maria Santos')
    await expect(form).toContainText('@maria.s · maria@example.com')

    // An email without an account just shows the email.
    await form.getByRole('button', { name: 'Change' }).click()
    await page.getByLabel('Email or username', { exact: true }).fill('nobody@example.com')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('form', { name: 'Enter your password' }).getByLabel('Signing in as nobody@example.com')).toBeVisible()
  })
  test('a username works instead of the email', async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.accounts.set('maria@example.com', { username: 'maria.s', displayName: 'Maria Santos', avatarUrl: null })
    await gotoReady(page, '/sign-in')
    await page.getByLabel('Email or username', { exact: true }).fill('@maria.s')
    await page.getByRole('button', { name: 'Continue' }).click()
    const form = page.getByRole('form', { name: 'Enter your password' })
    await expect(form.getByLabel('Signing in as @maria.s')).toContainText('Maria Santos')
    // The email isn't shown to someone who only typed the username.
    await expect(form).not.toContainText('maria@example.com')
    await expect(form.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password')
  })
})
