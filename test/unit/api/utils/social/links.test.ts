import { describe, expect, it } from 'vitest'
import { cleanSocialLinks, socialLinksOf } from '@/utils/social/links'

describe('social links', () => {
  it('adds https and keeps each link on its own site', () => {
    expect(
      cleanSocialLinks([
        { platform: 'instagram', url: 'instagram.com/smashclub' },
        { platform: 'facebook', url: 'http://www.facebook.com/smash' },
        { platform: 'website', url: 'https://smash.club/join' },
      ]),
    ).toEqual([
      { platform: 'instagram', url: 'https://instagram.com/smashclub' },
      { platform: 'facebook', url: 'https://www.facebook.com/smash' },
      { platform: 'website', url: 'https://smash.club/join' },
    ])
  })

  it('refuses a link on the wrong site, something that is not an address, repeats, or too many', () => {
    expect(() => cleanSocialLinks([{ platform: 'instagram', url: 'https://facebook.com/smash' }])).toThrow("isn't on instagram.com")
    expect(() => cleanSocialLinks([{ platform: 'website', url: 'javascript:alert(1)' }])).toThrow("isn't a web address")
    expect(() => cleanSocialLinks([{ platform: 'website', url: ' ' }])).toThrow("isn't a web address")
    expect(() => cleanSocialLinks([{ platform: 'website', url: 'a.com' }, { platform: 'website', url: 'https://A.com' }])).toThrow('added once')
    expect(() => cleanSocialLinks(Array.from({ length: 11 }, (_, i) => ({ platform: 'website' as const, url: `https://a${i}.com` })))).toThrow('up to 10')
  })

  it('reads stored links, skipping broken ones', () => {
    expect(socialLinksOf([{ platform: 'x', url: 'https://x.com/a' }, { platform: 'myspace', url: 'https://myspace.com' }, null])).toEqual([{ platform: 'x', url: 'https://x.com/a' }])
  })
})
