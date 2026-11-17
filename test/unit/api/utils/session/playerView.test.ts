import { describe, expect, it } from 'vitest'
import { checkInPlayer, finishMatch, startMatch } from '@/utils/session/engine'
import { computeLeaderboard } from '@/utils/session/leaderboard'
import { findMe, playerLiveView } from '@/utils/session/playerView'
import { createSession } from '@/utils/session/setup'
import { readySession, setupInput, testContext } from '@test/session'

const club = { name: 'Smash Club', handle: 'smash' }
const twelve = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kai', 'Lu'].map((name, i) => ({ id: `m-${i}`, name, tierId: 'beginner' }))
const oneCourt = setupInput({ members: twelve, courts: [{ id: 'c1', label: 'Court 1' }] })

describe('findMe', () => {
  it('matches the club roster name to the session roster, ignoring case and spacing', () => {
    const s = readySession()
    expect(findMe(s, '  ana ')?.name).toBe('Ana')
    expect(findMe(s, 'Zed')).toBeNull()
    expect(findMe(s, null)).toBeNull()
  })
})

describe('playerLiveView', () => {
  it('puts the next match on a free court as up next, and counts matches ahead for the rest', () => {
    const s = readySession(oneCourt)
    const first = playerLiveView(s, club, 'Ana', [], 5_000)
    expect(first.me?.status).toBe('up_next')
    expect(first.me?.matchesAhead).toBe(0)
    expect(first.me?.queuePosition).toBe(1)
    const third = playerLiveView(s, club, 'Ivy', [], 5_000)
    expect(third.me?.status).toBe('queued')
    expect(third.me?.matchesAhead).toBe(2)
    expect(third.me?.headline).toBe('2 matches before yours.')
    expect(third.upNext?.[2]?.mine).toBe(true)
    expect(third.queue.filter((q) => q.isMe).map((q) => q.name)).toEqual(['Ivy'])
  })

  it('shows who is playing where, with the viewer on court and their record', () => {
    const ctx = testContext()
    const ready = readySession(oneCourt, ctx)
    const court = ready.courts[0]!
    let s = startMatch(ready, court.id, ctx)
    const view = playerLiveView(s, club, 'Ana', [], ctx.now)
    expect(view.me?.status).toBe('playing')
    expect(view.me?.headline).toBe(`You're playing on ${court.label}.`)
    expect(view.courts[0]?.mine).toBe(true)
    expect(view.courts[0]?.sides[view.courts[0]!.mySide!]).toContain('Ana')
    expect(view.courts[0]?.sides.flat()).toHaveLength(4)
    expect(view.counts.playing).toBe(4)

    ctx.tick(60_000)
    s = finishMatch(
      s,
      court.id,
      [
        { a: 21, b: 10 },
        { a: 21, b: 15 },
      ],
      ctx,
    )
    const finished = Object.values(s.matches).filter((m) => m.finishedAt !== null)
    const after = playerLiveView(s, club, 'Ana', finished, ctx.now)
    expect(after.me?.gamesPlayed).toBe(1)
    expect(after.me!.wins + after.me!.losses).toBe(1)
    expect(after.me?.waitingSince).toBe(new Date(ctx.now).toISOString())
    // Their badges are the ones the session's leaderboard gives them.
    const ana = computeLeaderboard(Object.values(s.players), finished).find((e) => e.name === 'Ana')!
    expect(after.me?.badges).toEqual(ana.badges)
    expect(after.me?.badges.length).toBeGreaterThan(0)
  })

  it('asks a player who has not checked in to check in, and leaves them out of the queue', () => {
    const ctx = testContext()
    const fresh = createSession('o', oneCourt, ctx)
    const s = checkInPlayer(fresh, Object.values(fresh.players).find((p) => p.name === 'Ana')!.id, ctx)
    const view = playerLiveView(s, club, 'Ben', [], ctx.now)
    expect(view.me?.status).toBe('checking_in')
    expect(view.queue.map((q) => q.name)).not.toContain('Ben')
    expect(view.counts.checkingIn).toBeGreaterThan(0)
  })

  it('gives a queue position but no up-next preview with manual queueing', () => {
    const s = readySession(setupInput({ ...oneCourt, rules: { ...oneCourt.rules, queueing: 'manual' } }))
    const view = playerLiveView(s, club, 'Cy', [], 5_000)
    expect(view.upNext).toBeNull()
    expect(view.me?.status).toBe('queued')
    expect(view.me?.queuePosition).toBe(3)
  })

  it('has no "me" for someone not on the session roster, and shows only names', () => {
    const view = playerLiveView(readySession(oneCourt), club, 'Zed', [], 5_000)
    expect(view.me).toBeNull()
    expect(JSON.stringify(view)).not.toMatch(/tierId|beginner/)
  })

  it("awards the club's own badges, counting the club's earlier sessions for career ones, and lists the match history", () => {
    const ctx = testContext()
    const ready = readySession(oneCourt, ctx)
    const court = ready.courts[0]!
    const s = finishMatch(
      startMatch(ready, court.id, ctx),
      court.id,
      [
        { a: 21, b: 10 },
        { a: 21, b: 15 },
      ],
      ctx,
    )
    const finished = Object.values(s.matches).filter((m) => m.finishedAt !== null)
    const badge = (id: string, scope: 'session' | 'career', metric: 'played' | 'sessions', min: number) => ({
      id,
      name: id,
      description: null,
      scope,
      conditions: [{ metric, min }],
      iconUrl: null,
      iconSource: null,
      summary: '',
    })
    const clubBadges = [badge('on-court', 'session', 'played', 1), badge('regular', 'career', 'sessions', 2), badge('veteran', 'career', 'sessions', 5)]
    // Ana played in one earlier club session too: two sessions with this one.
    const earlier = {
      id: 'old-match',
      courtId: 'c',
      courtLabel: 'Court 1',
      sides: [
        ['old-ana', 'old-ben'],
        ['old-cy', 'old-dee'],
      ] as [string[], string[]],
      startedAt: 1,
      finishedAt: 2,
      games: [{ a: 21, b: 5 }],
      winner: 'a' as const,
    }
    const clubHistory = {
      players: ['Ana', 'Ben', 'Cy', 'Dee'].map((name) => ({ id: `old-${name.toLowerCase()}`, sessionId: 'earlier', name })),
      matches: [earlier],
    }
    const view = playerLiveView(s, club, 'Ana', finished, ctx.now, { clubBadges, clubHistory })
    expect(view.me?.clubBadges.sort()).toEqual(['on-court', 'regular'])
    expect(view.clubBadges.map((b) => b.id).sort()).toEqual(['on-court', 'regular'])
    expect(view.history).toHaveLength(1)
    expect(view.history[0]!.sides.flat().map((p) => p.name)).toContain('Ana')
    // Without the club's badges (switched off), none.
    expect(playerLiveView(s, club, 'Ana', finished, ctx.now).me?.clubBadges).toEqual([])
  })
})

describe('playerLiveView: what players check most', () => {
  it('puts their next match up front with when it should start, and their place and points', () => {
    const ctx = testContext()
    const ready = readySession(oneCourt, ctx)
    const third = playerLiveView(ready, club, 'Ivy', [], ctx.now)
    // Two matches before theirs on one court, 12 minutes each by default.
    expect(third.me?.nextMatch?.partners).toHaveLength(1)
    expect(third.me?.nextMatch?.opponents).toHaveLength(2)
    expect(third.me?.estimatedStartAt).toBe(new Date(ctx.now + 24 * 60_000).toISOString())
    expect(third.typicalMatchMinutes).toBe(12)
    expect(third.me?.rank).toBeNull()

    let s = startMatch(ready, ready.courts[0]!.id, ctx)
    ctx.tick(60_000)
    s = finishMatch(
      s,
      ready.courts[0]!.id,
      [
        { a: 21, b: 10 },
        { a: 21, b: 15 },
      ],
      ctx,
    )
    const finished = Object.values(s.matches).filter((m) => m.finishedAt !== null)
    const ana = playerLiveView(s, club, 'Ana', finished, ctx.now).me!
    expect(ana.rank).not.toBeNull()
    expect(ana.ranked).toBe(4)
    expect(ana.pointsFor + ana.pointsAgainst).toBe(67)
  })

  it('says what they owe so far while the session charges a fee', () => {
    const ready = readySession(oneCourt)
    const priced = { ...ready, settings: { ...ready.settings, fee: { kind: 'per-game' as const, currency: 'PHP' as const, base: 0, perGame: 5000 } } }
    const fresh = playerLiveView(priced, club, 'Ana', [], 0)
    expect(fresh.me?.fee?.amount).toBe(0)
    expect(fresh.info.fee).not.toBeNull()
    expect(playerLiveView(ready, club, 'Ana', [], 0).me?.fee).toBeNull()
  })

  it('names the session settings and the friends on the roster, never the viewer', () => {
    const view = playerLiveView(readySession(oneCourt), club, 'Ana', [], 0, undefined, ['ben', 'Ana', 'Zed'])
    expect(view.friendsHere).toEqual([{ name: 'Ben', status: 'waiting' }])
    expect(view.info.courts).toBe(1)
    expect(view.info.format).toMatch(/^Badminton · /)
  })

  it('lets someone not checked in yet check in from the app', () => {
    const ready = readySession(oneCourt)
    const notIn = { ...ready, players: Object.fromEntries(Object.entries(ready.players).map(([id, p]) => [id, { ...p, checkedInAt: null }])) }
    expect(playerLiveView(notIn, club, 'Ana', [], 0).me).toMatchObject({ status: 'checking_in', canCheckIn: true })
  })
})
