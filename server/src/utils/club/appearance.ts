import { photoPositions, type ClubTheme, type ClubThemeInput, type PhotoPosition } from '@matchpoynt/shared'
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

/** `color` moved `amount` (0–1) toward white or black. */
const mix = (color: string, toward: '#ffffff' | '#000000', amount: number) => {
  const a = rgb(color)
  const b = rgb(toward)
  return toHex([0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * amount) as [number, number, number])
}

/** Colours checked: each a #rrggbb hex, or null for Matchpoynt's own. Lower-cased. */
export function cleanTheme(input: ClubThemeInput): ClubThemeInput {
  const fields: Record<string, string> = {}
  for (const key of ['accent', 'sidebar'] as const) {
    const value = input[key]
    if (value !== null && !hex.test(value)) fields[key] = 'Use a colour like #2563eb.'
  }
  const first = Object.entries(fields)[0]
  if (first) throw invalid(`The ${first[0]} colour isn't a colour Matchpoynt understands. ${first[1]}`, fields)
  return { accent: input.accent?.toLowerCase() ?? null, sidebar: input.sidebar?.toLowerCase() ?? null }
}

/**
 * A club's colours, ready to apply: text on the accent and on the sidebar is
 * white or near-black, whichever reads better; the sidebar's hover and border
 * shades are the sidebar colour moved toward the opposite end.
 */
export function themeOf(colors: ClubThemeInput | null): ClubTheme | null {
  if (!colors || (!colors.accent && !colors.sidebar)) return null
  const { accent, sidebar } = colors
  const sidebarText = sidebar ? readableOn(sidebar) : null
  const dark = sidebarText === '#ffffff'
  return {
    colors,
    accent,
    accentForeground: accent ? readableOn(accent) : null,
    sidebar,
    sidebarForeground: sidebar ? mix(sidebarText!, dark ? '#000000' : '#ffffff', 0.25) : null,
    sidebarAccent: sidebar ? mix(sidebar, dark ? '#ffffff' : '#000000', 0.1) : null,
    sidebarAccentForeground: sidebarText,
    sidebarBorder: sidebar ? (dark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)') : null,
  }
}
