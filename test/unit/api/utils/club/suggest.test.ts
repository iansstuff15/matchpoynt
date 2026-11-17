import { describe, expect, it } from 'vitest'
import { normalizeName, rankSuggestions, type SuggestionCandidate } from '@/utils/club/suggest'

const c = (name: string, clubId = 'k1', extra: Partial<SuggestionCandidate> = {}): SuggestionCandidate => ({
  memberId: name,
  name,
  tierId: null,
  clubName: clubId,
  clubId,
  username: null,
  email: null,
  avatarUrl: null,
  ...extra,
})

describe('rankSuggestions', () => {
  const all = [c('Ana Reyes'), c('Diana Lim'), c('Anabel Cruz', 'k2'), c('Mark Ana'), c('Ben Tan')]

  it('puts the session club and name starts first', () => {
    expect(rankSuggestions('an', all, [], 'k1', 10).map((s) => s.name)).toEqual(['Ana Reyes', 'Mark Ana', 'Ben Tan', 'Diana Lim', 'Anabel Cruz'])
  })

  it('skips players already in the session, ignoring case and accents', () => {
    expect(rankSuggestions('an', all, ['ána reyes'], 'k1', 10).map((s) => s.name)).not.toContain('Ana Reyes')
  })

  it('also finds members by the start of their email or @username, names first', () => {
    const people = [c('Ana Reyes'), c('Maria Santos', 'k1', { email: 'ana.s@example.com' }), c('Ben Tan', 'k1', { username: 'anabolic' })]
    expect(rankSuggestions('an', people, [], 'k1', 5).map((s) => s.name)).toEqual(['Ana Reyes', 'Ben Tan', 'Maria Santos'])
    expect(rankSuggestions('@anab', people, [], 'k1', 5).map((s) => s.name)).toEqual(['Ben Tan'])
    expect(rankSuggestions('ana.s@', people, [], 'k1', 5)[0]).toMatchObject({ name: 'Maria Santos', email: 'ana.s@example.com' })
  })

  it('needs something typed, and lists each name once', () => {
    expect(rankSuggestions('  ', all, [], null, 10)).toEqual([])
    expect(rankSuggestions('ben', [c('Ben Tan'), c('Ben Tan', 'k2')], [], null, 10)).toHaveLength(1)
    expect(normalizeName('  José   Cruz ')).toBe('jose cruz')
  })
})
