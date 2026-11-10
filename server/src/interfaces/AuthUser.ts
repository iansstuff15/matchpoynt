/** The caller, read from a verified Firebase ID token. */
export interface AuthUser {
  /** Firebase UID. Owner columns and RLS use it (the token's `sub`). */
  id: string
  email: string | null
  emailVerified: boolean
  /** A guest made while sign-in is off. Guests have no profile. */
  isAnonymous: boolean
  /** The name the provider gave (Google), used to prefill the profile form. */
  name: string | null
  /** Whether the token carries `role: authenticated`, without which Supabase treats it as anon. */
  hasRole: boolean
}

/** A Firebase sign-in: a short-lived ID token and the refresh token that renews it. */
export interface AuthTokens {
  idToken: string
  refreshToken: string
}
