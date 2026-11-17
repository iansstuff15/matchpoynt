import type { Motion } from '@/interfaces/Theme'

export const motion: Motion = {
  // GSAP (animations/*.ts). Values follow the by-ian reference.
  gsap: {
    reveal: { duration: 0.9, ease: 'expo.out', distance: 24, stagger: 0.06, start: 'top 85%' },
    wave: { duration: 0.9, ease: 'back.out(1.7)', stagger: 0.022, lift: 70, tilt: 14, frequency: 0.55, start: 'top 85%' },
    splash: {
      approach: 0.85,
      distance: 520,
      impact: 0.5,
      squash: 0.12,
      shake: 10,
      hold: 0.7,
      wipe: 1.1,
      waveAmplitude: 90,
      // The impact's circles: the ring bursts to `scale`× its size from `thickness` px thick, the echo follows `echoDelay` s later.
      ring: { scale: 6.5, echoScale: 4.5, echoDelay: 0.12, thickness: 14, duration: 1.1, flashScale: 2.6, flashOpacity: 0.55 },
    },
    marquee: { duration: 32 },
    leaderboard: { flip: 0.9, flipEase: 'power3.inOut', bars: 1.1, barsEase: 'expo.out', count: 1.2, stagger: 0.06, start: 'top 80%' },
    play: { stagger: 0.07, count: 1, flip: 0.7, flipEase: 'power3.inOut', sideDistance: 90, meet: 0.7 },
    // The club picker and start page: each piece fades in rising `rise` px into place, `stagger` apart; picking fades it all out over `pick`.
    picker: { duration: 0.6, stagger: 0.08, rise: 24, tileScale: 0.85, ease: 'power2.out', pick: 0.3 },
  },
  durations: { fast: '150ms', base: '300ms', slow: '600ms' },
  // Hot streak tag: the flame dances, embers rise from it.
  // Club loading screen: the logo's arches bob in turn.
  // Splash loading bar: one sweep of its stripe.
  loops: { flicker: '1.6s', ember: '1.8s', archBob: '0.9s', ctaPulse: '1.8s', loadingBar: '1.3s' },
  easings: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
  stagger: 80,
  carouselInterval: 5000,
  handoff: { maxWaitMs: 6000, settleFrames: 6, themeSettleFrames: 12, colourMs: 700, holdMs: 800, fadeMs: 450 },
}
