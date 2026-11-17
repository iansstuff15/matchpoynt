import type { Page } from '@playwright/test'
import type { MemberHistory } from '@/utils/profile/history'
import { appNav } from '../support/appShell'
import { photoInput } from '../support/club'
import { png } from '../support/images'
import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

/** A club where Ana ("Ana Reyes" on its roster) played `count` doubles matches, one a minute, winning every other one. */
function clubHistory(count: number): MemberHistory {
  const start = Date.parse('2026-11-01T10:00:00Z')
  return {
    clubId: 'k1',
    clubName: 'Smash Club',
    memberName: 'Ana Reyes',
    badges: [{ id: 'b1', name: 'Rally Queen', description: null, scope: 'session', conditions: [{ metric: 'wins', min: 2 }], iconUrl: null, iconSource: null, summary: 'At least 2 wins in one session' }],
    sessions: [{ id: 's1', label: 'Tuesday night', sportId: 'badminton', endedAt: '2026-11-01T12:00:00Z' }],
    players: ['Ana Reyes', 'Ben', 'Cy', 'Dee'].map((name, i) => ({ id: `p${i}`, sessionId: 's1', name })),
    matches: Array.from({ length: count }, (_, i) => ({
      id: `m${String(i).padStart(2, '0')}`,
      sessionId: 's1',
      courtId: 'c1',
      courtLabel: 'Court 1',
      sides: [['p0', 'p1'], ['p2', 'p3']] as [string[], string[]],
      startedAt: start + i * 60_000 - 30_000,
      finishedAt: start + i * 60_000,
      games: [i % 2 === 0 ? { a: 21, b: 12 } : { a: 18, b: 21 }],
      winner: i % 2 === 0 ? ('a' as const) : ('b' as const),
    })),
  }
}

async function openProfile(page: Page) {
  await gotoReady(page, '/app')
  await page.getByRole('button', { name: /^Account: / }).click()
  await page.getByRole('menuitem', { name: 'Your profile' }).click()
  await expect(page).toHaveURL('/profile')
  await pageReady(page)
}

test.describe('profile page', () => {
  test.beforeEach(async ({ api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    api.profile.histories = [clubHistory(16)]
  })

  test('shows their details, record, badges, clubs and games, older games a page at a time', async ({ page }) => {
    await openProfile(page)
    await expect(page.getByRole('heading', { level: 1, name: 'ana.reyes' })).toBeVisible()
    await expect(page.getByText('@ana.reyes').first()).toBeVisible()

    const about = page.locator('[data-slot="card"]').filter({ has: page.getByText('About you', { exact: true }) })
    await expect(about).toContainText('Ana Reyes')
    await expect(about).toContainText('ana@example.com')
    await expect(about).toContainText('Badminton · Intermediate')

    const record = page.locator('[data-slot="card"]').filter({ has: page.getByText('Record', { exact: true }) })
    await expect(record).toContainText('Matches16')
    await expect(record).toContainText('Wins8')
    await expect(record).toContainText('Win rate50%')

    await expect(page.getByRole('list', { name: 'Club badges' })).toContainText('Rally Queen')
    await expect(page.getByRole('list', { name: 'Your clubs' })).toContainText('On the roster as Ana Reyes')

    const games = page.getByRole('list', { name: 'Your games' }).getByRole('listitem')
    await expect(games).toHaveCount(15)
    await expect(games.first()).toContainText('With Ben vs Cy & Dee')
    // The newest game (the 16th) was a loss, scored from Ana's side.
    await expect(games.first()).toContainText('18–21')
    await expect(games.first()).toContainText('Lost')
    await page.getByRole('button', { name: 'Show older games' }).click()
    await expect(games).toHaveCount(16)
    await expect(page.getByRole('button', { name: 'Show older games' })).toHaveCount(0)
  })

  test('the settings edit their details, keep the username unique, and add links', async ({ page, api }) => {
    api.profile.takenUsernames.add('taken')
    await openProfile(page)
    await page.getByRole('button', { name: 'Profile settings' }).click()
    const settings = page.getByRole('dialog', { name: 'Profile settings' })

    await settings.getByLabel('Username').fill('taken')
    await expect(settings.getByRole('status').filter({ hasText: "@taken is already someone else's username." })).toBeVisible()
    await settings.getByRole('button', { name: 'Save profile' }).click()
    await expect(settings.getByRole('alert')).toContainText("@taken is already someone else's username. Pick another.")

    await settings.getByLabel('Username').fill('ana.plays')
    await expect(settings.getByRole('status').filter({ hasText: '@ana.plays is available' })).toBeVisible()
    await settings.getByLabel('City').fill('Quezon City')
    await settings.getByRole('button', { name: 'Save profile' }).click()
    await pageReady(page)

    await settings.getByRole('navigation', { name: 'Profile settings' }).getByRole('button', { name: /Social links/ }).click()
    await settings.getByRole('button', { name: 'Add link' }).click()
    await settings.getByLabel('Link 1 address').fill('instagram.com/anaplays')
    await settings.getByRole('button', { name: 'Save links' }).click()
    await pageReady(page)
    await page.keyboard.press('Escape')

    const about = page.locator('[data-slot="card"]').filter({ has: page.getByText('About you', { exact: true }) })
    await expect(about).toContainText('@ana.plays')
    await expect(about).toContainText('Quezon City')
    await expect(about.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/anaplays')
    // The sidebar's account shows the new username too.
    await expect(appNav(page).or(page.locator('[data-slot="sidebar"]')).getByText('@ana.plays').first()).toBeVisible()
  })

  test('the photo is added by clicking it, like a club photo, and shows in the sidebar', async ({ page, api }) => {
    await openProfile(page)
    await page.getByRole('button', { name: 'Add a profile photo' }).click()
    const add = page.getByRole('dialog', { name: 'Add a profile photo' })
    await photoInput(add, 'Profile photo').setInputFiles(png(120, 120))
    await pageReady(page)
    await expect(page.getByRole('dialog', { name: 'Change profile photo' })).toBeVisible()
    expect([...api.profile.media.keys()]).toEqual([expect.stringMatching(/\/profile\/avatar-[0-9a-f-]{36}\.webp$/)])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'View your profile photo' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'ana.reyes profile photo' }).first()).toBeVisible()
  })
})
