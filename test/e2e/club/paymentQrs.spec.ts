import { expect, test } from '../support/mockApi'
import { createClub, openClubSettings } from '../support/club'
import { png } from '../support/images'
import { pageReady } from '../support/pageReady'

// Payment QR codes: named, framed like the club's photos before uploading, and framed again after.
test.describe('payment QR codes', () => {
  test('a QR code is named, framed, uploaded, framed again and removed', async ({ page }) => {
    await createClub(page, 'Ledger Club')
    const settings = await openClubSettings(page, 'Payment QR codes')
    await expect(settings.getByText('No QR codes yet.')).toBeVisible()

    await settings.getByLabel('QR code image').setInputFiles(png(120, 160))
    // The aligner appears with the picked image; uploading waits for a name.
    const frame = settings.getByRole('slider', { name: 'New QR code position' })
    await expect(frame).toBeVisible()
    const upload = settings.getByRole('button', { name: 'Upload QR code' })
    await expect(upload).toBeDisabled()
    await settings.getByLabel('Name').fill('GCash')
    await frame.focus()
    await page.keyboard.press('Shift+ArrowDown')
    await expect(frame).toHaveAttribute('aria-valuetext', '50% across, 60% down')
    await upload.click()
    await pageReady(page)

    const list = settings.getByRole('list', { name: 'Payment QR codes' })
    await expect(list.getByRole('img', { name: 'GCash payment QR code' })).toBeVisible()
    await expect(list.getByRole('img', { name: 'GCash payment QR code' })).toHaveAttribute('style', /object-position: 50% 60%/)

    // Framed again later, like a photo.
    await list.getByRole('button', { name: 'Adjust the framing of the GCash QR code' }).click()
    const again = list.getByRole('slider', { name: 'GCash QR code position' })
    await again.focus()
    await page.keyboard.press('Shift+ArrowUp')
    await list.getByRole('button', { name: 'Save position' }).click()
    await pageReady(page)
    await expect(list.getByRole('img', { name: 'GCash payment QR code' })).toHaveAttribute('style', /object-position: 50% 50%/)

    await list.getByRole('button', { name: 'Remove the GCash QR code' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click()
    await pageReady(page)
    await expect(settings.getByText('No QR codes yet.')).toBeVisible()
  })
})
