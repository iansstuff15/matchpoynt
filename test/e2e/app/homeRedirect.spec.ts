import { expect, test } from '../support/mockApi'
import { gotoReady } from '../support/pageReady'

// Opening the website signed in goes straight to the board; signed out (or with sign-in off) it's the landing page.
test.describe('home page', () => {
  test('sends someone signed in straight to the app', async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    await gotoReady(page, '/')
    await expect(page).toHaveURL(/\/app/)
  })

  test('stays on the landing page when signed out, or with sign-in off', async ({ page, api }) => {
    api.state.features.web.signIn = true
    await gotoReady(page, '/')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

    api.state.features.web.signIn = false
    await gotoReady(page, '/')
    await expect(page).toHaveURL('/')
  })

  test('waits for the API: a sign-in that has expired stays on the landing page', async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    await gotoReady(page, '/app')
    // Expired since: the API now answers nobody, though this device still remembers them.
    api.profile.user = null
    await gotoReady(page, '/')
    await expect(page).toHaveURL('/')
  })

  test.describe('with the splash playing', () => {
    test.use({ reducedMotion: 'no-preference' })

    /** Counts the curtain's clip changes from now on: the wipe moves it every frame, the way to the app never does. */
    const watchCurtain = (page: import('@playwright/test').Page) =>
      page.evaluate(() => {
        const w = window as unknown as { curtainMoves: number }
        w.curtainMoves = 0
        const curtain = document.querySelector('.splash-curtain')!
        new MutationObserver(() => w.curtainMoves++).observe(curtain, { attributes: true, attributeFilter: ['style'] })
      })
    const curtainMoves = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { curtainMoves: number }).curtainMoves)

    test('starts on a plain stage, plays the splash, then goes to the app without the wipe', async ({ page, api }) => {
      api.state.features.web.signIn = true
      api.state.features.web.splash = true
      api.profile.signIn('ana@example.com')
      // Hold the toggles back a moment, as on a slow connection: the startup screen shows no landing page skeleton.
      await page.route(
        (url) => url.pathname === '/api/config',
        async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 800))
          await route.fallback()
        },
      )
      await page.goto('/')
      await expect(page.getByLabel('Loading Matchpoynt')).toBeVisible()
      await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0)

      const splash = page.getByRole('dialog', { name: /Intro animation/ })
      await expect(splash).toBeVisible()
      await expect(splash.getByRole('progressbar', { name: 'Loading the app' })).toBeVisible()
      await watchCurtain(page)
      // The hand-off takes over from the splash while the app loads, then fades away over the loaded app.
      const handoff = page.getByRole('status', { name: 'Opening the app' })
      await expect(handoff).toBeVisible({ timeout: 15_000 })
      expect(await curtainMoves(page).catch(() => 0)).toBeLessThan(2)
      // Once the app has loaded the bar fills, and the hand-off holds in the app's colours with the logo bobbing before it fades.
      await expect(handoff.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100', { timeout: 15_000 })
      await expect(handoff).toHaveAttribute('data-stage', 'holding')
      // The arches bob only during the hold (it lasts motion.handoff.holdMs), so check straight away.
      expect(await handoff.locator('[data-logo-arch="accent"]').evaluate((el) => getComputedStyle(el).animationName)).toBe('arch-hop')
      await expect(page).toHaveURL(/\/app/)
      await expect(splash).toHaveCount(0)
      await expect(handoff).toHaveCount(0, { timeout: 15_000 })
      await expect(page.getByRole('navigation', { name: 'App' })).toBeVisible()
    })

    test('signed out, the curtain wipes down onto the landing page', async ({ page, api }) => {
      api.state.features.web.signIn = true
      api.state.features.web.splash = true
      await page.goto('/')
      const splash = page.getByRole('dialog', { name: /Intro animation/ })
      await expect(splash).toBeVisible()
      // The impact's circles stay hidden while the arches fly in, and burst out only when they crash.
      const ring = page.locator('.splash-impact-ring').first()
      await expect(ring).toBeHidden()
      await expect(ring).toBeVisible({ timeout: 5_000 })
      // Into the burst (the ring has grown past its own size), for the picture.
      await expect.poll(() => ring.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a), { timeout: 5_000 }).toBeGreaterThan(1.5)
      await page.screenshot({ path: test.info().outputPath('impact.png') })
      await watchCurtain(page)
      await expect(splash).toHaveCount(0, { timeout: 15_000 })
      expect(await curtainMoves(page)).toBeGreaterThan(5)
      await expect(page).toHaveURL('/')
    })
  })
})
