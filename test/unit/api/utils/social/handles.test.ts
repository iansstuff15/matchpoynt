import { describe, expect, it } from 'vitest'
import { handleProblem, normalizeHandle, suggestHandle } from '@/utils/social/handles'

describe('handles and usernames', () => {
  it('saves them lower case, without the "@" or spaces around', () => {
    expect(normalizeHandle('  @Riverside_Smash ')).toBe('riverside_smash')
  })

  it('takes letters, numbers, dots and underscores, starting and ending with a letter or number', () => {
    for (const ok of ['abc', 'smash.club', 'a_b_c', 'club2026', '@Ana.Reyes']) expect(handleProblem(ok, 'handle')).toBeNull()
    expect(handleProblem('', 'handle')).toContain('Pick a handle')
    expect(handleProblem('', 'username')).toContain('Pick a username')
    expect(handleProblem('ab', 'handle')).toContain('3 to 30')
    expect(handleProblem('x'.repeat(31), 'username')).toContain('3 to 30')
    for (const bad of ['smash club', 'smash-club', '_smash', 'smash.', 'smásh']) expect(handleProblem(bad, 'handle')).toContain('letters, numbers, dots and underscores')
  })

  it('suggests one from a name', () => {
    expect(suggestHandle('Riverside Smashers')).toBe('riversidesmashers')
    expect(suggestHandle('Ána Réyes!')).toBe('anareyes')
    expect(suggestHandle('A')).toBe('')
  })
})
