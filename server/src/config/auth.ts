/** Sign-in cookies (all httpOnly, SameSite=Lax) and how long they last. */
export const authCookies = {
  /** Firebase ID token: about an hour, then renewed from the refresh token. */
  id: 'mp_id',
  refresh: 'mp_refresh',
  /** Google/Apple sign-in in progress: Firebase's session id and the page to return to. */
  oauth: 'mp_oauth',
  /** A password reset link that was opened: its one-time code, until the new password is chosen. */
  reset: 'mp_reset',
}

export const authLifetimes = {
  /** How long a browser stays signed in without visiting. */
  sessionSeconds: 60 * 60 * 24 * 30,
  /** A Google/Apple round trip or a reset form left open. */
  handshakeSeconds: 60 * 10,
}

/** Firebase Auth's REST endpoints. */
export const firebaseEndpoints = {
  identity: 'https://identitytoolkit.googleapis.com/v1',
  token: 'https://securetoken.googleapis.com/v1/token',
  keys: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  issuer: 'https://securetoken.google.com/',
  oauthToken: 'https://oauth2.googleapis.com/token',
  adminScope: 'https://www.googleapis.com/auth/identitytoolkit',
}

/** Sign-in providers the app offers, mapped to Firebase's ids and the toggle for each. */
export const oauthProviders = {
  google: { firebaseId: 'google.com', feature: 'signInGoogle', scope: 'openid email profile' },
  apple: { firebaseId: 'apple.com', feature: 'signInApple', scope: 'email name' },
} as const
