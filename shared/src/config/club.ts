import type { ClubBadgeMetric, ClubBadgeScope, ClubMemberRole } from '../types/club.ts'

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

/**
 * The roles an owner can give members, in the order they're offered. Every
 * member starts as a `member`; the club's page for players lists everyone
 * else as the club's team.
 */
export const clubMemberRoles: Record<ClubMemberRole, { label: string; description: string }> = {
  member: { label: 'Member', description: 'Plays in the club\'s sessions.' },
  captain: { label: 'Captain', description: 'Leads a group or team of the club\'s players.' },
  coach: { label: 'Coach', description: 'Coaches the club\'s players.' },
  queue_master: { label: 'Queue Master', description: 'Runs the club\'s sessions at the venue: check-in, queue and courts.' },
  manager: { label: 'Manager', description: 'Helps run the club: members, sessions and money.' },
}

/** The club directory, joining and the player club page. */
export const directoryLimits = {
  pageSize: 12,
  welcomeMaxLength: 1000,
  welcomeLinks: 5,
  linkLabelMaxLength: 40,
  /** Players on a club page's leaderboard. */
  leaderboard: 20,
  /** People the member search shows. */
  searchResults: 5,
  /** Characters typed before people are searched. */
  searchMinLength: 2,
}

/** Pages of lists that load a page at a time. */
export const pageSizes = {
  clubs: 12,
  clubSessions: 12,
  clubInvoices: 10,
  expenses: 25,
}

/** Club and session photos: accepted formats and the largest upload (under Vercel's 4.5 MB request limit, with room for the form). */
export const clubImages = {
  maxBytes: 4 * 1024 * 1024,
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
  maxBytes: 4 * 1024 * 1024,
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

/** Saved club themes: limits the Appearance card shows and the API enforces. */
/** The club's payment QR codes. */
export const paymentQrLimits = {
  maxQrs: 4,
  labelMaxLength: 30,
}

export const clubThemeLimits = {
  nameMaxLength: 30,
  maxSaved: 12,
}

/** Ready-made club colours (accent, sidebar and page background) for the Appearance card. Clubs can also pick and save their own. */
export const clubThemePresets = [
  { name: 'Matchpoynt', accent: null, sidebar: null, page: null },
  { name: 'Ocean', accent: '#2563eb', sidebar: '#0f172a', page: null },
  { name: 'Court green', accent: '#16a34a', sidebar: '#052e16', page: '#eef5ef' },
  { name: 'Royal', accent: '#7c3aed', sidebar: '#1e1b4b', page: null },
  { name: 'Crimson', accent: '#dc2626', sidebar: '#1c1917', page: null },
  { name: 'Teal', accent: '#0d9488', sidebar: '#042f2e', page: null },
  { name: 'Sunrise', accent: '#f59e0b', sidebar: '#27272a', page: '#faf5eb' },
  { name: 'Midnight', accent: '#38bdf8', sidebar: '#020617', page: '#0f172a' },
] as const

/** Club announcements: posted by the owner, read by members on the club's page. */
export const announcementLimits = {
  titleMaxLength: 80,
  bodyMaxLength: 2000,
  /** Announcements a club keeps; delete old ones to post more. */
  maxPerClub: 50,
  /** Pinned at once. */
  maxPinned: 3,
  /** Newest announcements members see. */
  shownToMembers: 10,
  /** Days an announcement is marked new for members. */
  newForDays: 7,
}

/** How members get onto a planned session: the owner approves each request, or members sign themselves up. */
export const planSignUpModes = {
  approval: { label: 'Owner approves', description: 'Members ask to join; you approve each one.' },
  open: { label: 'Open sign-up', description: 'Members sign themselves up until it is full.' },
} as const

export const signUpLimits = {
  /** Smallest and largest player cap a plan can set. */
  minPlayers: 2,
  maxPlayers: 200,
  /** Planned sessions starting within this many hours show in "Coming up" for those signed up. */
  reminderWindowHours: 24,
}
