import { randomUUID } from 'node:crypto'
import { appNav } from '../support/appShell'
import { club, expect, test } from '../support/mockApi'
import { gotoReady } from '../support/pageReady'

// Player-only accounts join clubs but don't run them: no club manager anywhere, and its pages send them to Find clubs.
test.describe('player-only accounts', () => {
  test.beforeEach(({ api }) => {
    api.state.features.web.signIn = true
  })

  test('see no club management, and club pages send them to their club picker', async ({ page, api }) => {
    api.profile.signIn('pat@example.com', { role: 'player' })
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside'))
    // The picker is full screen; the sidebar is on the app's other pages.
    await gotoReady(page, '/profile')
    const nav = appNav(page)
    // Players switch the club they're playing with at the top of the sidebar; the full picker is in its menu.
    await nav.getByRole('button', { name: 'Switch club' }).click()
    await expect(page.getByRole('menuitem', { name: 'All clubs and find more' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(nav.getByRole('link', { name: 'All clubs' })).toHaveCount(0)
    await expect(page.getByRole('group', { name: /Club/ })).toHaveCount(0)

    await gotoReady(page, '/clubs?new=1')
    await expect(page).toHaveURL('/choose-club')
    await expect(page.getByRole('dialog', { name: /Add a club|Create a club/ })).toHaveCount(0)
    await gotoReady(page, `/clubs/${id}/members`)
    await expect(page).toHaveURL('/choose-club')
  })

  test('Queue Masters and "both" accounts keep the club manager', async ({ page, api }) => {
    api.profile.signIn('ana@example.com', { role: 'both' })
    await gotoReady(page, '/app')
    await expect(appNav(page).getByRole('link', { name: 'All clubs' })).toBeVisible()
    await gotoReady(page, '/clubs')
    await expect(page).toHaveURL('/clubs')
  })

  test("have no session board: its links are hidden and its pages send them home: their club picker until they pick a club", async ({ page, api }) => {
    api.profile.signIn('pat@example.com', { role: 'player' })
    await gotoReady(page, '/profile')
    const nav = appNav(page)
    for (const link of ['Session board']) await expect(nav.getByRole('link', { name: link })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Playing now' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Switch session|New session/ })).toHaveCount(0)
    for (const path of ['/app', '/app/past', '/app/invoices']) {
      await gotoReady(page, path)
      await expect(page).toHaveURL('/choose-club')
    }
    // The logo (on the app's other pages; the picker is full screen) leads to their home too.
    await gotoReady(page, '/profile')
    await expect(page.getByRole('link', { name: 'Matchpoynt home' }).first()).toHaveAttribute('href', '/choose-club')
    expect(api.unhandled).toEqual([])
  })
})
