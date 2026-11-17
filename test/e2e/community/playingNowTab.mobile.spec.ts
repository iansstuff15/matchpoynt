import { randomUUID } from 'node:crypto'
import { tabBar } from '../support/appShell'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { courtCard, setUpSession } from '../support/session'

// Playing now is the tab bar's primary action: dim while you wait, lit and pulsing while you're on court.
test('the Playing tab is dim and says Waiting while you wait, and lights up while you play', async ({ page, api }) => {
  api.state.features.web.signIn = true
  api.profile.signIn('ana@example.com')
  const id = randomUUID()
  api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false })
  api.clubs.addViewer(id)
  const cta = tabBar(page).locator('.tab-bar-cta')
  // Not in any session yet: dim, called Playing.
  await gotoReady(page, '/play')
  await expect(cta).toHaveText('Playing')
  await expect(cta).not.toHaveClass(/tab-bar-cta-live/)

  // The Queue Master sets up the session on a wide screen (setup isn't laid out for phones).
  const phone = page.viewportSize()!
  await page.setViewportSize({ width: 1440, height: 900 })
  await setUpSession(page, { players: ['ana.reyes', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy'].map((name) => ({ name, checkedIn: true })) })
  api.sessions.assignClub(api.sessions.latestId(), id)
  await page.setViewportSize(phone)

  // In the queue: dim, saying Waiting.
  await gotoReady(page, '/play')
  await expect(cta).toContainText('Waiting')
  await expect(cta).not.toHaveClass(/tab-bar-cta-live/)

  // On court now: lit and pulsing.
  await page.setViewportSize({ width: 1440, height: 900 })
  await gotoReady(page, `/app/${api.sessions.latestId()}`)
  await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
  await pageReady(page)
  await page.setViewportSize(phone)
  await gotoReady(page, '/play')
  await expect(cta).toHaveClass(/tab-bar-cta-live/)
  await expect(cta).toContainText('Playing')
  await expect(tabBar(page).getByRole('link', { name: 'Friends' })).toBeVisible()
})

// Your record has tabs of its own: Overview, Sessions and Badges (Match history is in the sidebar).
test('the record tabs open their pages and stay marked there', async ({ page, api }) => {
  api.state.features.web.signIn = true
  api.profile.signIn('ana@example.com')
  await gotoReady(page, '/app')
  const tabs = tabBar(page)
  await expect(tabs.getByRole('link', { name: 'History' })).toHaveCount(0)
  for (const [name, url] of [
    ['Overview', '/record'],
    ['Sessions', '/record/sessions'],
    ['Badges', '/record/badges'],
  ] as const) {
    await tabs.getByRole('link', { name, exact: true }).click()
    await pageReady(page)
    await expect(page).toHaveURL(url)
    await expect(tabs.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page')
  }
})
