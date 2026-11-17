import { z } from 'zod'
import { handleProblem, normalizeHandle } from '@/utils/social/handles'

/** What someone typed to sign in: an email address, a username, or neither. */
export type LoginName = { kind: 'email'; email: string } | { kind: 'username'; username: string } | null

const emailShape = z.email()

/**
 * Tells an email from a username. Anything with an "@" after its first
 * character is an email; otherwise it's a username, with or without a
 * leading "@". `null` when it's neither a valid email nor a valid username.
 */
export function loginName(raw: string): LoginName {
  const value = raw.trim()
  if (value.slice(1).includes('@')) return emailShape.safeParse(value).success ? { kind: 'email', email: value.toLowerCase() } : null
  const username = normalizeHandle(value)
  return handleProblem(username, 'username') ? null : { kind: 'username', username }
}
