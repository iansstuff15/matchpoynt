import { badgeCard, badgeDialog, createBadge } from '../support/badges'
import { createClub, openClubPage } from '../support/club'
import { gif, png } from '../support/images'
import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'

test.describe('club badges', () => {
  test.beforeEach(async ({ page }) => {
    await createClub(page, 'Westside Smashers')
  })

  test('a badge with a GIF found by search', async ({ page, api }) => {
    await createBadge(page, {
      name: 'Smash King',
      description: 'Ruled the courts tonight.',
      conditions: [{ metric: 'Wins', min: 5 }],
      icon: { search: 'trophy', pick: 'Trophy GIF' },
    })

    const card = badgeCard(page, 'Smash King')
    await expect(card).toContainText('At least 5 wins in one session.')
    await expect(card).toContainText('Ruled the courts tonight.')
    await expect(card).toContainText('In one session')
    // The search went through the API (the GIPHY key never reaches the browser), and the picked GIF is stored as the badge's own icon.
    expect(api.clubs.gifQueries).toContain('trophy')
    expect([...api.clubs.media.keys()]).toEqual([expect.stringMatching(/\/badge-[0-9a-f-]{36}\.gif$/)])
    await expect(card.getByRole('img', { name: 'Smash King badge' })).toBeVisible()
  })

  test('a career badge with several conditions and an uploaded GIF', async ({ page, api }) => {
    await createBadge(page, {
      name: 'Club Legend',
      scope: 'Across all club sessions',
      conditions: [
        { metric: 'Wins', min: 50 },
        { metric: 'Sessions attended', min: 10 },
        { metric: 'Win rate (%)', min: 60 },
      ],
      icon: { upload: gif() },
    })
    const card = badgeCard(page, 'Club Legend')
    await expect(card).toContainText('At least 50 wins, 10 sessions played in and a 60% win rate across all club sessions.')
    // Uploaded GIFs stay GIFs, so they keep moving.
    expect([...api.clubs.media.keys()]).toEqual([expect.stringMatching(/\.gif$/)])
  })

  test('an uploaded still image is converted to WebP', async ({ page, api }) => {
    await createBadge(page, { name: 'Iron Wall', conditions: [{ metric: 'Point difference', min: 20 }], icon: { upload: png(48, 48) } })
    await expect(badgeCard(page, 'Iron Wall')).toContainText('At least a point difference of +20 in one session.')
    expect([...api.clubs.media.keys()]).toEqual([expect.stringMatching(/\.webp$/)])
  })

  test('editing a badge, changing its GIF, then deleting it', async ({ page, api }) => {
    await createBadge(page, { name: 'Hot Hand', conditions: [{ metric: 'Wins in a row', min: 3 }], icon: { search: 'fire', pick: 'Fire GIF' } })
    const first = [...api.clubs.media.keys()][0]

    await badgeCard(page, 'Hot Hand').getByRole('button', { name: 'Edit the Hot Hand badge' }).click()
    const edit = badgeDialog(page, 'Edit Hot Hand')
    await edit.getByLabel('Badge name').fill('Hotter Hand')
    await edit.getByLabel('Minimum wins in a row').fill('4')
    await edit.getByRole('tab', { name: 'Search GIFs' }).click()
    await edit.getByRole('searchbox', { name: 'Search GIFs' }).fill('rocket')
    await edit.getByRole('button', { name: 'Rocket GIF' }).click()
    await edit.getByRole('button', { name: 'Save badge' }).click()
    await expect(edit).toBeHidden()
    await pageReady(page)

    await expect(badgeCard(page, 'Hotter Hand')).toContainText('At least 4 wins in a row in one session.')
    // The old GIF is replaced, not kept.
    expect([...api.clubs.media.keys()]).not.toContain(first)
    expect(api.clubs.media.size).toBe(1)

    await badgeCard(page, 'Hotter Hand').getByRole('button', { name: 'Delete the Hotter Hand badge' }).click()
    await page.getByRole('alertdialog', { name: 'Delete the Hotter Hand badge?' }).getByRole('button', { name: 'Delete badge' }).click()
    await pageReady(page)
    await expect(page.getByText('No club badges yet')).toBeVisible()
    expect(api.clubs.media.size).toBe(0)
  })

  test('switching to "across all club sessions" drops conditions that only count in one session', async ({ page }) => {
    await openClubPage(page, 'Badges')
    await page.getByRole('button', { name: 'New badge' }).click()
    const dialog = badgeDialog(page)
    await dialog.getByRole('combobox', { name: 'Condition 1' }).click()
    await page.getByRole('option', { name: 'Wins in a row', exact: true }).click()
    await dialog.getByRole('radio', { name: /Across all club sessions/ }).check()
    await expect(dialog.getByRole('combobox', { name: 'Condition 1' })).toHaveCount(0)
  })

  test('the API refuses a badge without a name or conditions, and says why', async ({ page }) => {
    await openClubPage(page, 'Badges')
    await page.getByRole('button', { name: 'New badge' }).click()
    const dialog = badgeDialog(page)
    await dialog.getByRole('button', { name: 'Create badge' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Give the badge a name.')

    await dialog.getByLabel('Badge name').fill('Nothing')
    await dialog.getByRole('button', { name: 'Remove the wins condition' }).click()
    await dialog.getByRole('button', { name: 'Create badge' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Add at least one condition')
  })

  test('the API refuses a file that isn\'t an image', async ({ page }) => {
    await createBadge(page, { name: 'Ace', conditions: [{ metric: 'Wins', min: 1 }] })
    await badgeCard(page, 'Ace').getByRole('button', { name: 'Edit the Ace badge' }).click()
    const edit = badgeDialog(page, 'Edit Ace')
    await edit.getByRole('tab', { name: 'Upload' }).click()
    await edit.locator('input[type="file"]').setInputFiles({ name: 'fake.gif', mimeType: 'image/gif', buffer: Buffer.from('not a gif') })
    await edit.getByRole('button', { name: 'Save badge' }).click()
    await expect(edit.getByRole('alert')).toContainText('Badge icons must be GIF, JPEG, PNG or WebP images.')
  })
})

test.describe('badge GIFs and reduced motion', () => {
  test('the GIF plays normally', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await createClub(page, 'Motion Club')
    await createBadge(page, { name: 'Fireball', conditions: [{ metric: 'Wins', min: 2 }], icon: { search: 'fire', pick: 'Fire GIF' } })
    const icon = badgeCard(page, 'Fireball').getByRole('img', { name: 'Fireball badge' })
    await expect(icon).toHaveAttribute('src', /\/api\/media\/.+\.gif$/)
  })

  test('with reduced motion, only its first frame shows', async ({ page }) => {
    await createClub(page, 'Calm Club')
    await createBadge(page, { name: 'Steady', conditions: [{ metric: 'Wins', min: 2 }], icon: { search: 'crown', pick: 'Crown GIF' } })
    const icon = badgeCard(page, 'Steady').getByRole('img', { name: 'Steady badge' })
    await expect(icon).toBeVisible()
    expect(await icon.evaluate((el) => el.tagName)).toBe('CANVAS')
  })
})

test.describe('club badges with GIF search off', () => {
  test('uploading a GIF is the only option, with no tabs', async ({ page, api }) => {
    api.state.features.web.gifSearch = false
    await createClub(page, 'Quiet Club')
    await openClubPage(page, 'Badges')
    await page.getByRole('button', { name: 'New badge' }).click()
    const dialog = badgeDialog(page)
    await expect(dialog.getByRole('tab')).toHaveCount(0)
    await expect(dialog.getByRole('searchbox', { name: 'Search GIFs' })).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Upload a GIF or image' })).toBeVisible()
    // Create and Cancel stay in view without scrolling.
    await expect(dialog.getByRole('button', { name: 'Create badge' })).toBeInViewport()
    await page.keyboard.press('Escape')

    await createBadge(page, { name: 'Quiet Ace', conditions: [{ metric: 'Wins', min: 1 }], icon: { upload: gif() } })
    expect([...api.clubs.media.keys()]).toEqual([expect.stringMatching(/\.gif$/)])
    expect(api.clubs.gifQueries).toEqual([])
  })
})
