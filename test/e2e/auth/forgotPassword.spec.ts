import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

// Forgot password: from the sign-in form's password step, by email or username, then "Check your inbox".
test.describe('forgot password', () => {
  test.beforeEach(({ api }) => {
    api.state.features.web.signIn = true
  })

  test('opens from sign in with the email filled in, sends the link and can send it again', async ({ page, api }) => {
    await gotoReady(page, '/sign-in')
    await page.getByLabel('Email or username', { exact: true }).fill('ana@example.com')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(/\/forgot-password\?email=ana%40example\.com/)
    await pageReady(page)
    await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible()
    const field = page.getByLabel('Email or username', { exact: true })
    await expect(field).toHaveValue('ana@example.com')

    await page.getByRole('button', { name: 'Send reset link' }).click()
    await pageReady(page)
    const status = page.getByRole('status').filter({ hasText: 'Check your inbox' })
    await expect(status).toContainText('If ana@example.com belongs to a Matchpoynt account')
    // Sending again waits a little, so the link isn't sent over and over.
    await expect(status.getByRole('button', { name: /Send it again in \d+s/ })).toBeDisabled()
    expect(api.profile.resetRequests).toEqual(['ana@example.com'])
  })

  test('a username works too, without ever showing its email', async ({ page, api }) => {
    await gotoReady(page, '/forgot-password')
    await page.getByLabel('Email or username', { exact: true }).fill('@maria.s')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await pageReady(page)
    await expect(page.getByRole('status').filter({ hasText: 'Check your inbox' })).toContainText('If @maria.s is a Matchpoynt account')
    expect(api.profile.resetRequests).toEqual(['@maria.s'])

    await page.getByRole('button', { name: 'Use a different email or username' }).click()
    await expect(page.getByLabel('Email or username', { exact: true })).toHaveValue('@maria.s')
  })
})
