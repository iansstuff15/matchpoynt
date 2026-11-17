import type { Features } from '../interfaces/Features.ts'

/**
 * Values the API uses when a FEATURE_* variable is unset.
 */
export const defaultFeatures: Features = {
  web: {
    rankings: true,
    signIn: true,
    signInGoogle: true,
    // Needs the Apple provider set up in Firebase (Authentication > Sign-in method).
    signInApple: false,
    signInEmail: true,
    signUp: true,
    passwordReset: true,
    // Needs signed builds published from CI.
    desktopDownload: false,
    splash: true,
    publishSessions: true,
    clubs: true,
    tournaments: true,
    publishTournaments: true,
    clubBadges: true,
    // Needs a GIPHY API key (GIPHY_API_KEY) on the API.
    gifSearch: false,
    fees: true,
    accounting: true,
    clubDirectory: true,
    playerView: true,
    clubFeedback: true,
    clubAnnouncements: true,
    friends: true,
  },
  desktop: {
    // Needs the Rust offline engine.
    offlineMode: false,
    // Needs the signed updater pipeline in CI.
    autoUpdate: false,
  },
}

/**
 * What clients assume when the API can't be reached: everything off. Toggles
 * fail closed, so an outage never turns a switched-off feature back on.
 */
export const featuresOff: Features = {
  web: {
    rankings: false,
    signIn: false,
    signInGoogle: false,
    signInApple: false,
    signInEmail: false,
    signUp: false,
    passwordReset: false,
    desktopDownload: false,
    splash: false,
    publishSessions: false,
    clubs: false,
    tournaments: false,
    publishTournaments: false,
    clubBadges: false,
    gifSearch: false,
    fees: false,
    accounting: false,
    clubDirectory: false,
    playerView: false,
    clubFeedback: false,
    clubAnnouncements: false,
    friends: false,
  },
  desktop: { offlineMode: false, autoUpdate: false },
}

/** Environment variable for each toggle, e.g. FEATURE_WEB_SIGN_IN. */
export const featureEnvNames = {
  web: {
    rankings: 'FEATURE_WEB_RANKINGS',
    signIn: 'FEATURE_WEB_SIGN_IN',
    signInGoogle: 'FEATURE_WEB_SIGN_IN_GOOGLE',
    signInApple: 'FEATURE_WEB_SIGN_IN_APPLE',
    signInEmail: 'FEATURE_WEB_SIGN_IN_EMAIL',
    signUp: 'FEATURE_WEB_SIGN_UP',
    passwordReset: 'FEATURE_WEB_PASSWORD_RESET',
    desktopDownload: 'FEATURE_WEB_DESKTOP_DOWNLOAD',
    splash: 'FEATURE_WEB_SPLASH',
    publishSessions: 'FEATURE_WEB_PUBLISH_SESSIONS',
    clubs: 'FEATURE_WEB_CLUBS',
    tournaments: 'FEATURE_WEB_TOURNAMENTS',
    publishTournaments: 'FEATURE_WEB_PUBLISH_TOURNAMENTS',
    clubBadges: 'FEATURE_WEB_CLUB_BADGES',
    gifSearch: 'FEATURE_WEB_GIF_SEARCH',
    fees: 'FEATURE_WEB_FEES',
    accounting: 'FEATURE_WEB_ACCOUNTING',
    clubDirectory: 'FEATURE_WEB_CLUB_DIRECTORY',
    playerView: 'FEATURE_WEB_PLAYER_VIEW',
    clubFeedback: 'FEATURE_WEB_CLUB_FEEDBACK',
    clubAnnouncements: 'FEATURE_WEB_CLUB_ANNOUNCEMENTS',
    friends: 'FEATURE_WEB_FRIENDS',
  },
  desktop: {
    offlineMode: 'FEATURE_DESKTOP_OFFLINE_MODE',
    autoUpdate: 'FEATURE_DESKTOP_AUTO_UPDATE',
  },
} as const satisfies { [G in keyof Features]: { [K in keyof Features[G]]: string } }
