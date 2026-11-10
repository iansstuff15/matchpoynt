import { appNav } from '../support/appShell'
import { createClub, openClubTab } from '../support/club'
import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { setUpSession } from '../support/session'

const trail = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'breadcrumb' })

test.describe('breadcrumbs', () => {
  test('club pages: Clubs / club / tab, with earlier steps linked', async ({ page }) => {
    await gotoReady(page, '/clubs')
    await expect(trail(page)).toHaveText('Clubs')

    await createClub(page, 'Westside Smashers')
    await expect(trail(page)).toHaveText('Clubs/Westside Smashers/Sessions')
    await openClubTab(page, 'Members')
    await expect(trail(page)).toHaveText('Clubs/Westside Smashers/Members')
    // The page on screen is marked as such, and isn't a link.
    await expect(trail(page).locator('a[href]', { hasText: 'Members' })).toHaveCount(0)
    await expect(trail(page).locator('[aria-current="page"]')).toHaveText('Members')

    await trail(page).getByRole('link', { name: 'Westside Smashers' }).click()
    await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]{36}$/)
    await pageReady(page)
    await trail(page).getByRole('link', { name: 'Clubs' }).click()
    await expect(page).toHaveURL('/clubs')
  })

  test('session pages: Session board / session, and Past sessions', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben'] })
    await expect(trail(page)).toHaveText('Session board/Badminton session')

    await appNav(page).getByRole('link', { name: 'Past sessions' }).click()
    await pageReady(page)
    await expect(trail(page)).toHaveText('Session board/Past sessions')
    await trail(page).getByRole('link', { name: 'Session board' }).click()
    await expect(page).toHaveURL(/\/app/)
  })
})

test('the breadcrumbs sit on the sidebar colour, in its text colours', async ({ page }) => {
  await setUpSession(page, { players: ['Ana'] })
  const colours = await page.evaluate(() => {
    // A probe in the sidebar's bright text colour, as the browser resolves it (oklch here).
    const probe = document.createElement('span')
    probe.className = 'text-sidebar-accent-foreground'
    document.body.append(probe)
    const sidebarText = getComputedStyle(probe).color
    probe.remove()
    return {
      frame: getComputedStyle(document.querySelector('[data-slot="sidebar-wrapper"]')!).backgroundColor,
      sidebar: getComputedStyle(document.querySelector('[data-slot="sidebar-inner"]')!).backgroundColor,
      current: getComputedStyle(document.querySelector('[data-slot="breadcrumb-page"][aria-current="page"]')!).color,
      sidebarText,
    }
  })
  expect(colours.frame).toBe(colours.sidebar)
  expect(colours.current).toBe(colours.sidebarText)
})
