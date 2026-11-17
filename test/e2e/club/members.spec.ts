import { createClub, openClubPage } from '../support/club'
import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'

test.describe('club members', () => {
  test.beforeEach(async ({ page }) => {
    await createClub(page, 'Eastside Shuttlers')
    await openClubPage(page, 'Members')
  })

  test('adding, editing and removing a member', async ({ page }) => {
    // Add, with a contact and a tier for one sport.
    await page.getByRole('button', { name: 'Add member' }).click()
    const add = page.getByRole('dialog', { name: 'Add a member' })
    await expect(add).toBeVisible()
    await add.getByLabel('Name').fill('Maria Santos')
    await add.getByLabel('Contact (optional)').fill('maria@example.com')
    await add.getByRole('combobox', { name: 'Badminton skill tier' }).click()
    await page.getByRole('option', { name: 'Advanced', exact: true }).click()
    await add.getByRole('button', { name: 'Add member' }).click()
    await expect(add).toBeHidden()
    await pageReady(page)

    const row = page.getByRole('row').filter({ hasText: 'Maria Santos' })
    await expect(row).toContainText('maria@example.com')
    await expect(row).toContainText('Advanced')

    // Edit: new name and tier.
    await page.getByRole('button', { name: 'Edit Maria Santos' }).click()
    const edit = page.getByRole('dialog', { name: 'Edit Maria Santos' })
    await edit.getByLabel('Name').fill('Maria S. Cruz')
    await edit.getByRole('combobox', { name: 'Badminton skill tier' }).click()
    await page.getByRole('option', { name: 'Open', exact: true }).click()
    await edit.getByRole('button', { name: 'Save member' }).click()
    await expect(edit).toBeHidden()
    await pageReady(page)
    const edited = page.getByRole('row').filter({ hasText: 'Maria S. Cruz' })
    await expect(edited).toContainText('Open')
    await expect(page.getByRole('row').filter({ hasText: 'Maria Santos' })).toHaveCount(0)

    // Remove, after confirming.
    await page.getByRole('button', { name: 'Remove Maria S. Cruz' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Remove Maria S. Cruz from the club?' })
    await confirm.getByRole('button', { name: 'Remove member' }).click()
    await pageReady(page)
    await expect(page.getByRole('row').filter({ hasText: 'Maria S. Cruz' })).toHaveCount(0)
  })

  test("the club's dashboard counts its members", async ({ page }) => {
    for (const name of ['Ana Reyes', 'Ben Lim', 'Cy Tan']) {
      await page.getByRole('button', { name: 'Add member' }).click()
      const add = page.getByRole('dialog', { name: 'Add a member' })
      await add.getByLabel('Name').fill(name)
      await add.getByRole('button', { name: 'Add member' }).click()
      await expect(add).toBeHidden()
      await pageReady(page)
    }
    await openClubPage(page, 'Dashboard')
    await expect(page.getByText('3 members')).toBeVisible()
  })

  test('the API refuses a member without a name and says why', async ({ page }) => {
    await page.getByRole('button', { name: 'Add member' }).click()
    const add = page.getByRole('dialog', { name: 'Add a member' })
    await add.getByLabel('Name').fill('  ')
    await add.getByRole('button', { name: 'Add member' }).click()
    await expect(add.getByRole('alert')).toContainText('Every member needs a name.')
  })
})
