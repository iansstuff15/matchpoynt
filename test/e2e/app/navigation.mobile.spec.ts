import { appNav, openApp, tabBar } from '../support/appShell'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

const harbour = '33333333-3333-4333-8333-333333333333'

test.describe('website tabs on a phone', () => {
  test('the pages are tabs at the bottom, and the one on screen is highlighted', async ({ page }) => {
    await gotoReady(page, '/rankings')

    const tabs = tabBar(page)
    await expect(tabs).toBeVisible()
    // No hamburger menu, and the header's links are hidden at this width.
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden()
    await expect(tabs.getByRole('link', { name: 'Rankings' })).toHaveAttribute('aria-current', 'page')

    // Pinned to the bottom of the screen.
    const box = await tabs.boundingBox()
    expect(box!.y + box!.height).toBeGreaterThan(844 - 40)

    await tabs.getByRole('link', { name: 'Home' }).click()
    await pageReady(page)
    await expect(page).toHaveURL('/')
    await expect(tabs.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  test('the tab bar never covers the footer links', async ({ page }) => {
    await gotoReady(page, '/rankings')
    const lastLink = page.getByRole('navigation', { name: 'Footer' }).getByRole('link').last()
    await lastLink.scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const link = await lastLink.boundingBox()
    const tabs = await tabBar(page).boundingBox()
    expect(link!.y + link!.height).toBeLessThanOrEqual(tabs!.y)
  })
})

test.describe('app tabs on a phone', () => {
  test('tabs open the main pages and highlight the one on screen', async ({ page, api }) => {
    api.clubs.seed(club(harbour, 'Harbour Club'))
    await openApp(page, '/clubs')

    const tabs = tabBar(page)
    // The desktop sidebar isn't on screen at this width.
    await expect(appNav(page)).toHaveCount(0)
    await expect(tabs.getByRole('link', { name: 'Clubs' })).toHaveAttribute('aria-current', 'page')

    await tabs.getByRole('link', { name: 'Board' }).click()
    await pageReady(page)
    await expect(page).toHaveURL('/app')
    await expect(tabs.getByRole('link', { name: 'Board' })).toHaveAttribute('aria-current', 'page')
    await expect(tabs.getByRole('link', { name: 'Clubs' })).not.toHaveAttribute('aria-current', 'page')
  })

  test('the menu at the top left opens the full navigation as a sheet, which closes after picking a page', async ({ page, api }) => {
    api.clubs.seed(club(harbour, 'Harbour Club'))
    await openApp(page, '/clubs')

    // The header: the menu on the left, the logo in the middle.
    const header = page.locator('.app-shell-mobile-header')
    const menu = header.getByRole('button', { name: 'Open the menu' })
    const [menuBox, logoBox, headerBox] = await Promise.all([menu.boundingBox(), header.getByRole('link', { name: 'Matchpoynt home' }).boundingBox(), header.boundingBox()])
    expect(menuBox!.x).toBeLessThan(headerBox!.width / 4)
    expect(Math.abs(logoBox!.x + logoBox!.width / 2 - (headerBox!.x + headerBox!.width / 2))).toBeLessThan(4)
    await expect(tabBar(page).getByRole('button', { name: 'Menu' })).toHaveCount(0)
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await menu.click()
    const nav = appNav(page)
    await expect(nav).toBeVisible()
    await nav.getByRole('link', { name: 'Session board' }).click()

    await expect(page).toHaveURL('/app')
    await pageReady(page)
    await expect(nav).toBeHidden()
  })

  test('no page scrolls sideways at 390px', async ({ page, api }) => {
    api.clubs.seed(club(harbour, 'Harbour Club'))
    await gotoReady(page, '/clubs')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test("the account is at the top right, opening the person's menu", async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    await openApp(page, '/app')
    const header = page.locator('.app-shell-mobile-header')
    const account = header.getByRole('button', { name: /^Account: / })
    const [box, headerBox] = await Promise.all([account.boundingBox(), header.boundingBox()])
    expect(box!.x + box!.width).toBeGreaterThan(headerBox!.x + headerBox!.width * 0.75)
    await account.click()
    await page.getByRole('menuitem', { name: 'Your profile' }).click()
    await expect(page).toHaveURL('/profile')
  })
})
