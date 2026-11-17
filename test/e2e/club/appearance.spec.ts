import type { Locator, Page } from '@playwright/test'
import { createClub, openClubSettings, openPhotoEditor, photoInput } from '../support/club'
import { png } from '../support/images'
import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { setUpSession } from '../support/session'

/** Where a positioned photo is showing: its object-position and transform. */
const placement = (img: Locator) => img.evaluate((el) => ({ position: getComputedStyle(el).objectPosition, transform: (el as HTMLElement).style.transform }))

/** Drags across the alignment frame by (dx, dy) pixels. */
async function dragFrame(page: Page, frame: Locator, dx: number, dy: number) {
  const box = (await frame.boundingBox())!
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2]
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 8 })
  await page.mouse.up()
}

const background = (el: Locator) => el.evaluate((n) => getComputedStyle(n).backgroundColor)

test.describe('aligning club photos', () => {
  test.beforeEach(async ({ page }) => {
    await createClub(page, 'Lakeside')
  })

  test('the profile photo can be dragged and zoomed, and shows that way everywhere', async ({ page }) => {
    await photoInput(await openPhotoEditor(page, 'Lakeside', 'profile'), 'Profile photo').setInputFiles(png(240, 120))
    await pageReady(page)
    const dialog = page.getByRole('dialog', { name: 'Change profile photo' })
    const frame = dialog.getByRole('slider', { name: 'Profile photo position' })
    await expect(frame).toBeVisible()

    await dragFrame(page, frame, -60, 0)
    const zoom = dialog.getByRole('group', { name: 'Profile photo zoom' }).getByRole('slider')
    await zoom.focus()
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await expect(dialog.getByText('1.50×')).toBeVisible()
    await dialog.getByRole('button', { name: 'Save position' }).click()
    await expect(dialog).toBeHidden()
    await pageReady(page)

    // The club header shows the saved position: moved right of centre, zoomed 1.5×.
    // Polled: the saved position reaches the header a render after the dialog closes.
    const avatar = page.getByRole('img', { name: 'Lakeside profile photo' }).first()
    await expect.poll(async () => (await placement(avatar)).transform).toBe('scale(1.5)')
    await expect.poll(async () => Number.parseFloat((await placement(avatar)).position)).toBeGreaterThan(50)
    // Still there after a reload: the API saved it.
    await page.reload()
    await pageReady(page)
    expect((await placement(page.getByRole('img', { name: 'Lakeside profile photo' }).first())).transform).toBe('scale(1.5)')
  })

  test('the cover photo aligns from the club header, with the keyboard too', async ({ page }) => {
    await photoInput(await openPhotoEditor(page, 'Lakeside', 'cover'), 'Cover photo').setInputFiles(png(400, 400))
    await pageReady(page)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'View Lakeside cover photo' }).click()
    await page.getByRole('button', { name: 'Edit photo' }).click()
    const dialog = page.getByRole('dialog', { name: 'Change cover photo' })
    const frame = dialog.getByRole('slider', { name: 'Cover photo position' })
    await frame.focus()
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowUp')
    await expect(frame).toHaveAttribute('aria-valuetext', '50% across, 20% down')
    await dialog.getByRole('button', { name: 'Save position' }).click()
    await pageReady(page)
    await page.keyboard.press('Escape')

    const cover = page.getByRole('button', { name: 'View Lakeside cover photo' }).locator('img')
    expect((await placement(cover)).position).toBe('50% 20%')
  })

  test('a new photo starts centred again', async ({ page }) => {
    await photoInput(await openPhotoEditor(page, 'Lakeside', 'cover'), 'Cover photo').setInputFiles(png(400, 400))
    await pageReady(page)
    const dialog = page.getByRole('dialog', { name: 'Change cover photo' })
    await dialog.getByRole('slider', { name: 'Cover photo position' }).focus()
    await page.keyboard.press('Shift+ArrowDown')
    await dialog.getByRole('button', { name: 'Save position' }).click()
    await expect(dialog).toBeHidden()
    await pageReady(page)

    await photoInput(await openPhotoEditor(page, 'Lakeside', 'cover'), 'Cover photo').setInputFiles(png(300, 300, [10, 200, 90]))
    await pageReady(page)
    await page.keyboard.press('Escape')
    const cover = page.getByRole('button', { name: 'View Lakeside cover photo' }).locator('img')
    expect((await placement(cover)).position).toBe('50% 50%')
  })
})

test.describe('club colours', () => {
  test('a preset recolours the app, and the club can go back to Matchpoynt colours', async ({ page }) => {
    await createClub(page, 'Ocean Club')
    await openClubSettings(page, 'Appearance')
    const sidebar = page.locator('[data-slot="sidebar-inner"]')
    const saveInfo = page.getByRole('button', { name: 'Save colours' })
    const before = { sidebar: await background(sidebar), primary: await background(saveInfo) }

    await page.getByRole('list', { name: 'Colour presets' }).getByRole('button', { name: 'Ocean' }).click()
    await page.getByRole('button', { name: 'Save colours' }).click()
    await pageReady(page)
    await expect.poll(() => background(sidebar)).toBe('rgb(15, 23, 42)')
    await expect.poll(() => background(saveInfo)).toBe('rgb(37, 99, 235)')

    // The rest of the app follows the club picked in the sidebar.
    await gotoReady(page, '/app')
    await expect.poll(() => background(sidebar)).toBe('rgb(15, 23, 42)')

    await page.goBack()
    await pageReady(page)
    await openClubSettings(page, 'Appearance')
    await page.getByRole('button', { name: 'Use Matchpoynt colours' }).click()
    await pageReady(page)
    await expect.poll(() => background(sidebar)).toBe(before.sidebar)
    await expect.poll(() => background(saveInfo)).toBe(before.primary)
  })

  test('a custom colour gets readable text from the API', async ({ page }) => {
    await createClub(page, 'Sunny Club')
    await openClubSettings(page, 'Appearance')
    await page.getByLabel('Accent colour').fill('#fde047')
    await page.getByRole('button', { name: 'Save colours' }).click()
    await pageReady(page)
    const saveInfo = page.getByRole('button', { name: 'Save colours' })
    await expect.poll(() => background(saveInfo)).toBe('rgb(253, 224, 71)')
    // Bright yellow gets dark text, not white.
    expect(await saveInfo.evaluate((n) => getComputedStyle(n).color)).toBe('rgb(23, 23, 23)')
  })

  test("a club's session keeps that club's colours, whichever club is picked", async ({ page, api }) => {
    await createClub(page, 'Blue Club')
    await openClubSettings(page, 'Appearance')
    await page.getByRole('list', { name: 'Colour presets' }).getByRole('button', { name: 'Ocean' }).click()
    await page.getByRole('button', { name: 'Save colours' }).click()
    await pageReady(page)
    const blueId = api.clubs.idOf('Blue Club')

    await createClub(page, 'Red Club')
    await openClubSettings(page, 'Appearance')
    await page.getByRole('list', { name: 'Colour presets' }).getByRole('button', { name: 'Crimson' }).click()
    await page.getByRole('button', { name: 'Save colours' }).click()
    await pageReady(page)

    await setUpSession(page, { players: ['Ana', 'Ben'] })
    const sessionId = api.sessions.latestId()
    api.sessions.assignClub(sessionId, blueId)
    await gotoReady(page, `/app/${sessionId}`)
    // Red Club is the one picked in the sidebar, but this session is Blue Club's.
    await expect(page.getByRole('button', { name: 'Switch club' })).toContainText('Red Club')
    await expect.poll(() => background(page.locator('[data-slot="sidebar-inner"]'))).toBe('rgb(15, 23, 42)')
  })
})

test.describe('page colour and saved themes', () => {
  test('the page colour recolours the centre panel, with readable text and cards on it', async ({ page }) => {
    await createClub(page, 'Night Club')
    await openClubSettings(page, 'Appearance')
    const panel = page.locator('.app-shell-page')
    // By id: the open settings dialog hides the page behind it from role queries.
    const heading = page.locator('h1#club-title')

    await page.getByRole('list', { name: 'Colour presets' }).getByRole('button', { name: 'Midnight' }).click()
    await page.getByRole('button', { name: 'Save colours' }).click()
    await pageReady(page)
    await expect.poll(() => background(panel)).toBe('rgb(15, 23, 42)')
    // Dark page: light text on it, and cards a step lighter than the page.
    await expect.poll(() => heading.evaluate((n) => getComputedStyle(n).color)).toBe('rgb(255, 255, 255)')
    const card = page.locator('[data-slot="card"]').first()
    await expect.poll(() => background(card)).not.toBe('rgb(15, 23, 42)')
    await expect.poll(() => background(card)).not.toBe('rgb(255, 255, 255)')

    // A custom light page from the picker.
    await page.getByLabel('Page colour').fill('#faf5eb')
    await page.getByRole('button', { name: 'Save colours' }).click()
    await pageReady(page)
    await expect.poll(() => background(panel)).toBe('rgb(250, 245, 235)')
    await expect.poll(() => heading.evaluate((n) => getComputedStyle(n).color)).toBe('rgb(23, 23, 23)')
  })

  test('custom colours can be saved as a named theme, picked again and deleted', async ({ page }) => {
    await createClub(page, 'Theme Club')
    await openClubSettings(page, 'Appearance')
    await page.getByLabel('Accent colour').fill('#fde047')
    await page.getByLabel('Sidebar colour').fill('#1e3a8a')
    await page.getByLabel('Page colour').fill('#eff6ff')
    await page.getByLabel('Theme name').fill('Finals night')
    await page.getByRole('button', { name: 'Save theme' }).click()
    await pageReady(page)
    const savedList = page.getByRole('list', { name: 'Saved themes' })
    await expect(savedList.getByRole('button', { name: 'Finals night', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Theme name')).toHaveValue('')

    // Another preset, then the saved theme brings all three colours back.
    await page.getByRole('list', { name: 'Colour presets' }).getByRole('button', { name: 'Ocean' }).click()
    await expect(savedList.getByRole('button', { name: 'Finals night', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await savedList.getByRole('button', { name: 'Finals night', exact: true }).click()
    await expect(page.getByLabel('Page colour')).toHaveValue('#eff6ff')
    await page.getByRole('button', { name: 'Save colours' }).click()
    await pageReady(page)
    await expect.poll(() => background(page.locator('.app-shell-page'))).toBe('rgb(239, 246, 255)')

    // The same name again is refused, with the reason.
    await page.getByLabel('Theme name').fill('finals NIGHT')
    await page.getByRole('button', { name: 'Save theme' }).click()
    await expect(page.getByRole('alert').filter({ hasText: "There's already a theme called finals NIGHT" })).toBeVisible()

    // Still there after a reload, then deleted.
    await page.reload()
    await pageReady(page)
    await openClubSettings(page, 'Appearance')
    await savedList.getByRole('button', { name: 'Delete the theme Finals night' }).click()
    await pageReady(page)
    await expect(page.getByRole('list', { name: 'Saved themes' })).toHaveCount(0)
  })
})
