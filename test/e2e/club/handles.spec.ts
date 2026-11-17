import { randomUUID } from 'node:crypto'
import { closeClubSetup, openClubSettings } from '../support/club'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

const infoCard = (page: import('@playwright/test').Page) => page.locator('[data-slot="card"]').filter({ has: page.getByText('Club info', { exact: true }) }).first()

test.describe('club handles and links', () => {
  test('a new club needs a free @handle before it can go on, and shows it once created', async ({ page, api }) => {
    api.clubs.seed(club(randomUUID(), 'Smash', { handle: 'smash' }))
    await gotoReady(page, '/clubs')
    await page.getByRole('button', { name: 'Add a club' }).click()
    const dialog = page.getByRole('dialog', { name: 'Create a club' })

    // The handle follows the name, and is checked as it changes.
    await dialog.getByLabel('Club name').fill('Smash')
    await expect(dialog.getByLabel('Handle')).toHaveValue('smash')
    await expect(dialog.getByRole('status').filter({ hasText: "@smash is already another club's handle." })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled()

    await dialog.getByLabel('Handle').fill('bad handle')
    await expect(dialog.getByRole('status').filter({ hasText: 'letters, numbers, dots and underscores' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled()

    await dialog.getByLabel('Handle').fill('@Smash.Masters')
    await expect(dialog.getByRole('status').filter({ hasText: '@smash.masters is available' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Next' }).click()
    while (await dialog.getByRole('button', { name: 'Next' }).isVisible()) await dialog.getByRole('button', { name: 'Next' }).click()
    await expect(dialog.getByRole('definition').filter({ hasText: '@smash.masters' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Create club' }).click()
    await expect(dialog).toBeHidden()
    await pageReady(page)
    await closeClubSetup(page)

    await expect(page.getByText('@smash.masters').first()).toBeVisible()
    await expect(infoCard(page)).toContainText('@smash.masters')
  })

  test('social links are set in the settings and shown in the club info', async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(id, 'Linked Club', { handle: 'linked' }))
    await gotoReady(page, `/clubs/${id}`)
    await closeClubSetup(page)
    const settings = await openClubSettings(page, 'Social links')

    await settings.getByRole('button', { name: 'Add link' }).click()
    await settings.getByLabel('Link 1 address').fill('facebook.com/linkedclub')
    await settings.getByRole('button', { name: 'Save links' }).click()
    // Instagram is the kind picked, so a Facebook address is refused.
    await expect(settings.getByRole('alert')).toContainText("That Instagram link isn't on instagram.com.")

    await settings.getByLabel('Link 1 address').fill('instagram.com/linkedclub')
    await settings.getByRole('button', { name: 'Add link' }).click()
    await settings.getByRole('combobox', { name: 'Link 2 kind' }).click()
    await page.getByRole('option', { name: 'Website' }).click()
    await settings.getByLabel('Link 2 address').fill('https://linked.club/join')
    await settings.getByRole('button', { name: 'Save links' }).click()
    await pageReady(page)
    await page.keyboard.press('Escape')

    const links = infoCard(page).getByRole('list', { name: 'Linked Club links' })
    await expect(links.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/linkedclub')
    // Each link carries its platform's logo.
    await expect(links.getByRole('link', { name: 'Instagram' }).locator('svg path')).toHaveAttribute('d', /^M/)
    await expect(links.getByRole('link', { name: /Website/ })).toHaveAttribute('href', 'https://linked.club/join')
  })

  test('an older club without a handle must pick one before anything else, and it must be free', async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(randomUUID(), 'Taken', { handle: 'taken' }))
    api.clubs.seed(club(id, 'Old Club', { handle: null }))
    await gotoReady(page, `/clubs/${id}/members`)
    const dialog = page.getByRole('dialog', { name: 'Pick a handle for Old Club' })
    await expect(dialog).toBeVisible()
    // It can't be closed: no close button, and Escape leaves it open.
    await expect(dialog.getByRole('button', { name: 'Close' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    // It starts from the club's name.
    await expect(dialog.getByLabel('Handle')).toHaveValue('oldclub')

    await dialog.getByLabel('Handle').fill('taken')
    await expect(dialog.getByRole('status').filter({ hasText: "@taken is already another club's handle." })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Save handle' })).toBeDisabled()
    await dialog.getByLabel('Handle').fill('oldclub')
    await expect(dialog.getByRole('status').filter({ hasText: '@oldclub is available' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Save handle' }).click()
    await pageReady(page)
    await expect(dialog).toBeHidden()
    await expect(page.getByText('@oldclub').first()).toBeVisible()
  })
})
