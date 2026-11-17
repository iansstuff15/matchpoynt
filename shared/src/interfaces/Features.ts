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
    /** Joining fees (session setup and clubs), invoices when a session ends, and the Invoices page. */
    fees: boolean
    /** Club billers, expenses (club-wide and per session) and the accounting dashboard (needs clubs). */
    accounting: boolean
    /** The club directory, join requests and join pages, club QR codes, in-app invites and session requests (needs clubs and sign-in). */
    clubDirectory: boolean
    /** Players' own live view of a running club session they're in: their wait, who's on court, up next and the queue (needs clubs, sign-in and the directory). */
    playerView: boolean
    /** Clubs' post-session feedback form: owners build it, members answer it after each session (needs clubs; answering needs sign-in and the directory). */
    clubFeedback: boolean
    /** Club announcements: owners post them, members read them on the club's page (needs clubs; reading needs sign-in and the directory). */
    clubAnnouncements: boolean
    /** Friends: people adding each other, requests and the Friends page (needs sign-in). */
    friends: boolean
  }
  desktop: {
    offlineMode: boolean
    autoUpdate: boolean
  }
}

export interface AppConfigResponse {
  features: Features
}
