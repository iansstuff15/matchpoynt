import {
  accountLimits,
  type ClubBadgeView,
  type GameScore,
  type LeaderboardEntry,
  type LeaderboardBadgeId,
  type MatchSide,
  type ProfileClubBadge,
  type ProfileClubRecord,
  type ProfileCollectedClubBadge,
  type ProfileCollectedLeaderboardBadge,
  type ProfileGameView,
  type ProfileGamesResponse,
  type ProfileRecordView,
  type ProfileSessionRecord,
  type ProfileSportRecord,
  type ProfileStats,
  type RivalView,
  type SportId,
} from '@matchpoynt/shared'
import type { MatchState, PlayerState } from '@/interfaces/SessionState'
import { awardClubBadges, careerKey, careerTotals, memberCareerBadges, type HistoryPlayer } from '@/utils/club/badges'
import { computeLeaderboard } from '@/utils/session/leaderboard'

// A person's games, record and badges across the clubs they've joined.
// Session players aren't linked to accounts, so they're found by the name the
// person has on each club's roster (as career badges are). Pure: the profile
// route loads the clubs' histories (my_club_history).

/** One club's history, as the profile route hands it over. */
export interface MemberHistory {
  clubId: string
  clubName: string
  /** The person's name on the club's roster. */
  memberName: string
  badges: ClubBadgeView[]
  sessions: { id: string; label: string; sportId: SportId; endedAt: string }[]
  players: HistoryPlayer[]
  /** Finished matches, each with the session it was in. */
  matches: (MatchState & { sessionId: string })[]
}

const asPlayer = (p: HistoryPlayer): PlayerState => ({
  id: p.id,
  name: p.name,
  tierId: '',
  gamesPlayed: 0,
  rotation: 0,
  queuedAt: 0,
  status: 'waiting',
  active: true,
  checkedInAt: null,
})

const flip = (g: GameScore): GameScore => ({ a: g.b, b: g.a })

/** The person's player ids in one club: everyone on its sessions with the member's name. */
function mine(history: MemberHistory): Set<string> {
  const key = careerKey(history.memberName)
  return new Set(history.players.filter((p) => careerKey(p.name) === key).map((p) => p.id))
}

/** Every match the person played, newest first, from their side. */
export function profileGames(histories: MemberHistory[]): ProfileGameView[] {
  const games: ProfileGameView[] = []
  for (const h of histories) {
    const ids = mine(h)
    const names = new Map(h.players.map((p) => [p.id, p.name]))
    const sessions = new Map(h.sessions.map((s) => [s.id, s]))
    for (const m of h.matches) {
      const side = m.sides[0].some((id) => ids.has(id)) ? 0 : m.sides[1].some((id) => ids.has(id)) ? 1 : null
      const session = sessions.get(m.sessionId)
      if (side === null || !session || m.finishedAt === null) continue
      const ours: MatchSide = side === 0 ? 'a' : 'b'
      games.push({
        matchId: m.id,
        sessionId: m.sessionId,
        sessionLabel: session.label,
        clubId: h.clubId,
        clubName: h.clubName,
        sportId: session.sportId,
        finishedAt: new Date(m.finishedAt).toISOString(),
        partners: m.sides[side].filter((id) => !ids.has(id)).map((id) => names.get(id) ?? 'A player'),
        opponents: m.sides[side === 0 ? 1 : 0].map((id) => names.get(id) ?? 'A player'),
        games: side === 0 ? m.games : m.games.map(flip),
        result: m.winner === null ? null : m.winner === ours ? 'win' : 'loss',
        winner: m.winner,
      })
    }
  }
  return games.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt) || b.matchId.localeCompare(a.matchId))
}

/** A page of games that finished before `before`, and where the next page starts. */
export function pageOfGames(games: ProfileGameView[], before: string | null, size = accountLimits.gamesPageSize): ProfileGamesResponse {
  const rest = before ? games.filter((g) => g.finishedAt < before) : games
  const page = rest.slice(0, size)
  return { games: page, nextBefore: rest.length > size ? page.at(-1)!.finishedAt : null }
}

/** Which games a page shows: one sport's, one club's or one session's, or all. */
export interface GamesFilter {
  sport?: SportId
  club?: string
  session?: string
}

export const filterGames = (games: ProfileGameView[], f: GamesFilter): ProfileGameView[] =>
  games.filter((g) => (!f.sport || g.sportId === f.sport) && (!f.club || g.clubId === f.club) && (!f.session || g.sessionId === f.session))

/** A record from games and how many sessions they came from. */
function recordOf(games: ProfileGameView[], sessions: number): ProfileStats {
  const wins = games.filter((g) => g.result === 'win').length
  const losses = games.filter((g) => g.result === 'loss').length
  return { sessions, played: games.length, wins, losses, winRate: wins + losses ? Math.round((wins / (wins + losses)) * 100) : null }
}

/** Their record: sessions they played in, matches, wins and losses, and the share of results they won. */
export function profileStats(histories: MemberHistory[], games: ProfileGameView[]): ProfileStats {
  return recordOf(games, sessionsPlayed(histories).length)
}

/** Every session they were on the roster of, with its club. */
function sessionsPlayed(histories: MemberHistory[]): { history: MemberHistory; session: MemberHistory['sessions'][number]; playerId: string }[] {
  return histories.flatMap((h) => {
    const ids = mine(h)
    return h.sessions.flatMap((session) => {
      const own = h.players.find((p) => p.sessionId === session.id && ids.has(p.id))
      return own ? [{ history: h, session, playerId: own.id }] : []
    })
  })
}

/** What they earned in one session: its final leaderboard's place, the club's session badges and the leaderboard's own. */
interface SessionAward {
  history: MemberHistory
  session: MemberHistory['sessions'][number]
  rank: number | null
  ranked: number
  clubBadges: ClubBadgeView[]
  leaderboardBadges: LeaderboardBadgeId[]
  entry: LeaderboardEntry | null
}

function sessionAwards(histories: MemberHistory[]): SessionAward[] {
  return sessionsPlayed(histories).map(({ history: h, session, playerId }) => {
    const players = h.players.filter((p) => p.sessionId === session.id).map(asPlayer)
    const matches = h.matches.filter((m) => m.sessionId === session.id).sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
    const board = awardClubBadges(computeLeaderboard(players, matches), h.badges.filter((b) => b.scope === 'session'), new Map())
    const entry = board.find((e) => e.playerId === playerId)
    const byId = new Map(h.badges.map((b) => [b.id, b]))
    return {
      history: h,
      session,
      rank: entry?.rank ?? null,
      ranked: board.length,
      clubBadges: (entry?.clubBadges ?? []).map((id) => byId.get(id)!).filter(Boolean),
      leaderboardBadges: entry?.badges ?? [],
      entry: entry ?? null,
    }
  })
}

/** The club's career badges they hold. */
const careerBadgesOf = (h: MemberHistory): ClubBadgeView[] => {
  const byId = new Map(h.badges.map((b) => [b.id, b]))
  return memberCareerBadges(h.memberName, h.badges, careerTotals({ players: h.players, matches: h.matches })).map((id) => byId.get(id)!)
}

/**
 * The badges they've earned: each club's session badges (counted per session
 * earned) and career badges (once), and the leaderboard's own badges (most
 * wins, hot streak…) per session, with how many times.
 */
export function profileBadges(histories: MemberHistory[]): { clubBadges: ProfileClubBadge[]; leaderboardBadges: { id: LeaderboardBadgeId; times: number }[] } {
  const { clubBadges, leaderboardBadges } = badgeCollection(histories)
  return {
    clubBadges: clubBadges.map(({ clubId, clubName, badge, times }) => ({ clubId, clubName, badge, times })),
    leaderboardBadges: leaderboardBadges.map(({ id, times }) => ({ id, times })),
  }
}

const newestFirst = <T extends { endedAt: string }>(list: T[]) => list.sort((a, b) => b.endedAt.localeCompare(a.endedAt))
const addSport = (list: SportId[], id: SportId) => (list.includes(id) ? list : list.push(id))

/** Their badge collection: every badge with how often, in which sports, and the sessions it came from. */
export function badgeCollection(histories: MemberHistory[], awards = sessionAwards(histories)): ProfileRecordView['collection'] {
  const club = new Map<string, ProfileCollectedClubBadge>()
  const board = new Map<LeaderboardBadgeId, ProfileCollectedLeaderboardBadge>()
  const clubBadge = (h: MemberHistory, badge: ClubBadgeView) => {
    const key = `${h.clubId}:${badge.id}`
    let found = club.get(key)
    if (!found) club.set(key, (found = { clubId: h.clubId, clubName: h.clubName, badge, times: 0, sportIds: [], earnedIn: [], lastEarnedAt: null }))
    return found
  }
  for (const a of awards) {
    const earned = { sessionId: a.session.id, sessionLabel: a.session.label, endedAt: a.session.endedAt }
    for (const badge of a.clubBadges) {
      const found = clubBadge(a.history, badge)
      found.times += 1
      addSport(found.sportIds, a.session.sportId)
      found.earnedIn.push(earned)
    }
    for (const id of a.leaderboardBadges) {
      let found = board.get(id)
      if (!found) board.set(id, (found = { id, times: 0, sportIds: [], earnedIn: [], lastEarnedAt: null }))
      found.times += 1
      addSport(found.sportIds, a.session.sportId)
      found.earnedIn.push({ ...earned, clubName: a.history.clubName })
    }
  }
  for (const h of histories) {
    const played = awards.filter((a) => a.history === h)
    for (const badge of careerBadgesOf(h)) {
      const found = clubBadge(h, badge)
      found.times += 1
      for (const a of played) addSport(found.sportIds, a.session.sportId)
      found.lastEarnedAt = newestFirst(played.map((a) => a.session))[0]?.endedAt ?? null
    }
  }
  for (const b of [...club.values(), ...board.values()]) {
    newestFirst(b.earnedIn)
    b.lastEarnedAt = b.earnedIn[0]?.endedAt ?? b.lastEarnedAt
  }
  return {
    clubBadges: [...club.values()].sort((a, b) => b.times - a.times || a.badge.name.localeCompare(b.badge.name)),
    leaderboardBadges: [...board.values()].sort((a, b) => b.times - a.times || a.id.localeCompare(b.id)),
  }
}

/** Their whole record: totals, by sport, by club, each session, and the badge collection. `photos` are the clubs' photos, drawn on shared images. */
export function profileRecord(histories: MemberHistory[], photos: ReadonlyMap<string, string | null> = new Map(), games = profileGames(histories)): ProfileRecordView {
  const awards = sessionAwards(histories)
  const sportIds = [...new Set(awards.map((a) => a.session.sportId))]
  const bySport: ProfileSportRecord[] = sportIds
    .map((sportId) => ({ sportId, stats: recordOf(games.filter((g) => g.sportId === sportId), awards.filter((a) => a.session.sportId === sportId).length) }))
    .sort((a, b) => b.stats.played - a.stats.played || a.sportId.localeCompare(b.sportId))
  const byClub: ProfileClubRecord[] = histories
    .map((h) => {
      const own = awards.filter((a) => a.history === h)
      return { clubId: h.clubId, clubName: h.clubName, sportIds: [...new Set(own.map((a) => a.session.sportId))], stats: recordOf(games.filter((g) => g.clubId === h.clubId), own.length) }
    })
    .sort((a, b) => b.stats.played - a.stats.played || a.clubName.localeCompare(b.clubName))
  const sessions: ProfileSessionRecord[] = newestFirst(
    awards.map((a) => {
      const own = games.filter((g) => g.sessionId === a.session.id)
      return {
        sessionId: a.session.id,
        sessionLabel: a.session.label,
        clubId: a.history.clubId,
        clubName: a.history.clubName,
        sportId: a.session.sportId,
        endedAt: a.session.endedAt,
        played: own.length,
        wins: own.filter((g) => g.result === 'win').length,
        losses: own.filter((g) => g.result === 'loss').length,
        rank: a.rank,
        ranked: a.ranked,
        clubBadges: a.clubBadges,
        leaderboardBadges: a.leaderboardBadges,
        entry: a.entry,
        club: { name: a.history.clubName, avatarUrl: photos.get(a.history.clubId) ?? null },
      }
    }),
  )
  return { stats: recordOf(games, awards.length), bySport, byClub, sessions, collection: badgeCollection(histories, awards), rivals: rivalsOf(games) }
}

/**
 * Their rivals and partners: everyone they've played against (or with) at
 * least `accountLimits.rivalMinMatches` times, matched by name across
 * clubs (careerKey), with their wins and losses in those matches; most played
 * first, then most wins. At most `accountLimits.rivalsShown` of each.
 */
export function rivalsOf(games: ProfileGameView[]): ProfileRecordView['rivals'] {
  const tally = (pick: (g: ProfileGameView) => string[]) => {
    const byKey = new Map<string, RivalView>()
    // Newest first, so the first name seen is the latest one.
    for (const g of games) {
      for (const name of pick(g)) {
        const key = careerKey(name)
        const r = byKey.get(key) ?? { name, played: 0, wins: 0, losses: 0, lastPlayedAt: g.finishedAt }
        r.played += 1
        if (g.result === 'win') r.wins += 1
        if (g.result === 'loss') r.losses += 1
        byKey.set(key, r)
      }
    }
    return [...byKey.values()]
      .filter((r) => r.played >= accountLimits.rivalMinMatches)
      .sort((a, b) => b.played - a.played || b.wins - a.wins || a.name.localeCompare(b.name))
      .slice(0, accountLimits.rivalsShown)
  }
  return { opponents: tally((g) => g.opponents), partners: tally((g) => g.partners) }
}
