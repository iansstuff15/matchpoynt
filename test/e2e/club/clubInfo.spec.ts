import { appNav } from '../support/appShell'
import { clubTitle, createClub, openClubTab } from '../support/club'
import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

test.describe('club information', () => {
  test('creating a club opens its page and adds it to the sidebar and picker', async ({ page }) => {
    await createClub(page, 'Riverside Smashers', 'Tuesday and Thursday nights at the riverside hall.')

    await expect(page.getByText('Tuesday and Thursday nights at the riverside hall.')).toBeVisible()
    await expect(appNav(page).getByText('Riverside Smashers')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Switch club' })).toContainText('Riverside Smashers')

    await gotoReady(page, '/clubs')
    await expect(page.getByRole('list', { name: 'Your clubs' }).getByRole('link', { name: /^Open Riverside Smashers/ })).toBeVisible()
  })

  test('the API refuses a club without a name and says why', async ({ page }) => {
    await gotoReady(page, '/clubs')
    await page.getByRole('button', { name: 'Add a club' }).click()
    const dialog = page.getByRole('dialog', { name: 'Create a club' })
    await dialog.getByLabel('Club name').fill('   ')
    await dialog.getByRole('button', { name: 'Create club' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Give the club a name.')
    await expect(dialog).toBeVisible()
  })

  test('editing the name and description updates the page, sidebar and picker', async ({ page }) => {
    await createClub(page, 'Northside Rally')
    await openClubTab(page, 'Club info')

    await page.getByLabel('Club name').fill('Northside Rally Club')
    await page.getByLabel('Description').fill('Open play every Saturday morning.')
    await page.getByRole('button', { name: 'Save club info' }).click()
    await pageReady(page)

    await expect(clubTitle(page, 'Northside Rally Club')).toBeVisible()
    await expect(page.getByText('Open play every Saturday morning.').first()).toBeVisible()
    await expect(appNav(page).getByText('Northside Rally Club')).toBeVisible()

    // Still saved after a reload: the change went to the API, not just the screen.
    await page.reload()
    await pageReady(page)
    await expect(clubTitle(page, 'Northside Rally Club')).toBeVisible()
  })

  test('deleting a club asks first, then removes it everywhere', async ({ page }) => {
    await createClub(page, 'Harbour Club')
    await openClubTab(page, 'Club info')

    await page.getByRole('button', { name: 'Delete club' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Delete Harbour Club?' })
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Keep club' }).click()
    await expect(confirm).toBeHidden()
    await expect(clubTitle(page, 'Harbour Club')).toBeVisible()

    await page.getByRole('button', { name: 'Delete club' }).click()
    await confirm.getByRole('button', { name: 'Delete club' }).click()
    await expect(page).toHaveURL('/clubs')
    await pageReady(page)
    await expect(page.getByRole('link', { name: /^Open Harbour Club/ })).toHaveCount(0)
  })
})
