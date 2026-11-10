import type { Motion, Palette, Theme } from '../../interfaces/Theme.ts'

// Relative imports: this file is also loaded by vite.config.ts, outside the `@` alias.

const declarations = (vars: Record<string, string | number>) =>
  Object.entries(vars)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join('\n')

const paletteVars = (palette: Palette) => declarations(palette)

/**
 * Builds the CSS custom properties shadcn and Tailwind read: semantic colors
 * (one light palette), radius, fonts, weights, sizes and motion timings.
 */
export function themeToCss(theme: Theme, motion: Motion): string {
  const shared = declarations({
    radius: theme.radius,
    'gp-font-sans': theme.fonts.sans.stack,
    'gp-font-display': theme.fonts.display.stack,
    'gp-font-weight-regular': theme.fontWeights.regular,
    'gp-font-weight-medium': theme.fontWeights.medium,
    'gp-font-weight-semibold': theme.fontWeights.semibold,
    'gp-font-weight-bold': theme.fontWeights.bold,
    'gp-text-display-xl': theme.fontSizes['display-xl'][0],
    'gp-text-display-xl-lh': theme.fontSizes['display-xl'][1],
    'gp-text-hero': theme.fontSizes.hero[0],
    'gp-text-hero-lh': theme.fontSizes.hero[1],
    'gp-text-display': theme.fontSizes.display[0],
    'gp-text-display-lh': theme.fontSizes.display[1],
    'gp-duration-fast': motion.durations.fast,
    'gp-duration-base': motion.durations.base,
    'gp-duration-slow': motion.durations.slow,
    'gp-loop-flicker': motion.loops.flicker,
    'gp-loop-ember': motion.loops.ember,
    'gp-ease-out': motion.easings.out,
    'gp-ease-in-out': motion.easings.inOut,
  })

  return `:root {\n${shared}\n${paletteVars(theme.colors)}\n  color-scheme: light;\n}`
}
