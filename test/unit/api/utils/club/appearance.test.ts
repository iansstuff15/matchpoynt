import { describe, expect, it } from 'vitest'
import { cleanPosition, cleanTheme, colorsOf, contrast, positionOf, readableOn, savedThemesOf, themeOf, withSavedTheme } from '@/utils/club/appearance'
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
    expect(cleanTheme({ accent: '#2563EB', sidebar: null, page: '#FAF5EB' })).toEqual({ accent: '#2563eb', sidebar: null, page: '#faf5eb' })
    expect(() => cleanTheme({ accent: 'blue', sidebar: null, page: null })).toThrow("The accent colour isn't a colour Matchpoynt understands.")
    expect(() => cleanTheme({ accent: null, sidebar: '#12345', page: null })).toThrow(/sidebar colour/)
    expect(() => cleanTheme({ accent: null, sidebar: null, page: 'white' })).toThrow(/page colour/)
  })

  it('works out every shade the app needs from two colours', () => {
    const theme = themeOf({ accent: '#2563eb', sidebar: '#0f172a', page: null })!
    expect(theme).toMatchObject({ accent: '#2563eb', accentForeground: '#ffffff', sidebar: '#0f172a', sidebarAccentForeground: '#ffffff' })
    // Hover shade is lighter than a dark sidebar; its text still reads.
    expect(contrast(theme.sidebarAccent!, '#ffffff')).toBeGreaterThan(4.5)
    expect(contrast(theme.sidebarForeground!, theme.sidebar!)).toBeGreaterThan(4.5)
  })

  it('handles a light sidebar with dark text', () => {
    const theme = themeOf({ accent: null, sidebar: '#f5f5f4', page: null })!
    expect(theme.sidebarAccentForeground).toBe('#171717')
    expect(theme.accent).toBeNull()
    expect(theme.sidebarBorder).toMatch(/^rgba\(0, 0, 0/)
  })

  it('means Matchpoynt’s own colours when neither is set', () => {
    expect(themeOf(null)).toBeNull()
    expect(themeOf({ accent: null, sidebar: null, page: null })).toBeNull()
  })

  it('reads colours saved before the page colour existed', () => {
    expect(colorsOf({ accent: '#2563EB', sidebar: '#0f172a' })).toEqual({ accent: '#2563eb', sidebar: '#0f172a', page: null })
    expect(themeOf({ accent: '#2563eb', sidebar: null } as never)!.page).toBeNull()
  })
})

describe('page colour', () => {
  /** Every pair of text and background on the centre panel reads (WCAG AA). */
  function expectReadable(page: string) {
    const t = themeOf({ accent: null, sidebar: null, page })!
    expect(t.page).toBe(page)
    for (const bg of [t.page!, t.card!, t.pageMuted!]) expect(contrast(t.pageMutedForeground!, bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t.pageForeground!, t.page!)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t.cardForeground!, t.card!)).toBeGreaterThanOrEqual(4.5)
    return t
  }

  it('keeps a light page light, with dark text and near-white cards', () => {
    const t = expectReadable('#faf5eb')
    expect(t.pageForeground).toBe('#171717')
    expect(t.cardForeground).toBe('#171717')
  })

  it('turns everything on a dark page around: light text, lifted cards, light borders', () => {
    const t = expectReadable('#0f172a')
    expect(t.pageForeground).toBe('#ffffff')
    expect(t.cardForeground).toBe('#ffffff')
    expect(contrast(t.card!, '#000000')).toBeGreaterThan(contrast(t.page!, '#000000'))
  })

  it('stays readable on mid tones and strong colours', () => {
    for (const page of ['#777777', '#808080', '#ff0000', '#16a34a', '#fde047']) expectReadable(page)
  })
})

describe('saved themes', () => {
  const colors = { accent: '#2563eb', sidebar: '#0f172a', page: null }

  it('adds a named theme, tidied', () => {
    expect(withSavedTheme([], { name: '  Night   game ', colors: { ...colors, accent: '#2563EB' } }, 't1')).toEqual([{ id: 't1', name: 'Night game', colors }])
  })

  it('refuses a missing or repeated name, no colours, or a full list', () => {
    const one = withSavedTheme([], { name: 'Night', colors }, 't1')
    expect(() => withSavedTheme([], { name: ' ', colors }, 't2')).toThrow('Give the theme a name.')
    expect(() => withSavedTheme(one, { name: 'night', colors }, 't2')).toThrow("There's already a theme called night.")
    expect(() => withSavedTheme([], { name: 'Plain', colors: { accent: null, sidebar: null, page: null } }, 't2')).toThrow(/at least one colour/)
    const full = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, name: `T${i}`, colors }))
    expect(() => withSavedTheme(full, { name: 'More', colors }, 'x')).toThrow('up to 12 themes')
  })

  it('reads stored themes, skipping broken entries', () => {
    expect(savedThemesOf([{ id: 'a', name: 'A', colors }, { name: 'no id' }, null])).toEqual([{ id: 'a', name: 'A', colors }])
    expect(savedThemesOf(null)).toEqual([])
  })
})
