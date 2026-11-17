import { handleRules } from '@matchpoynt/shared'

// Club handles ("@riverside") and usernames: the same rules for both. Pure;
// whether one is free is answered by the database (club_handle_taken,
// username_taken) and its unique indexes.

/** As saved: no "@", no spaces around it, lower case. */
export const normalizeHandle = (raw: string) => raw.trim().replace(/^@+/, '').toLowerCase()

const pattern = new RegExp(handleRules.pattern)

/** What's wrong with a handle or username, in the user's words (`what` names it), or `null` when it's well formed. */
export function handleProblem(raw: string, what: 'handle' | 'username'): string | null {
  const value = normalizeHandle(raw)
  const name = what === 'handle' ? 'The handle' : 'Your username'
  if (!value) return what === 'handle' ? 'Pick a handle for the club, like @riverside.' : 'Pick a username, like @maria.'
  if (value.length < handleRules.minLength || value.length > handleRules.maxLength) {
    return `${name} must be ${handleRules.minLength} to ${handleRules.maxLength} characters.`
  }
  if (!pattern.test(value)) return `${name} can use letters, numbers, dots and underscores, and must start and end with a letter or number.`
  return null
}

/** A well-formed suggestion from a name ("Riverside Smashers" → "riversidesmashers"), or "" when nothing usable is left. */
export function suggestHandle(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, handleRules.maxLength)
  return base.length >= handleRules.minLength ? base : ''
}
