import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

test.describe('app navigation on a phone', () => {
  test('opens from the header as a sheet and closes after picking a page', async ({ page, api }) => {
    api.clubs.seed(club('33333333-3333-4333-8333-333333333333', 'Harbour Club'))
    await gotoReady(page, '/clubs')

    const open = page.getByRole('button', { name: 'Open navigation' })
    await expect(open).toBeVisible()
    // The desktop sidebar isn't on screen at this width.
    await expect(page.getByRole('navigation', { name: 'App' })).toHaveCount(0)

    await open.click()
    const nav = page.getByRole('navigation', { name: 'App' })
    await expect(nav).toBeVisible()
    await nav.getByRole('link', { name: 'Session board' }).click()

    await expect(page).toHaveURL('/app')
    await pageReady(page)
    await expect(nav).toBeHidden()
  })

  test('no page scrolls sideways at 390px', async ({ page, api }) => {
    api.clubs.seed(club('33333333-3333-4333-8333-333333333333', 'Harbour Club'))
    await gotoReady(page, '/clubs')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
