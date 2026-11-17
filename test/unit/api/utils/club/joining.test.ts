import { describe, expect, it } from 'vitest'
import { cleanJoining, joiningOf } from '@/utils/club/joining'

describe('joining settings', () => {
  it('keeps the approval mode, a trimmed message and tidied links', () => {
    expect(cleanJoining({ approval: 'auto', welcomeMessage: '  Welcome!  ', welcomeLinks: [{ label: ' Group chat ', url: 'chat.example.com/smash' }] })).toEqual({
      approval: 'auto',
      welcomeMessage: 'Welcome!',
      welcomeLinks: [{ label: 'Group chat', url: 'https://chat.example.com/smash' }],
    })
    expect(cleanJoining({ approval: 'manual', welcomeMessage: '   ', welcomeLinks: [] }).welcomeMessage).toBeNull()
  })

  it('refuses a long message, unnamed or broken links, and too many', () => {
    expect(() => cleanJoining({ approval: 'manual', welcomeMessage: 'x'.repeat(1001), welcomeLinks: [] })).toThrow('up to 1000')
    expect(() => cleanJoining({ approval: 'manual', welcomeMessage: null, welcomeLinks: [{ label: ' ', url: 'https://a.com' }] })).toThrow('Give every link a name')
    expect(() => cleanJoining({ approval: 'manual', welcomeMessage: null, welcomeLinks: [{ label: 'Chat', url: 'not a link' }] })).toThrow("isn't a web address")
    const six = Array.from({ length: 6 }, (_, i) => ({ label: `L${i}`, url: `https://a${i}.com` }))
    expect(() => cleanJoining({ approval: 'manual', welcomeMessage: null, welcomeLinks: six })).toThrow('up to 5 links')
  })

  it('reads stored settings, defaulting to manual approval', () => {
    expect(joiningOf({ join_approval: 'weird', welcome_message: null, welcome_links: null })).toEqual({ approval: 'manual', welcomeMessage: null, welcomeLinks: [] })
  })
})
