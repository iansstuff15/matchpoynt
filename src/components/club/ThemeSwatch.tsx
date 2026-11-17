import type { ClubThemeInput } from '@matchpoynt/shared'
import { theme } from '@/config/theme'

/**
 * A club theme in miniature: its sidebar and page side by side, its accent as
 * a dot. Colours left as Matchpoynt's own come from `config/theme.ts` (the
 * live tokens may be a club's).
 */
export default function ThemeSwatch({ colors }: { colors: ClubThemeInput }) {
  return (
    <span className="theme-preset-swatch" aria-hidden>
      <span className="theme-preset-swatch-half" style={{ background: colors.sidebar ?? theme.colors.sidebar }} />
      <span className="theme-preset-swatch-half" style={{ background: colors.page ?? theme.colors.background }} />
      <span className="theme-preset-swatch-dot" style={{ background: colors.accent ?? theme.colors.primary }} />
    </span>
  )
}
