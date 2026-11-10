import type { AuthTokens, AuthUser } from '@/interfaces/AuthUser'
import type { Db } from '@/utils/supabase/client'

/** Values middleware puts on the request context. */
export interface AppEnv {
  Variables: {
    db: Db
    /** `null` when nobody is signed in and no guest was needed. */
    user: AuthUser | null
    /** The caller's Firebase tokens, for calls made as them (e.g. setting a password). */
    tokens: AuthTokens | null
  }
}
