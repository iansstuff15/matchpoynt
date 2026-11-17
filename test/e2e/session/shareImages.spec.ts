import { expect, test } from '../support/mockApi'
import { finishMatch, openLeaderboard, setUpSession } from '../support/session'
import { pageReady } from '../support/pageReady'

// Share images: drawn in the browser on a black, white or transparent background.
test.describe('share images', () => {
  test('only the signed-in player can share their own, on black, white or transparent', async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    await setUpSession(page, { players: ['ana.reyes', 'Ben', 'Cy', 'Dee'].map((name) => ({ name, checkedIn: true })) })
    await page.locator('.court-card').first().getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await finishMatch(page, 'Court 1', [
      [21, 10],
      [21, 12],
    ])
    await openLeaderboard(page)
    // Only their own entry has a Share button.
    await expect(page.getByRole('button', { name: /^Share .+'s achievements$/ })).toHaveCount(1)
    await page.getByRole('button', { name: "Share ana.reyes's achievements" }).click()
    const dialog = page.getByRole('dialog', { name: "Share ana.reyes's achievements" })
    const images = dialog.getByRole('list', { name: /'s images$/ })
    await expect(dialog.getByRole('radio', { name: 'Black' })).toBeChecked()
    await expect(images.getByRole('img').first()).toBeVisible()
    // Reads the first image's corner pixel: opaque on black and white, see-through on transparent.
    const corner = () =>
      images
        .getByRole('img')
        .first()
        .evaluate(async (img: HTMLImageElement) => {
          // The image is swapped when the background changes; one caught mid-swap is read again by the poll.
          if (!(await img.decode().then(() => true, () => false))) return [-1, -1, -1, -1]
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          const ctx = c.getContext('2d')!
          ctx.drawImage(img, 0, 0)
          return Array.from(ctx.getImageData(2, 2, 1, 1).data)
        })
    await expect.poll(async () => (await corner())[3]).toBe(255)
    expect((await corner())[0]!).toBeLessThan(80)

    await dialog.getByText('White', { exact: true }).click()
    await expect(dialog.getByRole('radio', { name: 'White' })).toBeChecked()
    await expect.poll(async () => (await corner())[0]).toBeGreaterThan(200)

    await dialog.getByText('Transparent', { exact: true }).click()
    await expect.poll(async () => (await corner())[3]).toBe(0)
    await expect(images.getByRole('img').first()).toHaveClass(/share-card-transparent/)
  })

  test('in guest mode nobody is on the leaderboard as "you", so there are no Share buttons', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben', 'Cy', 'Dee'].map((name) => ({ name, checkedIn: true })) })
    await page.locator('.court-card').first().getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await finishMatch(page, 'Court 1', [
      [21, 10],
      [21, 12],
    ])
    await openLeaderboard(page)
    await expect(page.getByRole('button', { name: /^Share .+'s achievements$/ })).toHaveCount(0)
  })

  test('the whole leaderboard downloads as one image, on any background', async ({ page }) => {
    await setUpSession(page, { players: ['Ana', 'Ben', 'Cy', 'Dee', 'Eli'].map((name) => ({ name, checkedIn: true })) })
    await page.locator('.court-card').first().getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await finishMatch(page, 'Court 1', [
      [21, 10],
      [21, 12],
    ])
    await openLeaderboard(page)
    await page.getByRole('button', { name: 'Download leaderboard' }).click()
    const dialog = page.getByRole('dialog', { name: 'Download the leaderboard' })
    const image = dialog.getByRole('img', { name: 'Badminton session leaderboard' })
    await expect(image).toBeVisible()
    // Taller than a card: the header, the podium, and a row for each of the five players.
    const size = await image.evaluate(async (img: HTMLImageElement) => (await img.decode(), [img.naturalWidth, img.naturalHeight]))
    expect(size[0]).toBe(1080)
    expect(size[1]!).toBeGreaterThan(1080)

    await dialog.getByText('Transparent', { exact: true }).click()
    await expect(dialog.getByRole('img', { name: 'Badminton session leaderboard' })).toHaveClass(/share-card-transparent/)
    const download = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Download' }).click()
    expect((await download).suggestedFilename()).toBe('matchpoynt-badminton-session-leaderboard-transparent.png')
  })
})
