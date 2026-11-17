import { randomUUID } from 'node:crypto'
import { club, expect, test } from '../support/mockApi'
import { gotoReady } from '../support/pageReady'

// The directory, a club's page and its join page fit a 390px phone without sideways scrolling.
test.describe('club directory on a phone', () => {
  test.beforeEach(async ({ api }) => {
    api.state.features.web.signIn = true
    api.clubs.seed(club(randomUUID(), 'Lakeside Badminton and Pickleball Club', { handle: 'lakeside', description: 'Thursday smash nights.' }), { mine: false, members: ['Ben'] })
  })

  for (const path of ['/join/lakeside', '/explore', '/c/lakeside']) {
    test(`${path} fits the screen`, async ({ page, api }) => {
      if (path !== '/join/lakeside') api.profile.signIn('ana@example.com')
      await gotoReady(page, path)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    })
  }
})
