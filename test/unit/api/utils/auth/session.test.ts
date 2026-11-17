import { describe, expect, it } from 'vitest'
import { emailConfirmed } from '@/utils/auth/session'

describe('emailConfirmed', () => {
  it('lets accounts in only once their email is confirmed', () => {
    expect(emailConfirmed({ isAnonymous: false, emailVerified: true })).toBe(true)
    expect(emailConfirmed({ isAnonymous: false, emailVerified: false })).toBe(false)
  })

  it('lets guests in, who have no email to confirm', () => {
    expect(emailConfirmed({ isAnonymous: true, emailVerified: false })).toBe(true)
  })
})
