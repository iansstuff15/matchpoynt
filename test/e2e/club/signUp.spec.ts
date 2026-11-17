import { randomUUID } from 'node:crypto'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

// Signing up for planned sessions: open sign-up up to a cap, who's coming, and the "Coming up" reminder.
test.describe('session sign-up', () => {
  test.beforeEach(({ api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
  })

  test('a member signs up for an open plan, sees who is coming and the reminder, then drops out', async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false, members: ['Ben', 'Cy'] })
    api.clubs.addViewer(id)
    api.clubs.seedPlan(id, { title: 'Friday doubles', when: inHours(5), signUp: 'open', maxPlayers: 4, memberIds: [api.clubs.memberIdOf(id, 'Ben')] })

    await gotoReady(page, '/c/lakeside')
    const sessions = page.getByRole('list', { name: 'Upcoming and running sessions' })
    await expect(sessions).toContainText('3 places left')
    await sessions.getByRole('button', { name: 'Sign up for Friday doubles' }).click()
    await pageReady(page)
    await expect(sessions).toContainText("You're in")
    await expect(sessions).toContainText('2 places left')

    await sessions.getByRole('button', { name: "Who's coming to Friday doubles" }).click()
    const dialog = page.getByRole('dialog', { name: "Who's coming" })
    await expect(dialog.getByRole('list', { name: 'Players coming to Friday doubles' })).toContainText('Ben')
    await expect(dialog.getByRole('list', { name: 'Players coming to Friday doubles' })).toContainText('ana.reyes')
    await dialog.getByRole('button', { name: 'Close' }).click()

    await gotoReady(page, '/play')
    await expect(page.getByRole('list', { name: 'Your upcoming sessions' })).toContainText('Friday doubles')

    await gotoReady(page, '/c/lakeside')
    await sessions.getByRole('button', { name: "Can't make it to Friday doubles" }).click()
    await pageReady(page)
    await expect(sessions.getByRole('button', { name: 'Sign up for Friday doubles' })).toBeVisible()
    await gotoReady(page, '/play')
    await expect(page.getByRole('list', { name: 'Your upcoming sessions' })).toHaveCount(0)
  })

  test('a full plan says so, and an approval plan still asks to join', async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false, members: ['Ben', 'Cy'] })
    api.clubs.addViewer(id)
    api.clubs.seedPlan(id, { title: 'Full night', when: inHours(30), signUp: 'open', maxPlayers: 2, memberIds: [api.clubs.memberIdOf(id, 'Ben'), api.clubs.memberIdOf(id, 'Cy')] })
    api.clubs.seedPlan(id, { title: 'Ladder', when: inHours(48) })

    await gotoReady(page, '/c/lakeside')
    const sessions = page.getByRole('list', { name: 'Upcoming and running sessions' })
    const full = sessions.getByRole('button', { name: 'Sign up for Full night' })
    await expect(full).toBeDisabled()
    await expect(full).toHaveText(/Full/)
    await expect(full).toHaveAttribute('title', "It's full. Ask the club if a place opens up.")
    await expect(sessions.getByRole('button', { name: 'Ask to join Ladder' })).toBeVisible()
  })
})
