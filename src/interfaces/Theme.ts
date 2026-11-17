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
  /**
   * Splash: the logo's arches fly in from either side (`approach`, from `distance` px away) and crash
   * together; the impact squashes the mark by `squash`, shakes it `shake` px for `impact` seconds and
   * sends out a ring. Then hold, curtain wipe (seconds) and the curtain edge's wave height (px). Going
   * straight to the app there's no wipe: `handoff` below takes over.
   */
  splash: {
    approach: number
    distance: number
    impact: number
    squash: number
    shake: number
    hold: number
    wipe: number
    waveAmplitude: number
    /** The impact's circles at the crash: the ring's final scale and starting thickness (px), the echo ring's scale and delay (s), how long they spread (s), and the flash behind the logo. */
    ring: { scale: number; echoScale: number; echoDelay: number; thickness: number; duration: number; flashScale: number; flashOpacity: number }
  }
  /** Seconds for one loop of the sports strip. */
  marquee: { duration: number }
  /** Leaderboard: players sliding to new places, podium bars growing, numbers counting up. */
  leaderboard: { flip: number; flipEase: string; bars: number; barsEase: string; count: number; stagger: number; start: string }
  /**
   * Playing now: cards and rows rising in (`stagger` apart), figures counting up over `count`, queue rows
   * sliding to new places over `flip`, and "You are now playing": the sides sliding in from `sideDistance`
   * px either side and meeting over `meet` seconds, "vs" popping in last.
   */
  play: { stagger: number; count: number; flip: number; flipEase: string; sideDistance: number; meet: number }
  /** The club picker and start page: the title and Find clubs sheet fade in rising `rise` px, the tiles scale in from `tileScale`, `stagger` apart, over `duration`; picking fades everything out over `pick`. */
  picker: { duration: number; stagger: number; rise: number; tileScale: number; ease: string; pick: number }
}

export interface Motion {
  gsap: GsapMotion
  durations: Record<'fast' | 'base' | 'slow', string>
  /** Looping ambient effects (CSS keyframes in animations/animations.css). */
  loops: Record<'flicker' | 'ember' | 'archBob' | 'ctaPulse' | 'loadingBar', string>
  easings: Record<'out' | 'inOut', string>
  /** Delay between items in a staggered reveal, in ms. */
  stagger: number
  carouselInterval: number
  /**
   * The splash handing over to the app (SplashHandoff): it waits for the app to load (`settleFrames` quiet
   * frames in a row) and for its theme to stop changing (`themeSettleFrames` frames; each wait at most `maxWaitMs`),
   * shifts its colours to the app's over `colourMs`, and once that has finished holds `holdMs` in them with the
   * logo's arches bobbing and the loading bar full, then fades over `fadeMs`.
   */
  handoff: { maxWaitMs: number; settleFrames: number; themeSettleFrames: number; colourMs: number; holdMs: number; fadeMs: number }
}
