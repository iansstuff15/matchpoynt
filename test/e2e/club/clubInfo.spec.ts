import { appNav } from '../support/appShell'
import { closeClubSetup, clubTitle, createClub, openClubSettings, toReview } from '../support/club'
import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { chooseFee } from '../support/session'

const infoCard = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Club info' }).or(page.locator('[data-slot="card"]').filter({ has: page.getByText('Club info', { exact: true }) })).first()

test.describe('club information', () => {
  test('creating a club with the defaults opens its dashboard and adds it to the sidebar and picker', async ({ page }) => {
    await createClub(page, 'Riverside Smashers', 'Tuesday and Thursday nights at the riverside hall.')

    // The dashboard shows the club's info, read only, with what's still to set up.
    await expect(infoCard(page)).toContainText('Tuesday and Thursday nights at the riverside hall.')
    await expect(infoCard(page)).toContainText('Matchpoynt’s own')
    await expect(infoCard(page)).toContainText('No fee')
    await expect(page.getByRole('link', { name: 'All clubs' }).and(page.locator('main a:not(nav a)'))).toHaveCount(0)
    await expect(appNav(page).getByText('Riverside Smashers').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Switch club' })).toContainText('Riverside Smashers')

    await gotoReady(page, '/clubs')
    await expect(page.getByRole('list', { name: 'Your clubs' }).getByRole('link', { name: /^Open Riverside Smashers/ })).toBeVisible()
  })

  test('the create form asks for each setting step by step, and saves the colours and fee picked', async ({ page }) => {
    await gotoReady(page, '/clubs')
    await page.getByRole('button', { name: 'Add a club' }).click()
    const dialog = page.getByRole('dialog', { name: 'Create a club' })
    await dialog.getByLabel('Club name').fill('Court Kings')
    await dialog.getByRole('button', { name: 'Next' }).click()

    await expect(dialog.getByRole('heading', { name: 'Colours' })).toBeVisible()
    await dialog.getByRole('list', { name: 'Colour presets' }).getByRole('button', { name: 'Ocean' }).click()
    await dialog.getByRole('button', { name: 'Next' }).click()

    await expect(dialog.getByRole('heading', { name: 'Fees' })).toBeVisible()
    await chooseFee(dialog, { kind: 'Per game', currency: 'USD', perGame: '4' })
    await dialog.getByRole('button', { name: 'Next' }).click()

    await expect(dialog.getByRole('heading', { name: 'Review' })).toBeVisible()
    await expect(dialog.getByRole('definition').filter({ hasText: '#2563eb' })).toBeVisible()
    await expect(dialog).toContainText('Per game · $4.00 per game')
    await dialog.getByRole('button', { name: 'Create club' }).click()
    await expect(dialog).toBeHidden()
    await pageReady(page)

    // The new club greets with what's left to set up: the colours are done.
    const setup = page.getByRole('dialog', { name: 'Finish setting up' })
    await expect(setup.getByRole('list', { name: 'Still to set up' })).toContainText('Add a profile photo')
    await expect(setup.getByRole('list', { name: 'Still to set up' })).not.toContainText('Pick the club’s colours')
    await closeClubSetup(page)
    await expect(clubTitle(page, 'Court Kings')).toBeVisible()
    await expect(infoCard(page)).toContainText('$4.00 per game')
    await expect(infoCard(page)).toContainText('Accent #2563eb')
  })

  test('"Use default" keeps a step as it was, and Next waits for the name and a free handle', async ({ page }) => {
    await gotoReady(page, '/clubs')
    await page.getByRole('button', { name: 'Add a club' }).click()
    const dialog = page.getByRole('dialog', { name: 'Create a club' })
    // Mandatory fields first: Next stays off, and says what's missing, until the name and a free handle are in.
    await expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled()
    await expect(dialog.getByRole('status').filter({ hasText: 'Name the club.' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Step 2/ })).toBeDisabled()
    await dialog.getByLabel('Club name').fill('No Name Club')
    await dialog.getByLabel('Handle').fill('noname')
    await expect(dialog.getByRole('status').filter({ hasText: '@noname is available' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Next' }).click()
    await dialog.getByRole('list', { name: 'Colour presets' }).getByRole('button', { name: 'Royal' }).click()
    await dialog.getByRole('button', { name: 'Use default' }).click()
    await expect(dialog.getByRole('heading', { name: 'Fees' })).toBeVisible()
    await toReview(dialog)
    await expect(dialog).toContainText('Matchpoynt’s own (default)')
    await expect(dialog).toContainText('No fee (default)')
    await expect(dialog.getByRole('button', { name: 'Create club' })).toBeEnabled()
  })

  test('the settings edit the name and description, and the dashboard shows them', async ({ page }) => {
    await createClub(page, 'Northside Rally')
    const settings = await openClubSettings(page, 'General')
    await settings.getByLabel('Club name').fill('Northside Rally Club')
    await settings.getByLabel('Description').fill('Open play every Saturday morning.')
    await settings.getByRole('button', { name: 'Save club info' }).click()
    await pageReady(page)
    await page.keyboard.press('Escape')

    await expect(clubTitle(page, 'Northside Rally Club')).toBeVisible()
    await expect(infoCard(page)).toContainText('Open play every Saturday morning.')
    await expect(appNav(page).getByText('Northside Rally Club').first()).toBeVisible()

    // Still saved after a reload: the change went to the API, not just the screen.
    await page.reload()
    await pageReady(page)
    await expect(clubTitle(page, 'Northside Rally Club')).toBeVisible()
  })

  test('"Finish setting up" opens by itself once, then from the banner, and opens what is missing', async ({ page }) => {
    await createClub(page, 'Checklist Club')
    // Not again on the next visit: the banner's button opens it.
    await page.reload()
    await pageReady(page)
    await expect(page.getByRole('dialog', { name: 'Finish setting up' })).toHaveCount(0)
    await page.getByRole('button', { name: /^Finish setting up · \d+ left$/ }).click()
    const setup = page.getByRole('dialog', { name: 'Finish setting up' })
    await setup.getByRole('button', { name: 'Pick colours' }).click()
    await expect(setup).toBeHidden()
    await expect(page.getByRole('dialog', { name: 'Checklist Club settings' }).getByRole('heading', { name: 'Appearance' })).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /^Finish setting up/ }).click()
    await setup.getByRole('button', { name: 'Add photo' }).click()
    await expect(page.getByRole('dialog', { name: 'Add a profile photo' })).toBeVisible()
  })

  test('deleting a club asks first, then removes it everywhere', async ({ page }) => {
    await createClub(page, 'Harbour Club')
    const settings = await openClubSettings(page, 'Delete club')

    await settings.getByRole('button', { name: 'Delete this club' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Delete Harbour Club?' })
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Keep club' }).click()
    await expect(confirm).toBeHidden()

    await settings.getByRole('button', { name: 'Delete this club' }).click()
    await confirm.getByRole('button', { name: 'Delete club' }).click()
    await expect(page).toHaveURL('/clubs')
    await pageReady(page)
    await expect(page.getByRole('link', { name: /^Open Harbour Club/ })).toHaveCount(0)
  })
})
