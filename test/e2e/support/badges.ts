import { expect, type Page } from '@playwright/test'
import { openClubPage } from './club'
import type { TestFile } from './images'
import { pageReady } from './pageReady'

export interface NewBadge {
  name: string
  description?: string
  scope?: 'In one session' | 'Across all club sessions'
  /** Conditions in order; the first replaces the form's starting "3 wins". */
  conditions: { metric: string; min: number }[]
  /** Pick a GIF from search by searching `query` and choosing `title`, or upload a file. */
  icon?: { search: string; pick: string } | { upload: TestFile }
}

/** The create/edit badge dialog. */
export const badgeDialog = (page: Page, title = 'Create a badge') => page.getByRole('dialog', { name: title })

/** Sets the badge form's conditions: the first row is edited, others are added. */
async function setConditions(page: Page, conditions: NewBadge['conditions']) {
  const dialog = page.getByRole('dialog')
  for (const [i, { metric, min }] of conditions.entries()) {
    if (i > 0) await dialog.getByRole('button', { name: 'Add condition' }).click()
    await dialog.getByRole('combobox', { name: `Condition ${i + 1}` }).click()
    await page.getByRole('option', { name: metric, exact: true }).click()
    await dialog.getByLabel(`Minimum ${metric.toLowerCase()}`).fill(String(min))
  }
}

/** Creates a badge from the club's Badges tab and waits for its card. */
export async function createBadge(page: Page, badge: NewBadge) {
  await openClubPage(page, 'Badges')
  await page.getByRole('button', { name: 'New badge' }).click()
  const dialog = badgeDialog(page)
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Badge name').fill(badge.name)
  if (badge.description) await dialog.getByLabel('Description (optional)').fill(badge.description)
  if (badge.scope) await dialog.getByRole('radio', { name: new RegExp(badge.scope) }).check()
  await setConditions(page, badge.conditions)

  if (badge.icon && 'search' in badge.icon) {
    await dialog.getByRole('tab', { name: 'Search GIFs' }).click()
    await dialog.getByRole('searchbox', { name: 'Search GIFs' }).fill(badge.icon.search)
    await dialog.getByRole('button', { name: badge.icon.pick }).click()
    await expect(dialog.getByRole('button', { name: badge.icon.pick })).toHaveAttribute('aria-pressed', 'true')
  } else if (badge.icon) {
    // With GIF search off there are no tabs: uploading is the only way.
    const tab = dialog.getByRole('tab', { name: 'Upload' })
    if (await tab.count()) await tab.click()
    await dialog.locator('input[type="file"]').setInputFiles(badge.icon.upload)
    await expect(dialog.getByText(`File: ${badge.icon.upload.name}`)).toBeVisible()
  }

  await dialog.getByRole('button', { name: 'Create badge' }).click()
  await expect(dialog).toBeHidden()
  await pageReady(page)
  await expect(badgeCard(page, badge.name)).toBeVisible()
}

/** A badge's card on the Badges tab. */
export const badgeCard = (page: Page, name: string) => page.getByRole('list', { name: 'Club badges' }).getByLabel(`${name} badge`, { exact: true }).first()
