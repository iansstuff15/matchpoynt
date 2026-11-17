import { randomUUID } from 'node:crypto'
import { appNav } from '../support/appShell'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { courtCard, finishMatch, finishSession, setUpSession } from '../support/session'

// A player follows a running club session they're on: their wait, the courts, up next and the queue.
test.describe("players' live view", () => {
  test('shows where the player stands, from Playing now and from the club page', async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false })
    api.clubs.addViewer(id)
    const roster = ['Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kai', 'Lu', 'ana.reyes'].map((name) => ({ name, checkedIn: true }))
    await setUpSession(page, { players: roster })
    api.sessions.assignClub(api.sessions.latestId(), id)

    await gotoReady(page, '/app')
    await appNav(page).getByRole('link', { name: 'Playing now' }).click()
    await expect(page).toHaveURL('/play')
    await pageReady(page)
    await page.getByRole('link', { name: 'Badminton session' }).click()
    await expect(page).toHaveURL(/\/play\/[0-9a-f-]{36}$/)
    await pageReady(page)

    // Twelve players on four courts: the last match of three, so up next on a free court.
    await expect(page.getByRole('heading', { name: "You're up next: your match starts on the next free court." })).toBeVisible()
    await expect(page.getByText('Playing as ana.reyes.')).toBeVisible()
    await expect(page.getByRole('list', { name: 'Next matches' }).locator('[aria-current="true"]')).toContainText('Your match')
    await page.getByRole('tab', { name: 'Queue' }).click()
    const queue = page.getByRole('list', { name: 'Players waiting, in call order' })
    await expect(queue.getByRole('listitem')).toHaveCount(12)
    // Twelve rows don't fit: the list scrolls inside the card.
    const viewport = page.getByRole('tabpanel', { name: 'Queue' }).locator('[data-slot="scroll-area-viewport"]')
    expect(await viewport.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
    await expect(queue.locator('[aria-current="true"]')).toContainText('ana.reyes')

    await gotoReady(page, '/c/lakeside')
    await page.getByRole('link', { name: 'Your place' }).click()
    await expect(page).toHaveURL(/\/play\/[0-9a-f-]{36}$/)
  })

  test('shows "You are now playing" with the court and both sides while the player is on court', async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false })
    api.clubs.addViewer(id)
    await setUpSession(page, { players: ['ana.reyes', 'Ben', 'Cy', 'Dee'].map((name) => ({ name, checkedIn: true })) })
    const sessionId = api.sessions.latestId()
    api.sessions.assignClub(sessionId, id)
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)

    await gotoReady(page, `/play/${sessionId}`)
    const banner = page.getByRole('region', { name: 'You are now playing' })
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('Court 1')
    await expect(banner.getByRole('list', { name: 'Court 1, your side' })).toContainText('ana.reyes')
    await expect(banner.getByRole('list', { name: 'Court 1, opponent side' })).toBeVisible()
    await expect(banner.getByText('Opponent side')).toBeVisible()
    await expect(banner.getByRole('listitem')).toHaveCount(4)
    // At least 40% of the screen's height.
    const box = await banner.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual((page.viewportSize()!.height * 0.4) - 1)
  })

  test("has the session's leaderboard in its own tab", async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false })
    api.clubs.addViewer(id)
    await setUpSession(page, { players: ['ana.reyes', 'Ben', 'Cy', 'Dee'].map((name) => ({ name, checkedIn: true })) })
    const sessionId = api.sessions.latestId()
    api.sessions.assignClub(sessionId, id)
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await finishMatch(page, 'Court 1', [
      [21, 10],
      [21, 12],
    ])

    await gotoReady(page, `/play/${sessionId}`)
    await page.getByRole('tab', { name: 'Leaderboard' }).click()
    await pageReady(page)
    const panel = page.getByRole('tabpanel', { name: 'Leaderboard' })
    await expect(panel).toContainText('ana.reyes')
    await expect(panel).toContainText('Ben')
    await page.getByRole('tab', { name: 'Queue' }).click()
    await expect(page.getByRole('list', { name: 'Players waiting, in call order' })).toBeVisible()
    await page.getByRole('tab', { name: 'Your session' }).click()
    await expect(page.getByRole('heading', { name: 'On court' })).toBeVisible()
  })

  test('shows the match history, and turns into the ended screen with feedback and the final leaderboard when the session ends', async ({ page, api }) => {
    api.state.features.web.signIn = true
    api.profile.signIn('ana@example.com')
    const id = randomUUID()
    api.clubs.seed(club(id, 'Lakeside', { handle: 'lakeside' }), { mine: false })
    api.clubs.addViewer(id)
    api.community.seedForm(id, {
      title: 'How was tonight?',
      intro: '',
      enabled: true,
      questions: [{ id: 'overall', kind: 'rating', prompt: 'How was it overall?', required: true, options: [] }],
    })
    await setUpSession(page, { players: ['ana.reyes', 'Ben', 'Cy', 'Dee'].map((name) => ({ name, checkedIn: true })) })
    const sessionId = api.sessions.latestId()
    api.sessions.assignClub(sessionId, id)
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    await finishMatch(page, 'Court 1', [
      [21, 10],
      [21, 12],
    ])

    await gotoReady(page, `/play/${sessionId}`)
    // Under what's happening now: every finished match.
    await expect(page.getByRole('list', { name: 'Match history' }).getByRole('listitem')).toHaveCount(1)

    // The Queue Master finishes the session in another tab; this page notices on its own.
    const board = await page.context().newPage()
    await api.install(board)
    await board.goto(`/app/${sessionId}`)
    await pageReady(board)
    await finishSession(board)
    await board.close()

    await expect(page.getByRole('heading', { name: 'Session ended' })).toBeVisible({ timeout: 15_000 })
    const feedback = page.getByRole('heading', { name: 'How was tonight?' })
    await expect(feedback).toBeVisible()
    await page.getByRole('radio', { name: '5 out of 5' }).click()
    await page.getByRole('button', { name: 'Send feedback' }).click()
    await pageReady(page)
    await expect(page.getByText('Feedback sent')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Final leaderboard' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Top three' })).toContainText('ana.reyes')
  })
})
