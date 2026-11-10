import type { Page } from '@playwright/test'
import { appNav } from './support/appShell'
import { club, expect, test } from './support/mockApi'
import { gotoReady } from './support/pageReady'

const colours = (page: Page) =>
  page.evaluate(() => ({
    scheme: getComputedStyle(document.documentElement).colorScheme,
    page: getComputedStyle(document.querySelector('[data-slot="sidebar-inset"]')!).backgroundColor,
    sidebar: getComputedStyle(document.querySelector('[data-slot="sidebar-inner"]')!).backgroundColor,
  }))

test.describe('theme', () => {
  test.beforeEach(({ api }) => {
    api.clubs.seed(club('44444444-4444-4444-8444-444444444444', 'Lakeside'))
  })

  test('is two-tone: a dark sidebar around a light page', async ({ page }) => {
    await gotoReady(page, '/clubs')
    await expect(appNav(page)).toBeVisible()
    const { page: pageBg, sidebar } = await colours(page)
    expect(pageBg).not.toEqual(sidebar)
  })

  test('stays light when the device asks for dark mode', async ({ page }) => {
    await gotoReady(page, '/clubs')
    await expect(appNav(page)).toBeVisible()
    const light = await colours(page)

    await page.emulateMedia({ colorScheme: 'dark' })
    expect(await colours(page)).toEqual(light)
    expect(light.scheme).toBe('light')
  })
})
