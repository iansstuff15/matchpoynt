import type { SessionRules } from '../interfaces/Session.ts'
import type { MatchmakingStrategyId, SetupStepId } from '../types/session.ts'

const rules: SessionRules = {
  autoFill: false,
  timeLimitMinutes: null,
  queueing: 'automatic',
  lateJoiners: 'fair',
}

const matchmaking: MatchmakingStrategyId = 'rotation'

/** Previous sessions on the session board: how many the list loads at a time. */
export const sessionHistory = {
  pageSize: 12,
}

/** Starting values for a new session. */
export const sessionDefaults = {
  courtCount: 4,
  maxCourts: 16,
  maxPlayers: 200,
  maxNameLength: 60,
  /** Suggested limit when the time-limit rule is switched on. */
  timeLimitMinutes: 15,
  matchmaking,
  rules,
}

/** Rules the sign-up and profile forms show, and the API enforces. */
export const accountLimits = {
  /** Rivals and partners shown on Your record, and how many matches make someone one. */
  rivalsShown: 10,
  rivalMinMatches: 2,
  /** Games on one page of a profile's history. */
  gamesPageSize: 15,
  passwordMinLength: 8,
  nameMaxLength: 60,
  displayNameMinLength: 2,
  displayNameMaxLength: 30,
  phoneMaxLength: 30,
  cityMaxLength: 80,
}

export const accountRoles = ['queue_master', 'player', 'both'] as const

export const signUpStepIds = ['account', 'profile', 'sports', 'agreements'] as const

export const setupStepIds: SetupStepId[] = ['courts', 'members', 'scoring', 'rules', 'matchmaking', 'fees']

export const matchmakingStrategyIds: MatchmakingStrategyId[] = ['rotation', 'balanced', 'skill-grouped']
