import type { MemberSuggestion } from '@matchpoynt/shared'

// Ranking member suggestions for the player-name field. Pure.

export interface SuggestionCandidate extends MemberSuggestion {
  clubId: string
}

/** Whether a candidate matches what was typed: their name contains it, or their email or @username starts with it. */
const matches = (c: SuggestionCandidate, q: string) => {
  const handle = q.replace(/^@/, '')
  return normalizeName(c.name).includes(q) || Boolean(c.email?.toLowerCase().startsWith(q)) || Boolean(c.username?.startsWith(handle))
}

/** Lower-case, accents stripped, spaces collapsed: "  José  Cruz" → "jose cruz". */
export const normalizeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

/**
 * Members whose name contains what was typed, or whose email or @username
 * starts with it, minus anyone already in the session: the session's own club
 * first, then names that start with it (or have a word that does), then
 * email and username matches, then alphabetical. One entry per name.
 */
export function rankSuggestions(query: string, candidates: SuggestionCandidate[], taken: string[], preferClubId: string | null, limit: number): MemberSuggestion[] {
  const q = normalizeName(query)
  if (!q) return []
  const skip = new Set(taken.map(normalizeName))
  const seen = new Set<string>()
  const score = (c: SuggestionCandidate) => {
    const name = normalizeName(c.name)
    return (c.clubId === preferClubId ? 0 : 4) + (name.startsWith(q) ? 0 : name.split(' ').some((w) => w.startsWith(q)) ? 1 : name.includes(q) ? 2 : 3)
  }
  return candidates
    .filter((c) => matches(c, q) && !skip.has(normalizeName(c.name)))
    .sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name))
    .filter((c) => {
      const key = normalizeName(c.name)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
    .map(({ clubId: _club, ...s }) => s)
}
