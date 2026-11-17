import type { ClubTheme } from '@matchpoynt/shared'
import type { CSSProperties } from 'react'

/**
 * A club's colours as CSS variables for one element and what's inside it
 * (a club card), so its buttons and edges take the club's accent, its stage
 * the club's sidebar colour, and its panel the club's card colours. The API already picked readable text colours;
 * Matchpoynt's own stay wherever the club has none.
 */
export function clubThemeStyle(theme: ClubTheme | null): CSSProperties {
  if (!theme) return {}
  const vars: Record<string, string> = {}
  const set = (name: string, value: string | null) => {
    if (value) vars[`--${name}`] = value
  }
  set('primary', theme.accent)
  set('primary-foreground', theme.accentForeground)
  set('ring', theme.accent)
  set('logo-accent', theme.accent)
  set('club-stage', theme.sidebar)
  set('club-stage-foreground', theme.sidebarForeground)
  // The card's own surface and text, from the club's page colours.
  set('card', theme.card)
  set('card-foreground', theme.cardForeground)
  set('muted-foreground', theme.pageMutedForeground)
  set('border', theme.border)
  return vars as CSSProperties
}
