import type { ClubBadgeMetric, ClubBadgeScope } from '../types/club.ts'

/** Limits the club forms show and the API enforces. */
export const clubLimits = {
  nameMaxLength: 60,
  descriptionMaxLength: 1000,
  contactMaxLength: 120,
  titleMaxLength: 80,
  maxClubs: 20,
  maxMembers: 500,
  maxPlannedSessions: 50,
  /** Club past sessions listed on the club page, newest first. */
  recentSessions: 24,
}

/** Club and session photos: accepted formats and the largest upload. */
export const clubImages = {
  maxBytes: 5 * 1024 * 1024,
  types: ['image/jpeg', 'image/png', 'image/webp'] as const,
}

/** Club badges: limits the badge form shows and the API enforces. */
export const clubBadgeLimits = {
  nameMaxLength: 30,
  descriptionMaxLength: 160,
  maxBadges: 20,
  maxConditions: 3,
  /** The largest number a condition can ask for. */
  maxThreshold: 100_000,
}

/**
 * What a club badge's conditions can check, and in which scope. Every
 * condition is "at least <min>"; a badge needs all of its conditions.
 * `winRate` is a percentage of matches with a result.
 */
export const clubBadgeMetrics: Record<ClubBadgeMetric, { label: string; scopes: readonly ClubBadgeScope[]; percent?: true }> = {
  wins: { label: 'Wins', scopes: ['session', 'career'] },
  played: { label: 'Matches played', scopes: ['session', 'career'] },
  streak: { label: 'Wins in a row', scopes: ['session'] },
  pointsFor: { label: 'Points scored', scopes: ['session', 'career'] },
  pointDiff: { label: 'Point difference', scopes: ['session', 'career'] },
  winRate: { label: 'Win rate (%)', scopes: ['session', 'career'], percent: true },
  sessions: { label: 'Sessions attended', scopes: ['career'] },
}

export const clubBadgeScopes: Record<ClubBadgeScope, { label: string; description: string }> = {
  session: { label: 'In one session', description: "Earned on a session's leaderboard from that session's results." },
  career: { label: 'Across all club sessions', description: 'Earned from totals over every session the club has run, matched by player name.' },
}

/** Badge icons: GIFs stay animated; other images become WebP. */
export const clubBadgeIcons = {
  maxBytes: 5 * 1024 * 1024,
  types: ['image/gif', 'image/jpeg', 'image/png', 'image/webp'] as const,
}

/** GIF search (GIPHY, through the API). */
export const gifSearch = {
  pageSize: 24,
  maxQueryLength: 50,
  /** Shown with search results, as GIPHY's terms ask. */
  attribution: 'Powered by GIPHY',
}

/** Photo alignment: where a photo starts, and how far it can be zoomed in. */
export const photoPositions = {
  default: { x: 50, y: 50, zoom: 1 },
  zoomMin: 1,
  zoomMax: 3,
}

/** Ready-made club colour pairs (accent, sidebar) for the Appearance card. Clubs can also pick their own. */
export const clubThemePresets = [
  { name: 'Matchpoynt', accent: null, sidebar: null },
  { name: 'Ocean', accent: '#2563eb', sidebar: '#0f172a' },
  { name: 'Court green', accent: '#16a34a', sidebar: '#052e16' },
  { name: 'Royal', accent: '#7c3aed', sidebar: '#1e1b4b' },
  { name: 'Crimson', accent: '#dc2626', sidebar: '#1c1917' },
  { name: 'Teal', accent: '#0d9488', sidebar: '#042f2e' },
  { name: 'Sunrise', accent: '#f59e0b', sidebar: '#27272a' },
] as const
