import { appNav, expectEmptyBoard, openApp, sidebar } from '../support/appShell'
import { closeClubSetup } from '../support/club'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady, reloadReady } from '../support/pageReady'

const clubs = [club('11111111-1111-4111-8111-111111111111', 'Riverside Smashers'), club('22222222-2222-4222-8222-222222222222', 'Northside Rally')]
const [riverside, northside] = clubs as [ReturnType<typeof club>, ReturnType<typeof club>]

test.describe('app sidebar', () => {
  test.beforeEach(({ api }) => {
    for (const c of clubs) api.clubs.seed(c)
  })

  test('links only to app pages: no home or public rankings', async ({ page, api }) => {
    // /app with no session shows the empty board; setup waits to be asked for.
    await gotoReady(page, '/app')
    await expectEmptyBoard(page)

    const nav = appNav(page)
    await expect(nav.getByRole('link', { name: 'Session board' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'All clubs' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Rankings' })).toHaveCount(0)
    // The tab bar along the bottom is for phones only.
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeHidden()
    expect(api.unhandled).toEqual([])
  })

  test('groups your links under the session switcher and the club pages under the club switcher', async ({ page }) => {
    await openApp(page, `/clubs/${riverside.id}/members`)
    const you = appNav(page).getByRole('group', { name: 'You' })
    await expect(you.getByRole('button', { name: /Switch session|New session/ }).first()).toBeVisible()
    await expect(you.getByRole('link', { name: 'Session board' })).toBeVisible()
    await expect(you.getByRole('link', { name: 'Past sessions' })).toHaveCount(0)
    await expect(you.getByRole('link', { name: 'Members' })).toHaveCount(0)

    const clubGroup = appNav(page).getByRole('group', { name: 'Riverside Smashers' })
    await expect(clubGroup.getByRole('button', { name: 'Switch club' })).toBeVisible()
    await expect(clubGroup.getByRole('link', { name: 'Members' })).toHaveAttribute('aria-current', 'page')
    await expect(clubGroup.getByRole('link', { name: 'Session board' })).toHaveCount(0)
  })

  test('collapses to an icon rail and remembers it after a reload', async ({ page }) => {
    await openApp(page, '/clubs')
    await expect(sidebar(page)).toHaveAttribute('data-state', 'expanded')

    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    await expect(sidebar(page)).toHaveAttribute('data-state', 'collapsed')
    await expect(sidebar(page)).toHaveAttribute('data-collapsible', 'icon')
    // Labels hide in the rail; the links stay, each with a tooltip.
    await expect(appNav(page).getByText('All clubs')).toBeHidden()
    await appNav(page).getByRole('link', { name: 'All clubs' }).hover()
    await expect(page.getByRole('tooltip', { name: 'All clubs' })).toBeVisible()

    await reloadReady(page)
    await expect(appNav(page)).toBeAttached()
    await expect(sidebar(page)).toHaveAttribute('data-state', 'collapsed')

    await page.getByRole('button', { name: 'Expand sidebar' }).click()
    await expect(sidebar(page)).toHaveAttribute('data-state', 'expanded')
  })

  test('toggles with Ctrl/⌘ B', async ({ page }) => {
    await openApp(page, '/clubs')
    await page.keyboard.press('ControlOrMeta+b')
    await expect(sidebar(page)).toHaveAttribute('data-state', 'collapsed')
    await page.keyboard.press('ControlOrMeta+b')
    await expect(sidebar(page)).toHaveAttribute('data-state', 'expanded')
  })

  test('shows only "All clubs" until a club is picked', async ({ page }) => {
    await openApp(page, '/clubs')
    const nav = appNav(page)
    await expect(nav.getByRole('link', { name: 'All clubs' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Members' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Switch club' })).toContainText('Choose a club')
  })

  test('club links open the picked club\'s dashboard and pages', async ({ page }) => {
    await openApp(page, '/clubs')

    // Pick a club from the sidebar's switcher: it opens on its dashboard.
    await page.getByRole('button', { name: 'Switch club' }).click()
    await page.getByRole('menuitem', { name: northside.name }).click()
    await expect(page).toHaveURL(`/clubs/${northside.id}`)
    await pageReady(page)
    await closeClubSetup(page)
    await expect(page.getByRole('heading', { level: 1, name: northside.name })).toBeVisible()

    const nav = appNav(page)
    await expect(nav.getByText(northside.name).first()).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')

    // Each of the club's pages has its own address.
    await nav.getByRole('link', { name: 'Members' }).click()
    await expect(page).toHaveURL(`/clubs/${northside.id}/members`)
    await pageReady(page)
    await expect(page.getByRole('heading', { name: 'Members', level: 2 })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Members' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page')

    // Links from before the pages existed still land on the page.
    await gotoReady(page, `/clubs/${northside.id}?tab=members`)
    await expect(page).toHaveURL(`/clubs/${northside.id}/members`)

    // Elsewhere in the app, the club links still open the club picked last.
    await nav.getByRole('link', { name: 'Session board' }).click()
    await pageReady(page)
    await expectEmptyBoard(page)
    await expect(nav.getByRole('link', { name: 'Members' })).toHaveAttribute('href', `/clubs/${northside.id}/members`)
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', `/clubs/${northside.id}`)
    await expect(nav.getByRole('link', { name: 'Sessions', exact: true })).not.toHaveAttribute('href', new RegExp(riverside.id))
  })

  test('the selected item has a border on every side', async ({ page }) => {
    await openApp(page, '/clubs')
    const selected = appNav(page).getByRole('link', { name: 'All clubs' })
    await expect(selected).toHaveAttribute('aria-current', 'page')

    const border = await selected.evaluate((el) => {
      const s = getComputedStyle(el)
      return [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth, s.borderTopColor]
    })
    expect(border.slice(0, 4)).toEqual(['1px', '1px', '1px', '1px'])
    expect(border[4]).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)

    const idle = appNav(page).getByRole('link', { name: 'Session board' })
    expect(await idle.evaluate((el) => getComputedStyle(el).borderTopColor)).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  })

  test('guest mode says sessions stay with this browser', async ({ page }) => {
    await openApp(page, '/clubs')
    await expect(page.getByRole('complementary', { name: 'Guest mode' })).toContainText('Sessions stay with this browser')
  })
})
