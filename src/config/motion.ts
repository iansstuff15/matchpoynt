import type { Motion } from '@/interfaces/Theme'

export const motion: Motion = {
  // GSAP (animations/*.ts). Values follow the by-ian reference.
  gsap: {
    reveal: { duration: 0.9, ease: 'expo.out', distance: 24, stagger: 0.06, start: 'top 85%' },
    wave: { duration: 0.9, ease: 'back.out(1.7)', stagger: 0.022, lift: 70, tilt: 14, frequency: 0.55, start: 'top 85%' },
    splash: { reveal: 1.3, hold: 0.6, wipe: 1.1, waveAmplitude: 90 },
    marquee: { duration: 32 },
    leaderboard: { flip: 0.9, flipEase: 'power3.inOut', bars: 1.1, barsEase: 'expo.out', count: 1.2, stagger: 0.06, start: 'top 80%' },
  },
  durations: { fast: '150ms', base: '300ms', slow: '600ms' },
  // Hot streak tag: the flame dances, embers rise from it.
  loops: { flicker: '1.6s', ember: '1.8s' },
  easings: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
  stagger: 80,
  carouselInterval: 5000,
}
