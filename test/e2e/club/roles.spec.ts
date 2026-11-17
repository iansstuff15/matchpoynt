import { randomUUID } from 'node:crypto'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

// Club owners give members roles; players see everyone with a role as the club's team.
test.describe('member roles', () => {
  test('an owner makes a member a coach, and the roster shows it', async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside'), { members: ['Ben', 'Cy'] })
    await gotoReady(page, `/clubs/${id}/members`)
    await page.getByRole('button', { name: 'Edit Ben' }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit Ben' })
    await dialog.getByRole('combobox', { name: 'Role in the club' }).click()
    await page.getByRole('option', { name: 'Coach', exact: true }).click()
    await expect(dialog.getByText("Coaches the club's players.")).toBeVisible()
    await dialog.getByRole('button', { name: 'Save member' }).click()
    await expect(dialog).toBeHidden()
    await pageReady(page)
    const row = page.getByRole('row').filter({ hasText: 'Ben' })
    await expect(row.getByText('Coach', { exact: true })).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: 'Cy' }).getByText('Coach', { exact: true })).toHaveCount(0)
  })

  test("players see the club's team and their own role on its page", async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false, members: [{ name: 'Ben', role: 'manager' }, 'Cy', { name: 'Dee', role: 'queue_master' }] })
    api.clubs.addViewer(id, 'captain')
    await gotoReady(page, '/c/lakeside')
    const team = page.getByRole('list', { name: 'Club team' })
    await expect(team.getByRole('listitem')).toHaveCount(3)
    await expect(team).toContainText('Ben')
    await expect(team).toContainText('Manager')
    await expect(team).toContainText('Queue Master')
    await expect(team).not.toContainText('Cy')
    await expect(page.getByText("You're one of them: Captain.")).toBeVisible()
  })
})
