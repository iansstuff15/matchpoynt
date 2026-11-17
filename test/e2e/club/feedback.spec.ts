import { randomUUID } from 'node:crypto'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { finishSession, setUpSession } from '../support/session'

// A club's post-session feedback form: the owner builds it, members answer it, the owner reads the results.
test.describe('club feedback', () => {
  test('an owner builds the form; a member answers for a session; the owner sees the results', async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }))
    // The owner plays too, under their username, so they can answer as a member.
    api.clubs.addViewer(id)

    await gotoReady(page, `/clubs/${id}/feedback`)
    // The only form on the page.
    const editor = page.locator('form')
    await expect(editor.getByRole('textbox', { name: 'Question 1', exact: true })).toHaveValue('How would you rate the session overall?')
    await editor.getByRole('switch', { name: /Ask members after each session/ }).click()
    await editor.getByRole('button', { name: 'Add a question' }).click()
    await editor.getByRole('textbox', { name: 'Question 5', exact: true }).fill('Was the venue easy to find?')
    await editor.getByLabel('Answer with').nth(4).click()
    await page.getByRole('option', { name: 'Yes or no' }).click()
    await editor.getByRole('button', { name: 'Save form' }).click()
    await pageReady(page)
    await expect(page.getByText('No finished sessions yet')).toBeVisible()

    // The preview shows the form as members will see it, with nothing sent.
    await editor.getByRole('button', { name: 'Preview' }).click()
    const preview = page.getByRole('dialog', { name: 'How was the session?' })
    const venue = preview.getByRole('group', { name: /5\. Was the venue easy to find\?/ })
    await expect(venue).toBeVisible()
    await venue.getByRole('radio', { name: 'Yes' }).click()
    await expect(venue.getByRole('radio', { name: 'Yes' })).toBeChecked()
    await expect(preview.getByRole('button', { name: 'Send feedback' })).toBeDisabled()
    await preview.getByRole('button', { name: 'Close preview' }).click()
    await expect(preview).toBeHidden()

    await setUpSession(page, { players: ['ana.reyes', 'Ben', 'Cy', 'Dee'].map((name) => ({ name, checkedIn: true })) })
    api.sessions.assignClub(api.sessions.latestId(), id)
    await finishSession(page)

    await gotoReady(page, '/c/lakeside')
    await page.getByRole('button', { name: 'Give feedback on Badminton session' }).click()
    const dialog = page.getByRole('dialog', { name: 'How was the session?' })
    // Required: refused until rated.
    await dialog.getByRole('button', { name: 'Send feedback' }).click()
    await expect(dialog.getByRole('alert')).toContainText('it\'s required')
    await dialog.getByRole('radio', { name: '4 out of 5' }).click()
    await dialog.getByRole('radio', { name: 'About right' }).click()
    await dialog.getByLabel(/Anything we could do better/).fill('More courts please')
    await dialog.getByRole('button', { name: 'Send feedback' }).click()
    await expect(dialog).toBeHidden()
    await pageReady(page)
    await expect(page.getByRole('list', { name: 'Sessions to give feedback on' })).toContainText('Sent')

    await gotoReady(page, `/clubs/${id}/feedback`)
    const results = page.getByRole('list', { name: 'Feedback on Badminton session' })
    await expect(page.getByText('1 of 4 players answered')).toBeVisible()
    await expect(results).toContainText('4.0 average')
    await expect(results).toContainText('More courts please')
  })
})
