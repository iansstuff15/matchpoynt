import type { Page } from '@playwright/test'
import { appNav } from '../support/appShell'
import { expect, test } from '../support/mockApi'
import { gotoReady, reloadReady } from '../support/pageReady'

/** Forgets that this release's "What's new" was seen, once per tab (the mock marks it seen on every page load otherwise). */
async function notSeenYet(page: Page) {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('test.changelogCleared')) return
    window.localStorage.setItem('matchpoynt.changelogSeen', '')
    window.sessionStorage.setItem('test.changelogCleared', '1')
  })
}

test.describe("what's new", () => {
  test('opens once per release on the app, with the releases in its sidebar, and reopens from the sidebar', async ({ page }) => {
    await notSeenYet(page)
    await gotoReady(page, '/app')
    const dialog = page.getByRole('dialog', { name: "What's new" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /Version 0\.4\.1/ })).toContainText('Latest')
    await expect(dialog.getByRole('list', { name: 'Added in 0.4.1' })).toContainText('Your record')

    const releases = dialog.getByRole('navigation', { name: 'Releases' })
    await expect(releases.getByRole('button')).toHaveText([/v0\.4\.1/, /v0\.4\.0/, /v0\.3\.0/, /v0\.2\.0/, /v0\.1\.0/])
    await releases.getByRole('button', { name: /v0\.1\.0/ }).click()
    await expect(dialog.getByRole('heading', { name: 'Version 0.1.0' })).toBeVisible()
    await expect(dialog.getByRole('list', { name: 'Added in 0.1.0' })).toContainText('Tournaments')

    await dialog.getByRole('button', { name: 'Got it' }).click()
    await expect(dialog).toBeHidden()
    // Seen: it doesn't open again.
    await reloadReady(page)
    await expect(appNav(page)).toBeVisible()
    await expect(dialog).toHaveCount(0)

    // It can always be opened again.
    await page.getByRole('button', { name: "What's new" }).click()
    await expect(dialog.getByRole('heading', { name: /Version 0\.4\.1/ })).toBeVisible()
  })

  test('a signed-in account sees it once too, and the account menu opens it', async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    await notSeenYet(page)
    await gotoReady(page, '/app')
    const dialog = page.getByRole('dialog', { name: "What's new" })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await reloadReady(page)
    await expect(dialog).toHaveCount(0)
    await page.getByRole('button', { name: /^Account: / }).click()
    await page.getByRole('menuitem', { name: "What's new" }).click()
    await expect(dialog).toBeVisible()
  })
})
