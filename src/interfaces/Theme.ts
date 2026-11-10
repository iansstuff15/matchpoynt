import type { ColorToken } from '@/types/theme'

export type Palette = Record<ColorToken, string>

export interface FontFamily {
  /** CSS font-family stack. */
  stack: string
}

export interface Theme {
  /** The one palette: the app is always light. */
  colors: Palette
  radius: string
  fonts: {
    sans: FontFamily
    display: FontFamily
  }
  fontWeights: {
    regular: number
    medium: number
    semibold: number
    bold: number
  }
  /** Extra type sizes beyond Tailwind's scale, as `[size, lineHeight]`. */
  fontSizes: Record<'display-xl' | 'hero' | 'display', [string, string]>
}

/** GSAP timing tokens (seconds, eases, distances). */
export interface GsapMotion {
  /** Cards and lines rising into place as their section scrolls in. */
  reveal: { duration: number; ease: string; distance: number; stagger: number; start: string }
  /** Headings riding in letter by letter on a sine wave. */
  wave: { duration: number; ease: string; stagger: number; lift: number; tilt: number; frequency: number; start: string }
  /** Splash: wordmark rise, hold, curtain wipe (seconds) and the curtain edge's wave height (px). */
  splash: { reveal: number; hold: number; wipe: number; waveAmplitude: number }
  /** Seconds for one loop of the sports strip. */
  marquee: { duration: number }
  /** Leaderboard: players sliding to new places, podium bars growing, numbers counting up. */
  leaderboard: { flip: number; flipEase: string; bars: number; barsEase: string; count: number; stagger: number; start: string }
}

export interface Motion {
  gsap: GsapMotion
  durations: Record<'fast' | 'base' | 'slow', string>
  /** Looping ambient effects (CSS keyframes in animations/animations.css). */
  loops: Record<'flicker' | 'ember', string>
  easings: Record<'out' | 'inOut', string>
  /** Delay between items in a staggered reveal, in ms. */
  stagger: number
  carouselInterval: number
}
