import { randomUUID } from 'node:crypto'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

// Club announcements: the owner posts, pins, edits and deletes them; members read them on the club's page.
test.describe('club announcements', () => {
  test.beforeEach(({ api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
  })

  test('an owner posts, pins, edits and deletes announcements, and members see them pinned first', async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }))
    api.clubs.addViewer(id)

    await gotoReady(page, `/clubs/${id}/announcements`)
    await expect(page.getByText('No announcements yet')).toBeVisible()

    await page.getByRole('button', { name: 'New announcement' }).click()
    let dialog = page.getByRole('dialog', { name: 'New announcement' })
    await dialog.getByLabel('Title').fill('Friday on courts 3 and 4')
    await dialog.getByLabel('Message (optional)').fill('The hall has the front courts booked.')
    await dialog.getByRole('button', { name: 'Post announcement' }).click()
    await pageReady(page)
    await expect(dialog).toBeHidden()

    await page.getByRole('button', { name: 'New announcement' }).click()
    dialog = page.getByRole('dialog', { name: 'New announcement' })
    await dialog.getByLabel('Title').fill('Club rules')
    await dialog.getByRole('switch', { name: /Pin to the top/ }).click()
    await dialog.getByRole('button', { name: 'Post announcement' }).click()
    await pageReady(page)

    const list = page.getByRole('list', { name: 'Announcements' })
    await expect(list.getByRole('listitem')).toHaveCount(2)
    await expect(list.getByRole('listitem').first()).toContainText('Club rules')
    await expect(list.getByRole('listitem').first()).toContainText('Pinned')

    await list.getByRole('button', { name: 'Edit “Friday on courts 3 and 4”' }).click()
    dialog = page.getByRole('dialog', { name: 'Edit announcement' })
    await dialog.getByLabel('Title').fill('Friday on courts 5 and 6')
    await dialog.getByRole('button', { name: 'Save announcement' }).click()
    await pageReady(page)
    await expect(list).toContainText('Friday on courts 5 and 6')

    // Members (the owner plays there too) read them on the club's page, pinned first.
    await gotoReady(page, '/c/lakeside')
    const news = page.getByRole('list', { name: 'Club announcements' })
    await expect(news.getByRole('listitem').first()).toContainText('Club rules')
    await expect(news).toContainText('The hall has the front courts booked.')

    await gotoReady(page, `/clubs/${id}/announcements`)
    await list.getByRole('button', { name: 'Delete “Club rules”' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete announcement' }).click()
    await pageReady(page)
    await expect(list.getByRole('listitem')).toHaveCount(1)
  })

  test('only three can be pinned, and a title is required', async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }))
    api.community.seedAnnouncements(id, [{ title: 'One', pinned: true }, { title: 'Two', pinned: true }, { title: 'Three', pinned: true }])

    await gotoReady(page, `/clubs/${id}/announcements`)
    await page.getByRole('button', { name: 'New announcement' }).click()
    const dialog = page.getByRole('dialog', { name: 'New announcement' })
    await expect(dialog.getByRole('switch', { name: /Pin to the top/ })).toBeDisabled()
    await expect(dialog).toContainText('Up to 3 announcements can be pinned. Unpin one first.')
    await expect(dialog.getByRole('button', { name: 'Post announcement' })).toBeDisabled()
  })
})
