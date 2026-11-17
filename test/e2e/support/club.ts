import { expect, type Locator, type Page } from '@playwright/test'
import { appNav } from './appShell'
import { gotoReady, pageReady } from './pageReady'

/**
 * Creates a club from the Clubs picker with the step-by-step form, keeping the
 * default colours and fee, and resolves on its new dashboard.
 */
export async function createClub(page: Page, name: string, description = '') {
  await gotoReady(page, '/clubs')
  await page.getByRole('button', { name: 'Add a club' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create a club' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Club name').fill(name)
  if (description) await dialog.getByLabel('Description (optional)').fill(description)
  await toReview(dialog)
  await dialog.getByRole('button', { name: 'Create club' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]{36}$/)
  await pageReady(page)
  // A new club's dashboard opens "Finish setting up" once; keep the defaults for now.
  await closeClubSetup(page)
  await expect(clubTitle(page, name)).toBeVisible()
}

/** Closes "Finish setting up" (opened by itself on a new club's dashboard). */
export async function closeClubSetup(page: Page) {
  const setup = page.getByRole('dialog', { name: 'Finish setting up' })
  await expect(setup).toBeVisible()
  await setup.getByRole('button', { name: 'Keep the defaults for now' }).click()
  await expect(setup).toBeHidden()
}

/** Clicks Next through the create-a-club steps until the review. */
export async function toReview(dialog: Locator) {
  while (await dialog.getByRole('button', { name: 'Next' }).isVisible()) await dialog.getByRole('button', { name: 'Next' }).click()
  await expect(dialog.getByRole('heading', { name: 'Review' })).toBeVisible()
}

/** The club page's heading. */
export const clubTitle = (page: Page, name: string) => page.getByRole('heading', { level: 1, name })

type ClubPageName = 'Dashboard' | 'Sessions' | 'Members' | 'Badges' | 'Invoices' | 'Expenses' | 'Billers' | 'Accounting'

/** Opens one of the club's pages from the sidebar and waits for it. */
export async function openClubPage(page: Page, name: ClubPageName) {
  const link = appNav(page).getByRole('link', { name, exact: true })
  await link.click()
  await expect(link).toHaveAttribute('aria-current', 'page')
  await pageReady(page)
}

type SettingsGroup = 'General' | 'Social links' | 'Joining' | 'Appearance' | 'Fees' | 'Delete club' | 'Payment QR codes'

/** Opens the club's settings on a group and returns the dialog. */
export async function openClubSettings(page: Page, group: SettingsGroup = 'General') {
  await page.getByRole('button', { name: / settings$/ }).first().click()
  const dialog = page.getByRole('dialog', { name: / settings$/ })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('navigation', { name: 'Club settings' }).getByRole('button', { name: new RegExp(group) }).click()
  await expect(dialog.getByRole('heading', { name: group })).toBeVisible()
  return dialog
}

/** Opens a club photo's editor from the dashboard's banner: straight away with no photo, through the viewer's Edit otherwise. */
export async function openPhotoEditor(page: Page, club: string, kind: 'profile' | 'cover') {
  const add = page.getByRole('button', { name: `Add a ${kind} photo to ${club}` })
  if (await add.isVisible()) await add.click()
  else {
    await page.getByRole('button', { name: `View ${club} ${kind} photo` }).click()
    await page.getByRole('button', { name: 'Edit photo' }).click()
  }
  const dialog = page.getByRole('dialog', { name: new RegExp(`(Add a|Change) ${kind} photo`) })
  await expect(dialog).toBeVisible()
  return dialog
}

/** The file picker behind a photo field ("Profile photo", "Cover photo"); hidden, so set files on it directly. */
export const photoInput = (scope: Page | Locator, label: string) => scope.locator('input[type="file"]').and(scope.getByLabel(label, { exact: true }))
