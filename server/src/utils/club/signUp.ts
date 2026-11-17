import { signUpLimits, type PlanSignUp } from '@matchpoynt/shared'

// Signing up for planned sessions: members ask (the owner approves) or sign
// themselves up, up to the plan's player cap. Pure rules, no I/O.

/** A plan as a member sees it, for deciding what they can do. */
export interface SignUpPlan {
  signUp: PlanSignUp
  maxPlayers: number | null
  /** On the roster now. */
  players: number
  /** When it's planned for, ISO, or `null` before it has a date. */
  when: string | null
  /** The viewer is on the roster. */
  joined: boolean
}

/** Places left under the plan's cap, or `null` without one. */
export function spotsLeft(maxPlayers: number | null, players: number): number | null {
  return maxPlayers === null ? null : Math.max(0, maxPlayers - players)
}

/** Why a plan's player cap isn't allowed, or `null`: a whole number in range, and not below the roster it already has. */
export function maxPlayersProblem(maxPlayers: number | null | undefined, rosterSize: number): string | null {
  if (maxPlayers == null) return null
  if (!Number.isInteger(maxPlayers) || maxPlayers < signUpLimits.minPlayers || maxPlayers > signUpLimits.maxPlayers) {
    return `The player cap is a whole number from ${signUpLimits.minPlayers} to ${signUpLimits.maxPlayers}, or leave it empty for no cap.`
  }
  if (rosterSize > maxPlayers) return `The roster already has ${rosterSize} players, more than the cap of ${maxPlayers}. Raise the cap or take some off.`
  return null
}

/**
 * Why the viewer can't sign up for the plan (`going`) or take themselves
 * off it, or `null` when they can. Signing up needs open sign-up and a place
 * left; neither works once the plan's start has passed.
 */
export function signUpBlockedReason(plan: SignUpPlan, going: boolean, now: number): string | null {
  if (plan.when !== null && Date.parse(plan.when) < now) return 'This session has already started.'
  if (!going) return plan.joined ? null : "You're not signed up for this session."
  if (plan.joined) return "You're already signed up."
  if (plan.signUp !== 'open') return 'Ask to join: the club approves each player for this session.'
  if (spotsLeft(plan.maxPlayers, plan.players) === 0) return "It's full. Ask the club if a place opens up."
  return null
}
