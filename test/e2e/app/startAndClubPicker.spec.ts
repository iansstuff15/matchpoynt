import { randomUUID } from 'node:crypto'
import { appNav } from '../support/appShell'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

// Signing in lands on /start: "both" accounts choose how they're using the app, players pick a club.
test.describe('start page and club picker', () => {
  test.beforeEach(({ api }) => {
    api.state.features.web.signIn = true
  })

  test('a "both" account chooses player, picks a club, and the app wears it; switching back to club owner opens the board', async ({ page, api }) => {
    api.profile.signIn('ana@example.com')
    const lakeside = randomUUID()
    api.clubs.seed(club(lakeside, 'Lakeside', { handle: 'lakeside' }), { mine: false })
    api.clubs.seed(club(randomUUID(), 'Harbour', { handle: 'harbour' }), { mine: false })
    api.clubs.addViewer(lakeside)
    // A club they own shows too, so an owner playing in their own club finds it.
    api.clubs.seed(club(randomUUID(), 'Own Court', { handle: 'owncourt' }))

    await gotoReady(page, '/start')
    await expect(page.getByRole('heading', { name: 'How are you using Matchpoynt today?' })).toBeVisible()
    await page.getByRole('button', { name: /^Player:/ }).click()
    await pageReady(page)
    await expect(page).toHaveURL('/choose-club')

    // Finding other clubs is on the same page, below.
    // Full screen: no app header, sidebar or tab bar.
    await expect(appNav(page)).toHaveCount(0)
    const mine = page.getByRole('list', { name: 'Playing with' })
    // The clubs they're in, owned or a member of.
    await expect(mine.getByRole('button')).toHaveCount(2)
    await expect(mine.getByRole('button', { name: 'Play with Own Court' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Find clubs' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Clubs', exact: true })).toContainText('Harbour')

    await mine.getByRole('button', { name: 'Play with Lakeside' }).click()
    await pageReady(page)
    await expect(page).toHaveURL('/play')
    // The club's photo stands in for the logo, and the player's app has no session board.
    await expect(page.getByRole('link', { name: 'Playing with Lakeside: switch club' }).first()).toBeVisible()
    await expect(appNav(page).getByRole('link', { name: 'Session board' })).toHaveCount(0)
    // The sidebar's club switcher shows the club and switches to the others; the full picker is in its menu.
    await appNav(page).getByRole('button', { name: 'Switch club' }).click()
    await expect(page.getByRole('menuitem', { name: 'Own Court' })).toBeVisible()
    await page.getByRole('menuitem', { name: 'All clubs and find more' }).click()
    await expect(page).toHaveURL('/choose-club')
    await page.getByRole('button', { name: 'Play with Lakeside' }).click()
    await pageReady(page)

    // Switching back to the club owner's app from the account menu.
    await page.getByRole('button', { name: /^Account: / }).click()
    await page.getByRole('menuitem', { name: 'Switch to club owner' }).click()
    await pageReady(page)
    await page.getByRole('button', { name: /^Club owner:/ }).click()
    await pageReady(page)
    await expect(page).toHaveURL('/app')
    await expect(appNav(page).getByRole('link', { name: 'Session board' })).toBeVisible()
  })

  test('a player-only account goes straight to the club picker, and old Find clubs links land there', async ({ page, api }) => {
    api.profile.signIn('pat@example.com', { role: 'player' })
    await gotoReady(page, '/start')
    await expect(page).toHaveURL('/choose-club')
    await expect(page.getByRole('heading', { name: 'Find your club' })).toBeVisible()
    await gotoReady(page, '/explore')
    await expect(page).toHaveURL('/choose-club')
  })

  test('a Queue Master goes straight to the board', async ({ page, api }) => {
    api.profile.signIn('qm@example.com', { role: 'queue_master' })
    await gotoReady(page, '/start')
    await expect(page).toHaveURL('/app')
  })

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('the picker animates in, and picking a club plays its exit before opening the app', async ({ page, api }) => {
      api.profile.signIn('pat@example.com', { role: 'player' })
      const id = randomUUID()
      api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false })
      api.clubs.addViewer(id)
      await gotoReady(page, '/choose-club')
      const tile = page.getByRole('button', { name: 'Play with Lakeside' })
      // The entrance ends with every tile fully shown.
      await expect.poll(() => tile.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
      await tile.click()
      await expect(page).toHaveURL('/play')
    })
  })
})
