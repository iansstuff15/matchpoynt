import { expect, type Locator, type Page } from '@playwright/test'
import { gotoReady, pageReady } from './pageReady'

/** Creates a club from the Clubs picker and resolves on its new page. */
export async function createClub(page: Page, name: string, description = '') {
  await gotoReady(page, '/clubs')
  await page.getByRole('button', { name: 'Add a club' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create a club' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Club name').fill(name)
  if (description) await dialog.getByLabel('Description').fill(description)
  await dialog.getByRole('button', { name: 'Create club' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]{36}$/)
  await pageReady(page)
  await expect(clubTitle(page, name)).toBeVisible()
}

/** The club page's heading. */
export const clubTitle = (page: Page, name: string) => page.getByRole('heading', { level: 1, name })

/** Opens one of the club page's tabs and waits for it. */
export async function openClubTab(page: Page, tab: 'Sessions' | 'Members' | 'Badges' | 'Club info') {
  await page.getByRole('tab', { name: tab }).click()
  await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
  await pageReady(page)
}

/** The file picker behind a photo field ("Profile photo", "Cover photo"); hidden, so set files on it directly. */
export const photoInput = (scope: Page | Locator, label: string) => scope.locator('input[type="file"]').and(scope.getByLabel(label, { exact: true }))
