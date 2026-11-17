import type { Theme } from '@/interfaces/Theme'

/** Source of truth for shadcn's semantic tokens. `utils/theme` turns this into CSS. */
export const theme: Theme = {
  // One light palette (no dark mode): white surfaces, charcoal ink and frames, an orange accent.
  colors: {
    // A light grey page, so the white cards on it stand out.
    background: 'oklch(0.96 0 0)',
    foreground: 'oklch(0.21 0 0)',
    card: 'oklch(1 0 0)',
    'card-foreground': 'oklch(0.21 0 0)',
    popover: 'oklch(1 0 0)',
    'popover-foreground': 'oklch(0.21 0 0)',
    // The brand orange: calls to action and the selected sidebar item's tint.
    primary: 'oklch(0.646 0.205 41)',
    'primary-foreground': 'oklch(0.99 0 0)',
    secondary: 'oklch(0.94 0 0)',
    'secondary-foreground': 'oklch(0.21 0 0)',
    muted: 'oklch(0.94 0 0)',
    'muted-foreground': 'oklch(0.52 0 0)',
    accent: 'oklch(0.935 0 0)',
    'accent-foreground': 'oklch(0.21 0 0)',
    destructive: 'oklch(0.58 0.22 27)',
    border: 'oklch(0.9 0 0)',
    input: 'oklch(0.88 0 0)',
    ring: 'oklch(0.69 0.19 42)',
    // The brand's bright tone: live markers and highlights.
    highlight: 'oklch(0.69 0.19 42)',
    'highlight-foreground': 'oklch(0.99 0 0)',
    court: 'oklch(0.27 0 0)',
    'court-foreground': 'oklch(0.97 0 0)',
    success: 'oklch(0.56 0.13 155)',
    'success-foreground': 'oklch(0.34 0.08 155)',
    warning: 'oklch(0.75 0.15 75)',
    'warning-foreground': 'oklch(0.38 0.09 60)',
    info: 'oklch(0.6 0.13 240)',
    'info-foreground': 'oklch(0.35 0.09 245)',
    // Accounting chart series (validated as a pair: colour-blind safe and 3:1 on the card surface).
    'chart-collected': '#2a78d6',
    'chart-spent': '#eb6834',
    // Landing page: charcoal sections after the hero (by-ian layout, Matchpoynt palette).
    deep: 'oklch(0.205 0 0)',
    'deep-strong': 'oklch(0.16 0 0)',
    'deep-foreground': 'oklch(0.98 0 0)',
    'deep-muted': 'oklch(0.76 0 0)',
    // Hero mesh: soft greys lit by the orange accent.
    'mesh-1': 'oklch(0.36 0 0)',
    'mesh-2': 'oklch(0.72 0.18 45)',
    'mesh-3': 'oklch(0.3 0 0)',
    'mesh-4': 'oklch(0.62 0.16 38)',
    glass: 'oklch(1 0 0 / 10%)',
    'glass-border': 'oklch(1 0 0 / 22%)',
    // Podium medals (leaderboard crowns and place badges).
    gold: 'oklch(0.8 0.15 85)',
    silver: 'oklch(0.78 0.015 250)',
    bronze: 'oklch(0.66 0.12 55)',
    'medal-foreground': 'oklch(0.25 0.03 70)',
    // Hot streak glow and embers on the leaderboard.
    fire: 'oklch(0.7 0.19 45)',
    ember: 'oklch(0.82 0.16 75)',
    // Shade over photos (club and session covers) so text on them stays readable.
    scrim: 'oklch(0.14 0 0 / 72%)',
    'scrim-foreground': 'oklch(0.99 0 0)',
    // App shell, two-tone: a charcoal sidebar frame around the white page.
    sidebar: 'oklch(0.205 0 0)',
    'sidebar-foreground': 'oklch(0.74 0 0)',
    // The selected sidebar item's tint: the same orange as the calls to action.
    'sidebar-primary': 'oklch(0.646 0.205 41)',
    'sidebar-primary-foreground': 'oklch(0.99 0 0)',
    'sidebar-accent': 'oklch(0.29 0 0)',
    'sidebar-accent-foreground': 'oklch(0.98 0 0)',
    'sidebar-border': 'oklch(1 0 0 / 16%)',
    'sidebar-ring': 'oklch(0.69 0.19 42)',
    // The logo's two arches (components/brand/LogoMark): navy ink and coral. A club's accent replaces the coral
    // (useClubTheme); the ink arch follows the text colour it sits on, so it reads on the sidebar too.
    'logo-ink': '#101A33',
    'logo-accent': '#FF5A4E',
  },
  radius: '0.75rem',
  fonts: {
    sans: { stack: "'Inter Variable', ui-sans-serif, system-ui, sans-serif" },
    display: { stack: "'Space Grotesk Variable', 'Inter Variable', ui-sans-serif, sans-serif" },
  },
  fontWeights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  fontSizes: {
    // Landing headlines: very large, heavy and tightly tracked.
    'display-xl': ['clamp(3rem, 7vw + 1rem, 6.5rem)', '0.95'],
    hero: ['clamp(2.5rem, 6vw, 4.5rem)', '1.05'],
    display: ['clamp(1.875rem, 4vw, 2.75rem)', '1.15'],
  },
}
