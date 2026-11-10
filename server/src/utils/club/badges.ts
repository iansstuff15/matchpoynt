import {
  clubBadgeLimits,
  clubBadgeMetrics,
  clubBadgeScopes,
  type ClubBadgeCondition,
  type ClubBadgeInput,
  type ClubBadgeMetric,
  type LeaderboardEntry,
} from '@matchpoynt/shared'
import type { MatchState, PlayerState } from '@/interfaces/SessionState'
import { invalid } from '@/utils/http/errors'
import { tally, type Totals } from '@/utils/session/leaderboard'

// Clubs' own badges: checking a badge, describing its conditions, and deciding
// who has earned it. Pure: the routes load the data and save the results.

type Errors = Partial<Record<'name' | 'description' | 'scope' | 'conditions', string>>

/** What a badge's conditions are checked against. `sessions` only exists across club sessions. */
export interface BadgeTotals extends Pick<Totals, 'played' | 'wins' | 'losses' | 'pointsFor' | 'pointsAgainst' | 'streak'> {
  sessions: number
}

/** One club session player and the session they were in, for career totals. */
export interface HistoryPlayer {
  id: string
  sessionId: string
  name: string
}

/** Everything career badges count: the club's session players and their finished matches. */
export interface ClubHistory {
  players: HistoryPlayer[]
  matches: MatchState[]
}

/** How a name is matched across sessions: trimmed, spaces collapsed, lower case (the same as `public_club_history` in SQL). */
export const careerKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

export function validateBadge(input: ClubBadgeInput): Errors {
  const errors: Errors = {}
  const name = input.name.trim()
  if (!name) errors.name = 'Give the badge a name.'
  else if (name.length > clubBadgeLimits.nameMaxLength) errors.name = `Badge names can be up to ${clubBadgeLimits.nameMaxLength} characters.`
  if ((input.description?.trim().length ?? 0) > clubBadgeLimits.descriptionMaxLength) {
    errors.description = `Descriptions can be up to ${clubBadgeLimits.descriptionMaxLength} characters.`
  }
  if (!clubBadgeScopes[input.scope]) errors.scope = 'Choose where the badge is earned: in one session or across all club sessions.'

  const { conditions } = input
  if (conditions.length === 0) errors.conditions = 'Add at least one condition, e.g. "at least 5 wins".'
  else if (conditions.length > clubBadgeLimits.maxConditions) errors.conditions = `A badge can have up to ${clubBadgeLimits.maxConditions} conditions.`
  else if (new Set(conditions.map((c) => c.metric)).size !== conditions.length) errors.conditions = 'Use each kind of condition once.'
  else {
    for (const c of conditions) {
      const metric = clubBadgeMetrics[c.metric]
      if (!metric) {
        errors.conditions = 'One of the conditions is not one Matchpoynt knows.'
        break
      }
      if (!metric.scopes.includes(input.scope)) {
        errors.conditions = `"${metric.label}" can't be counted ${input.scope === 'session' ? 'in one session' : 'across club sessions'}.`
        break
      }
      const low = c.metric === 'pointDiff' ? -clubBadgeLimits.maxThreshold : 1
      const high = metric.percent ? 100 : clubBadgeLimits.maxThreshold
      if (!Number.isInteger(c.min) || c.min < low || c.min > high) {
        errors.conditions = `"${metric.label}" needs a whole number from ${low} to ${high}.`
        break
      }
    }
  }
  return errors
}

const blankToNull = (v: string | null) => (v?.trim() ? v.trim() : null)

/** Trims a badge and checks it; throws with the fields at fault. */
export function cleanBadge(input: ClubBadgeInput): ClubBadgeInput {
  const errors = validateBadge(input)
  const first = Object.values(errors).find(Boolean)
  if (first) throw invalid(first, errors as Record<string, string>)
  return { name: input.name.trim(), description: blankToNull(input.description), scope: input.scope, conditions: input.conditions.map(({ metric, min }) => ({ metric, min })) }
}

/** A club can have up to `clubBadgeLimits.maxBadges` badges. */
export function addBadgeBlockedReason(badgeCount: number): string | null {
  return badgeCount >= clubBadgeLimits.maxBadges ? `A club can have up to ${clubBadgeLimits.maxBadges} badges. Delete one to make room.` : null
}

const phrase: Record<ClubBadgeMetric, (min: number) => string> = {
  wins: (n) => `${n} ${n === 1 ? 'win' : 'wins'}`,
  played: (n) => `${n} ${n === 1 ? 'match' : 'matches'} played`,
  streak: (n) => `${n} wins in a row`,
  pointsFor: (n) => `${n} points scored`,
  pointDiff: (n) => `a point difference of ${n > 0 ? '+' : ''}${n}`,
  winRate: (n) => `a ${n}% win rate`,
  sessions: (n) => `${n} ${n === 1 ? 'session' : 'sessions'} played in`,
}

/** The conditions in plain words: "At least 5 wins and a 60% win rate in one session". */
export function badgeSummary(badge: Pick<ClubBadgeInput, 'scope' | 'conditions'>): string {
  const parts = badge.conditions.map((c) => phrase[c.metric](c.min))
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : (parts[0] ?? '')
  return `At least ${list} ${badge.scope === 'session' ? 'in one session' : 'across all club sessions'}.`
}

/** A metric's value: win rate is a whole percentage of matches with a result (0 without any). */
export function metricValue(totals: BadgeTotals, metric: ClubBadgeMetric): number {
  switch (metric) {
    case 'pointDiff':
      return totals.pointsFor - totals.pointsAgainst
    case 'winRate': {
      const decided = totals.wins + totals.losses
      return decided ? Math.floor((totals.wins / decided) * 100) : 0
    }
    default:
      return totals[metric]
  }
}

/** Whether totals meet every condition. Nobody earns a badge without playing. */
export const meets = (totals: BadgeTotals, conditions: ClubBadgeCondition[]) =>
  totals.played > 0 && conditions.every((c) => metricValue(totals, c.metric) >= c.min)

/** Career totals per name key, over every finished match in the club's sessions. */
export function careerTotals(history: ClubHistory): Map<string, BadgeTotals> {
  const asPlayers = history.players.map((p) => ({ id: p.id, name: p.name, tierId: '' }) as PlayerState)
  const perPlayer = tally(asPlayers, history.matches)
  const out = new Map<string, BadgeTotals>()
  const sessions = new Map<string, Set<string>>()
  for (const p of history.players) {
    const t = perPlayer.get(p.id)
    if (!t) continue
    const key = careerKey(p.name)
    const sum = out.get(key) ?? { played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, streak: 0, sessions: 0 }
    sum.played += t.played
    sum.wins += t.wins
    sum.losses += t.losses
    sum.pointsFor += t.pointsFor
    sum.pointsAgainst += t.pointsAgainst
    if (t.played > 0) sessions.set(key, (sessions.get(key) ?? new Set()).add(p.sessionId))
    out.set(key, sum)
  }
  for (const [key, set] of sessions) out.get(key)!.sessions = set.size
  return out
}

/** A badge, as far as awarding it goes. */
export interface AwardableBadge {
  id: string
  scope: ClubBadgeInput['scope']
  conditions: ClubBadgeCondition[]
}

/**
 * Club badges per leaderboard entry: session badges from this session's
 * results, career badges from the totals of every club session (matched by name).
 */
export function awardClubBadges(entries: LeaderboardEntry[], badges: AwardableBadge[], career: Map<string, BadgeTotals>): LeaderboardEntry[] {
  return entries.map((e) => {
    const session: BadgeTotals = { ...e, sessions: 1 }
    const total = career.get(careerKey(e.name))
    const earned = badges.filter((b) => (b.scope === 'session' ? meets(session, b.conditions) : total ? meets(total, b.conditions) : false))
    return { ...e, clubBadges: earned.map((b) => b.id) }
  })
}

/** Career badges a club member has earned, by their name. */
export function memberCareerBadges(name: string, badges: AwardableBadge[], career: Map<string, BadgeTotals>): string[] {
  const total = career.get(careerKey(name))
  if (!total) return []
  return badges.filter((b) => b.scope === 'career' && meets(total, b.conditions)).map((b) => b.id)
}
