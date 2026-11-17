import { describe, expect, it } from 'vitest'
import { loginName } from '@/utils/auth/login'

describe('loginName', () => {
  it('reads an email address, in lower case', () => {
    expect(loginName(' Ana@Example.com ')).toEqual({ kind: 'email', email: 'ana@example.com' })
  })
  it('reads a username, with or without the "@"', () => {
    expect(loginName('ana.reyes')).toEqual({ kind: 'username', username: 'ana.reyes' })
    expect(loginName('@Ana.Reyes')).toEqual({ kind: 'username', username: 'ana.reyes' })
  })
  it('refuses what is neither', () => {
    expect(loginName('ana@')).toBeNull()
    expect(loginName('a')).toBeNull()
    expect(loginName('not a name')).toBeNull()
  })
})
