import type { Locator, Page } from '@playwright/test'
import { createClub, openClubTab, photoInput } from '../support/club'
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
    await openClubTab(page, 'Club info')
  })

  test('the profile photo can be dragged and zoomed, and shows that way everywhere', async ({ page }) => {
    await photoInput(page, 'Profile photo').setInputFiles(png(240, 120))
    await pageReady(page)
    await page.getByRole('button', { name: 'Align' }).first().click()
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
    const avatar = page.getByRole('img', { name: 'Lakeside profile photo' }).first()
    const shown = await placement(avatar)
    expect(shown.transform).toBe('scale(1.5)')
    expect(Number.parseFloat(shown.position)).toBeGreaterThan(50)
    // Still there after a reload: the API saved it.
    await page.reload()
    await pageReady(page)
    expect((await placement(page.getByRole('img', { name: 'Lakeside profile photo' }).first())).transform).toBe('scale(1.5)')
  })

  test('the cover photo aligns from the club header, with the keyboard too', async ({ page }) => {
    await photoInput(page, 'Cover photo').setInputFiles(png(400, 400))
    await pageReady(page)
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
    await photoInput(page, 'Cover photo').setInputFiles(png(400, 400))
    await pageReady(page)
    await page.getByRole('button', { name: 'Align' }).last().click()
    const dialog = page.getByRole('dialog', { name: 'Change cover photo' })
    await dialog.getByRole('slider', { name: 'Cover photo position' }).focus()
    await page.keyboard.press('Shift+ArrowDown')
    await dialog.getByRole('button', { name: 'Save position' }).click()
    await expect(dialog).toBeHidden()
    await pageReady(page)

    await photoInput(page, 'Cover photo').setInputFiles(png(300, 300, [10, 200, 90]))
    await pageReady(page)
    const cover = page.getByRole('button', { name: 'View Lakeside cover photo' }).locator('img')
    expect((await placement(cover)).position).toBe('50% 50%')
  })
})

test.describe('club colours', () => {
  test('a preset recolours the app, and the club can go back to Matchpoynt colours', async ({ page }) => {
    await createClub(page, 'Ocean Club')
    await openClubTab(page, 'Club info')
    const sidebar = page.locator('[data-slot="sidebar-inner"]')
    const saveInfo = page.getByRole('button', { name: 'Save club info' })
    const before = { sidebar: await background(sidebar), primary: await background(saveInfo) }

    await page.getByRole('list', { name: 'Colour presets' }).getByRole('button', { name: 'Ocean' }).click()
    await page.getByRole('button', { name: 'Save colours' }).click()
    await pageReady(page)
    await expect.poll(() => background(sidebar)).toBe('rgb(15, 23, 42)')
    await expect.poll(() => background(saveInfo)).toBe('rgb(37, 99, 235)')

    // The rest of the app follows the club picked in the sidebar.
    await gotoReady(page, '/app/past')
    await expect.poll(() => background(sidebar)).toBe('rgb(15, 23, 42)')

    await page.goBack()
    await pageReady(page)
    await page.getByRole('button', { name: 'Use Matchpoynt colours' }).click()
    await pageReady(page)
    await expect.poll(() => background(sidebar)).toBe(before.sidebar)
    await expect.poll(() => background(saveInfo)).toBe(before.primary)
  })

  test('a custom colour gets readable text from the API', async ({ page }) => {
    await createClub(page, 'Sunny Club')
    await openClubTab(page, 'Club info')
    await page.getByLabel('Accent colour').fill('#fde047')
    await page.getByRole('button', { name: 'Save colours' }).click()
    await pageReady(page)
    const saveInfo = page.getByRole('button', { name: 'Save club info' })
    await expect.poll(() => background(saveInfo)).toBe('rgb(253, 224, 71)')
    // Bright yellow gets dark text, not white.
    expect(await saveInfo.evaluate((n) => getComputedStyle(n).color)).toBe('rgb(23, 23, 23)')
  })

  test("a club's session keeps that club's colours, whichever club is picked", async ({ page, api }) => {
    await createClub(page, 'Blue Club')
    await openClubTab(page, 'Club info')
    await page.getByRole('list', { name: 'Colour presets' }).getByRole('button', { name: 'Ocean' }).click()
    await page.getByRole('button', { name: 'Save colours' }).click()
    await pageReady(page)
    const blueId = api.clubs.idOf('Blue Club')

    await createClub(page, 'Red Club')
    await openClubTab(page, 'Club info')
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
