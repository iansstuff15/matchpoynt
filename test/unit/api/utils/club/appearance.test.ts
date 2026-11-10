import { describe, expect, it } from 'vitest'
import { cleanPosition, cleanTheme, contrast, positionOf, readableOn, themeOf } from '@/utils/club/appearance'
import { ApiError } from '@/utils/http/errors'

describe('cleanPosition', () => {
  it('keeps a position inside the photo, rounded', () => {
    expect(cleanPosition({ x: 33.333, y: 70, zoom: 1.256 })).toEqual({ x: 33.3, y: 70, zoom: 1.26 })
  })

  it('refuses positions outside the photo or zoom outside the limits, naming the field', () => {
    expect(() => cleanPosition({ x: 120, y: 50, zoom: 1 })).toThrow('inside the photo')
    expect(() => cleanPosition({ x: 50, y: 50, zoom: 0.5 })).toThrow('Zoom must be from 1× to 3×.')
    try {
      cleanPosition({ x: 50, y: 50, zoom: 4 })
    } catch (error) {
      expect((error as ApiError).fields).toEqual({ zoom: 'Out of range' })
    }
    expect(() => cleanPosition({ x: Number.NaN, y: 50, zoom: 1 })).toThrow('must be numbers')
  })
})

describe('positionOf', () => {
  it('centres photos saved before positions existed, and clamps odd stored values', () => {
    expect(positionOf(null)).toEqual({ x: 50, y: 50, zoom: 1 })
    expect(positionOf({ x: 140, y: -5, zoom: 9 })).toEqual({ x: 100, y: 0, zoom: 3 })
  })
})

describe('colours', () => {
  it('measures contrast as WCAG does', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 0)
    expect(contrast('#777777', '#777777')).toBe(1)
  })

  it('picks the more readable text colour for a background', () => {
    expect(readableOn('#2563eb')).toBe('#ffffff')
    expect(readableOn('#f59e0b')).toBe('#171717')
    expect(readableOn('#0f172a')).toBe('#ffffff')
  })

  it('accepts hex colours or null, lower-cased', () => {
    expect(cleanTheme({ accent: '#2563EB', sidebar: null })).toEqual({ accent: '#2563eb', sidebar: null })
    expect(() => cleanTheme({ accent: 'blue', sidebar: null })).toThrow("The accent colour isn't a colour Matchpoynt understands.")
    expect(() => cleanTheme({ accent: null, sidebar: '#12345' })).toThrow(/sidebar colour/)
  })

  it('works out every shade the app needs from two colours', () => {
    const theme = themeOf({ accent: '#2563eb', sidebar: '#0f172a' })!
    expect(theme).toMatchObject({ accent: '#2563eb', accentForeground: '#ffffff', sidebar: '#0f172a', sidebarAccentForeground: '#ffffff' })
    // Hover shade is lighter than a dark sidebar; its text still reads.
    expect(contrast(theme.sidebarAccent!, '#ffffff')).toBeGreaterThan(4.5)
    expect(contrast(theme.sidebarForeground!, theme.sidebar!)).toBeGreaterThan(4.5)
  })

  it('handles a light sidebar with dark text', () => {
    const theme = themeOf({ accent: null, sidebar: '#f5f5f4' })!
    expect(theme.sidebarAccentForeground).toBe('#171717')
    expect(theme.accent).toBeNull()
    expect(theme.sidebarBorder).toMatch(/^rgba\(0, 0, 0/)
  })

  it('means Matchpoynt’s own colours when neither is set', () => {
    expect(themeOf(null)).toBeNull()
    expect(themeOf({ accent: null, sidebar: null })).toBeNull()
  })
})
