import { describe, expect, it, vi } from 'vitest'
import { actionUrl, afterSignIn, providerCallbackUrl, returnPath } from '@/utils/auth/returnTo'

describe('returnPath', () => {
  it('returns to allowed app pages', () => {
    expect(returnPath('/app')).toBe('/app')
    expect(returnPath('/rankings')).toBe('/rankings')
  })

  it("returns to a finished session's page", () => {
    const page = '/app/3f2b8c1e-9a4d-4c7b-8e21-5d6f7a8b9c0d'
    expect(returnPath(page)).toBe(page)
  })

  it('returns to the past sessions list', () => {
    expect(returnPath('/app/past')).toBe('/app/past')
    expect(returnPath('/app/pastx')).toBe('/app')
  })

  it('returns to an invite, which skips the profile redirect (it has its own sign-up form)', () => {
    const page = '/invite/AbCdEfGhIjKlMnOpQrStUv'
    expect(returnPath(page)).toBe(page)
    expect(afterSignIn(page, false)).toBe(page)
    expect(returnPath('/invite/short')).toBe('/app')
  })

  it("returns to the clubs list and a club's page", () => {
    expect(returnPath('/clubs')).toBe('/clubs')
    const page = '/clubs/0b7d1c2e-3f4a-4b5c-8d6e-7f8091a2b3c4'
    expect(returnPath(page)).toBe(page)
  })

  it('sends anything else to the board, so links cannot redirect off-site', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/app/../evil', '/app/not-a-session', '/clubs/x', '/clubs/0b7d1c2e-3f4a-4b5c-8d6e-7f8091a2b3c4/members', '/app/3f2b8c1e-9a4d-4c7b-8e21-5d6f7a8b9c0d/x', '/sign-in', '', null, undefined]) {
      expect(returnPath(bad)).toBe('/app')
    }
  })
})

describe('afterSignIn', () => {
  it('finishes the profile first', () => {
    expect(afterSignIn('/rankings', false)).toBe('/complete-profile')
    expect(afterSignIn('/rankings', true)).toBe('/rankings')
  })
})

describe('emailed links and provider returns', () => {
  vi.stubEnv('APP_URL', 'https://matchpoynt.com')
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon')
  vi.stubEnv('FIREBASE_API_KEY', 'key')
  vi.stubEnv('FIREBASE_PROJECT_ID', 'project')
  vi.stubEnv('FIREBASE_CLIENT_EMAIL', 'api@project.iam.gserviceaccount.com')
  vi.stubEnv('FIREBASE_PRIVATE_KEY', 'key')

  it('continues an emailed link to an allowed page', () => {
    expect(actionUrl('/clubs')).toBe('https://matchpoynt.com/api/auth/action?next=%2Fclubs')
  })

  it('never continues to a page off the allow-list', () => {
    expect(actionUrl('https://evil.example')).toBe('https://matchpoynt.com/api/auth/action?next=%2Fapp')
  })

  it('carries the email a sign-in link needs to finish on any device', () => {
    const url = new URL(actionUrl('/invite/AbCdEfGhIjKlMnOpQrStUv', 'ana@example.com'))
    expect(url.searchParams.get('next')).toBe('/invite/AbCdEfGhIjKlMnOpQrStUv')
    expect(url.searchParams.get('email')).toBe('ana@example.com')
  })

  it('brings Google and Apple back to the API', () => {
    expect(providerCallbackUrl()).toBe('https://matchpoynt.com/api/auth/callback')
  })
})
