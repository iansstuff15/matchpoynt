import { clubThemeLimits, photoPositions, type ClubTheme, type ClubThemeInput, type PhotoPosition, type SavedClubTheme, type SavedThemeInput } from '@matchpoynt/shared'
import { invalid } from '@/utils/http/errors'

// How a club looks: where its photos sit in their frames, and its colours.
// Pure: the API checks what's sent and works out readable text colours, so
// the web app only applies what comes back.

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n))

/** A photo's position, checked: x and y are percentages, zoom is between the limits. Rounded to keep it tidy. */
export function cleanPosition(input: PhotoPosition): PhotoPosition {
  const { x, y, zoom } = input
  if (![x, y, zoom].every(Number.isFinite)) throw invalid('The photo position must be numbers.', { position: 'Not a number' })
  if (x < 0 || x > 100 || y < 0 || y > 100) throw invalid('The photo position must be inside the photo (0 to 100%).', { position: 'Out of range' })
  if (zoom < photoPositions.zoomMin || zoom > photoPositions.zoomMax) {
    throw invalid(`Zoom must be from ${photoPositions.zoomMin}× to ${photoPositions.zoomMax}×.`, { zoom: 'Out of range' })
  }
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, zoom: Math.round(zoom * 100) / 100 }
}

/** A stored position, or the default for photos saved before positions existed. */
export function positionOf(stored: unknown): PhotoPosition {
  const p = stored as Partial<PhotoPosition> | null
  if (!p || typeof p !== 'object') return { ...photoPositions.default }
  return {
    x: clamp(Number(p.x ?? 50), 0, 100),
    y: clamp(Number(p.y ?? 50), 0, 100),
    zoom: clamp(Number(p.zoom ?? 1), photoPositions.zoomMin, photoPositions.zoomMax),
  }
}

const hex = /^#[0-9a-f]{6}$/i

function rgb(color: string): [number, number, number] {
  const n = Number.parseInt(color.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = ([r, g, b]: [number, number, number]) => `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(color: string): number {
  const [r, g, b] = rgb(color).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** White or near-black, whichever reads better on `background`. */
export const readableOn = (background: string) => (contrast(background, '#ffffff') >= contrast(background, '#171717') ? '#ffffff' : '#171717')

/** `color` moved `amount` (0–1) toward `toward`. */
const mix = (color: string, toward: string, amount: number) => {
  const a = rgb(color)
  const b = rgb(toward)
  return toHex([0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * amount) as [number, number, number])
}

const colorKeys = ['accent', 'sidebar', 'page'] as const

/** Colours as stored, with any colour saved before it existed (the page) as Matchpoynt's own. */
export function colorsOf(stored: unknown): ClubThemeInput | null {
  const c = stored as Partial<ClubThemeInput> | null
  if (!c || typeof c !== 'object') return null
  const pick = (v: unknown) => (typeof v === 'string' && hex.test(v) ? v.toLowerCase() : null)
  return { accent: pick(c.accent), sidebar: pick(c.sidebar), page: pick(c.page) }
}

const isBlank = (colors: ClubThemeInput) => colorKeys.every((k) => !colors[k])

/** Colours checked: each a #rrggbb hex, or null for Matchpoynt's own. Lower-cased. */
export function cleanTheme(input: ClubThemeInput): ClubThemeInput {
  const fields: Record<string, string> = {}
  for (const key of colorKeys) {
    const value = input[key]
    if (value !== null && !hex.test(value)) fields[key] = 'Use a colour like #2563eb.'
  }
  const first = Object.entries(fields)[0]
  if (first) throw invalid(`The ${first[0]} colour isn't a colour Matchpoynt understands. ${first[1]}`, fields)
  return { accent: input.accent?.toLowerCase() ?? null, sidebar: input.sidebar?.toLowerCase() ?? null, page: input.page?.toLowerCase() ?? null }
}

/** Contrast normal text needs (WCAG AA). */
const readable = 4.5

/** The text colour for `background`: white or near-black, or pure black or white on mid tones where neither reaches AA. */
function inkOn(background: string): string {
  const best = readableOn(background)
  if (contrast(best, background) >= readable) return best
  return contrast('#000000', background) >= contrast('#ffffff', background) ? '#000000' : '#ffffff'
}

/**
 * Everything on the centre panel, from its background: its text, cards (a
 * step lighter on a dark page, near-white on a light one), muted fills and
 * borders, and muted text as soft as it can be while still reading on all of
 * them. Cards and fills move away from the text instead when the usual
 * direction would make it hard to read (mid tones).
 */
function pageShades(page: string) {
  const ink = inkOn(page)
  const dark = ink === '#ffffff'
  const toward = dark ? '#ffffff' : '#000000'
  const away = dark ? '#000000' : '#ffffff'
  const keepsInk = (bg: string) => contrast(ink, bg) >= readable
  const shade = (preferred: string, fallback: string) => (keepsInk(preferred) ? preferred : fallback)
  const card = shade(mix(page, '#ffffff', dark ? 0.07 : 0.7), mix(page, away, 0.1))
  const muted = shade(mix(page, toward, dark ? 0.1 : 0.04), mix(page, away, 0.06))
  const softest = [0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05]
    .map((t) => mix(ink, page, t))
    .find((c) => [page, card, muted].every((bg) => contrast(c, bg) >= readable))
  return {
    page,
    pageForeground: ink,
    pageMuted: muted,
    pageMutedForeground: softest ?? ink,
    card,
    cardForeground: ink,
    border: mix(page, toward, dark ? 0.18 : 0.1),
  }
}

/**
 * A club's colours, ready to apply: text on the accent and on the sidebar is
 * white or near-black, whichever reads better; the sidebar's hover and border
 * shades are the sidebar colour moved toward the opposite end; the page brings
 * its own text, cards, muted shades and borders (`pageShades`).
 */
export function themeOf(stored: ClubThemeInput | null): ClubTheme | null {
  const colors = colorsOf(stored)
  if (!colors || isBlank(colors)) return null
  const { accent, sidebar, page } = colors
  const sidebarText = sidebar ? readableOn(sidebar) : null
  const dark = sidebarText === '#ffffff'
  const none = { page: null, pageForeground: null, pageMuted: null, pageMutedForeground: null, card: null, cardForeground: null, border: null }
  return {
    colors,
    accent,
    accentForeground: accent ? readableOn(accent) : null,
    sidebar,
    sidebarForeground: sidebar ? mix(sidebarText!, dark ? '#000000' : '#ffffff', 0.25) : null,
    sidebarAccent: sidebar ? mix(sidebar, dark ? '#ffffff' : '#000000', 0.1) : null,
    sidebarAccentForeground: sidebarText,
    sidebarBorder: sidebar ? (dark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)') : null,
    ...(page ? pageShades(page) : none),
  }
}

/** A club's saved themes as stored, skipping anything unreadable. */
export function savedThemesOf(stored: unknown): SavedClubTheme[] {
  if (!Array.isArray(stored)) return []
  return stored.flatMap((t: Partial<SavedClubTheme>) => {
    const colors = colorsOf(t?.colors)
    return typeof t?.id === 'string' && typeof t.name === 'string' && colors ? [{ id: t.id, name: t.name, colors }] : []
  })
}

/**
 * Adds the colours as a named theme: a name no other saved theme has, at
 * least one colour, and room for it. Returns the club's new list.
 */
export function withSavedTheme(saved: SavedClubTheme[], input: SavedThemeInput, id: string): SavedClubTheme[] {
  const name = input.name.trim().replace(/\s+/g, ' ')
  if (!name) throw invalid('Give the theme a name.', { name: 'Required' })
  if (name.length > clubThemeLimits.nameMaxLength) throw invalid(`Theme names can be up to ${clubThemeLimits.nameMaxLength} characters.`, { name: 'Too long' })
  if (saved.some((t) => t.name.toLowerCase() === name.toLowerCase())) throw invalid(`There's already a theme called ${name}. Pick another name.`, { name: 'Taken' })
  const colors = cleanTheme(input.colors)
  if (isBlank(colors)) throw invalid("Pick at least one colour before saving a theme. Matchpoynt's own colours are always there.", { colors: 'No colours' })
  if (saved.length >= clubThemeLimits.maxSaved) throw invalid(`A club can save up to ${clubThemeLimits.maxSaved} themes. Delete one to make room.`, { name: 'Full' })
  return [...saved, { id, name, colors }]
}
