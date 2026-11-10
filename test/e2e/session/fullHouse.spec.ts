import { sportRules } from '@matchpoynt/shared'
import { expect, test } from '../support/mockApi'
import { pageReady } from '../support/pageReady'
import { checkIn, courtCard, finishMatch, openLeaderboard, openManagement, playersOn, queuePanel, setUpSession, standing } from '../support/session'

// A full club night: 50 players across every tier, 4 courts of doubles.
const tiers = sportRules.badminton.tiers.map((t) => t.label)
const players = Array.from({ length: 50 }, (_, i) => ({ name: `Player ${String(i + 1).padStart(2, '0')}`, tier: tiers[i % tiers.length]! }))
const names = players.map((p) => p.name)
const courts = ['Court 1', 'Court 2', 'Court 3', 'Court 4']

test.describe('a full club night: 50 players on 4 courts', () => {
  // 50 players are added and checked in one by one through the UI; with the window shown each step is slowed down.
  test.setTimeout(20 * 60_000)

  test('fills every court fairly and keeps the leaderboard up to date', async ({ page, api }) => {
    await setUpSession(page, { players, autoFill: true })

    // Every player is on the roster with the tier they were added with.
    for (const { name, tier } of [players[0]!, players[7]!, players[23]!, players[49]!]) {
      await expect(queuePanel(page).getByRole('listitem').filter({ hasText: name }).first()).toContainText(tier)
    }
    await expect(page.getByRole('button', { name: /^Check-in QR/ })).toContainText('0/50')

    // As they arrive, auto-fill puts four on each court until all four courts play.
    await checkIn(page, names)
    for (const court of courts) await expect(courtCard(page, court).getByRole('button', { name: 'Finish match' })).toBeVisible()
    await expect(queuePanel(page)).toContainText('34 checked in and waiting')

    // Sixteen different players are on court: no one is on two courts at once.
    const round1 = (await Promise.all(courts.map((c) => playersOn(page, c)))).flat()
    expect(round1).toHaveLength(16)
    expect(new Set(round1).size).toBe(16)

    // Finish every match; side 1 wins each. Auto-fill starts the next round straight away.
    const results: [string[], string[]][] = []
    for (const court of courts) {
      results.push(
        await finishMatch(page, court, [
          [21, 15],
          [21, 18],
        ]),
      )
    }
    for (const court of courts) await expect(courtCard(page, court).getByRole('button', { name: 'Finish match' })).toBeVisible()
    await pageReady(page)

    // Fair rotation: the next round is all players who hadn't played yet.
    const round2 = (await Promise.all(courts.map((c) => playersOn(page, c)))).flat()
    expect(round2).toHaveLength(16)
    for (const name of round2) expect(round1).not.toContain(name)

    // Every result is on the leaderboard: 8 winners at 1–0, 8 losers at 0–1, everyone else not played yet.
    await openLeaderboard(page)
    for (const [winners, losers] of results) {
      for (const name of winners) await expect(standing(page, name)).toContainText('1–0')
      for (const name of losers) await expect(standing(page, name)).toContainText('0–1')
    }
    const winnerNames = results.flatMap(([w]) => w)
    await expect(page.getByRole('list', { name: 'Top three' }).getByRole('listitem', { name: new RegExp(`^Place 1: (${winnerNames.join('|')})$`) })).toBeVisible()
    const waiting = names.find((n) => !round1.includes(n) && !round2.includes(n))!
    await expect(standing(page, waiting)).toContainText('0–0')

    await openManagement(page)
    expect(api.unhandled).toEqual([])
  })
})
