/** Feature toggles. Set by FEATURE_* environment variables on the API and served at /api/config. */
export interface Features {
  web: {
    rankings: boolean
    /** Master switch for sign-in. Each method below also needs its own switch on. */
    signIn: boolean
    signInGoogle: boolean
    signInApple: boolean
    signInEmail: boolean
    /** Creating an account with email and password. */
    signUp: boolean
    /** Forgot / reset password by email. */
    passwordReset: boolean
    desktopDownload: boolean
    /** The intro splash on the landing page (once per browser session). */
    splash: boolean
    publishSessions: boolean
    /** Club manager: clubs, member rosters, planned sessions and club/session photos. */
    clubs: boolean
    /** Tournament play on courts: the court switch, the Tournament tab and its API. */
    tournaments: boolean
    /** Public tournament pages (/t/<slug>) and the publish button. */
    publishTournaments: boolean
    /** Clubs' own badges with conditions and GIF or image icons (needs clubs). */
    clubBadges: boolean
    /** Searching GIPHY for badge icons (needs club badges and GIPHY_API_KEY on the API). */
    gifSearch: boolean
  }
  desktop: {
    offlineMode: boolean
    autoUpdate: boolean
  }
}

export interface AppConfigResponse {
  features: Features
}
