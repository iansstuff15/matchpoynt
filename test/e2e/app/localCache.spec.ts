import { randomUUID } from 'node:crypto'
import { appNav } from '../support/appShell'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, reloadReady } from '../support/pageReady'

const kept = (page: import('@playwright/test').Page) => page.evaluate(() => window.localStorage.getItem('matchpoynt.cache') ?? '')

// Non-sensitive club and profile details are kept on this device, so they show without being fetched every time.
test.describe('local cache', () => {
  test.beforeEach(({ api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    api.clubs.seed(club(randomUUID(), 'Smash Club', { description: 'Thursday nights' }))
  })

  test('keeps your clubs and who you are (without your email), and uses them instead of fetching again', async ({ page }) => {
    await gotoReady(page, '/clubs')
    await expect(page.getByRole('list', { name: 'Your clubs' })).toContainText('Smash Club')
    await expect.poll(() => kept(page)).toContain('Smash Club')
    const cache = await kept(page)
    expect(cache).toContain('ana.reyes')
    expect(cache).not.toContain('ana@example.com')

    // Fresh for a while: reopening the app draws the club switcher from the kept list, with no new request for it.
    const asked: string[] = []
    page.on('request', (r) => {
      const { pathname, search } = new URL(r.url())
      if (pathname === '/api/clubs' && !search) asked.push(pathname)
    })
    await gotoReady(page, '/app')
    await expect(appNav(page).getByRole('button', { name: 'Switch club' })).toBeVisible()
    expect(asked).toEqual([])
  })

  test('signing out clears what was kept', async ({ page }) => {
    await gotoReady(page, '/app')
    await expect.poll(() => kept(page)).toContain('ana.reyes')
    await page.getByRole('button', { name: /^Account: / }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/sign-in/)
    await expect.poll(() => kept(page)).not.toContain('ana.reyes')
    await reloadReady(page)
    expect(await kept(page)).not.toContain('Smash Club')
  })
})
