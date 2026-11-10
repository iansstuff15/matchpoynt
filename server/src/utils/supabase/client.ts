import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import type { Database } from '@/types/database'

export type Db = SupabaseClient<Database>

/**
 * A Supabase client that runs every query as one Firebase account: its ID token
 * is sent as the access token (Supabase third-party auth), so RLS applies.
 * With no token it runs as `anon`. There is no service-role key anywhere in the app.
 */
export function supabaseAs(idToken: string | null): Db {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env()
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { accessToken: async () => idToken })
}
