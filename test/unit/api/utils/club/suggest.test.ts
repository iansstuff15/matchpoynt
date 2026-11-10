import { describe, expect, it } from 'vitest'
import { normalizeName, rankSuggestions, type SuggestionCandidate } from '@/utils/club/suggest'

const c = (name: string, clubId = 'k1'): SuggestionCandidate => ({ memberId: name, name, tierId: null, clubName: clubId, clubId })

describe('rankSuggestions', () => {
  const all = [c('Ana Reyes'), c('Diana Lim'), c('Anabel Cruz', 'k2'), c('Mark Ana'), c('Ben Tan')]

  it('puts the session club and name starts first', () => {
    expect(rankSuggestions('an', all, [], 'k1', 10).map((s) => s.name)).toEqual(['Ana Reyes', 'Mark Ana', 'Ben Tan', 'Diana Lim', 'Anabel Cruz'])
  })

  it('skips players already in the session, ignoring case and accents', () => {
    expect(rankSuggestions('an', all, ['ána reyes'], 'k1', 10).map((s) => s.name)).not.toContain('Ana Reyes')
  })

  it('needs something typed, and lists each name once', () => {
    expect(rankSuggestions('  ', all, [], null, 10)).toEqual([])
    expect(rankSuggestions('ben', [c('Ben Tan'), c('Ben Tan', 'k2')], [], null, 10)).toHaveLength(1)
    expect(normalizeName('  José   Cruz ')).toBe('jose cruz')
  })
})
