import { createClub, openClubTab, photoInput } from '../support/club'
import { jpeg, notAnImage, png } from '../support/images'
import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'

test.describe('club photos', () => {
  test.beforeEach(async ({ page }) => {
    await createClub(page, 'Lakeside')
  })

  test('uploading, replacing and removing the profile photo', async ({ page, api }) => {
    await openClubTab(page, 'Club info')
    await expect(page.getByRole('img', { name: 'No profile photo yet' })).toBeVisible()

    await photoInput(page, 'Profile photo').setInputFiles(png(64, 64))
    await pageReady(page)
    await expect(page.getByRole('img', { name: 'Current profile photo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Replace photo' }).first()).toBeVisible()
    // The API stored it converted to WebP, and serves it back.
    expect([...api.clubs.media.keys()]).toEqual([expect.stringMatching(/\/avatar-[0-9a-f-]{36}\.webp$/)])
    await expect(page.getByRole('button', { name: 'View Lakeside profile photo' })).toBeVisible()

    // Replacing keeps one profile photo: the old one is deleted.
    const first = [...api.clubs.media.keys()][0]
    await photoInput(page, 'Profile photo').setInputFiles(png(80, 80, [30, 120, 220]))
    await pageReady(page)
    await expect.poll(() => [...api.clubs.media.keys()]).not.toContain(first)
    expect(api.clubs.media.size).toBe(1)

    await page.getByRole('button', { name: 'Remove' }).first().click()
    await pageReady(page)
    await expect(page.getByRole('img', { name: 'No profile photo yet' })).toBeVisible()
    expect(api.clubs.media.size).toBe(0)
  })

  test('adding a cover photo from the club header, then viewing it', async ({ page, api }) => {
    // No cover yet: clicking the header goes straight to adding one.
    await page.getByRole('button', { name: 'Add a cover photo to Lakeside' }).click()
    const edit = page.getByRole('dialog', { name: 'Add a cover photo' })
    await expect(edit).toBeVisible()
    await photoInput(edit, 'Cover photo').setInputFiles(await jpeg(320, 120))
    await pageReady(page)
    await expect(page.getByRole('dialog', { name: 'Change cover photo' })).toBeVisible()
    expect([...api.clubs.media.keys()]).toEqual([expect.stringMatching(/\/cover-[0-9a-f-]{36}\.webp$/)])
    await page.keyboard.press('Escape')

    // With a cover, the header opens the viewer, with zoom and an Edit button.
    await page.getByRole('button', { name: 'View Lakeside cover photo' }).click()
    const viewer = page.getByRole('dialog').filter({ has: page.getByRole('group', { name: 'Zoom' }) })
    await expect(viewer).toBeVisible()
    await expect(viewer.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
    await viewer.getByRole('button', { name: 'Zoom in' }).click()
    await expect(viewer.getByRole('button', { name: 'Zoom out' })).toBeEnabled()
    await viewer.getByRole('button', { name: 'Edit photo' }).click()
    await expect(page.getByRole('dialog', { name: 'Change cover photo' })).toBeVisible()
  })

  test('the API refuses a file that isn\'t really an image', async ({ page, api }) => {
    await openClubTab(page, 'Club info')
    await photoInput(page, 'Cover photo').setInputFiles(notAnImage())
    await pageReady(page)
    await expect(page.getByRole('alert').filter({ hasText: 'Photos must be JPEG, PNG or WebP images.' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'No cover photo yet' })).toBeVisible()
    expect(api.clubs.media.size).toBe(0)
  })
})
