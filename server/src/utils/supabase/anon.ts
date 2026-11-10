import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import type { Database } from '@/types/database'
import type { Db } from '@/utils/supabase/client'

let client: Db | undefined

/** A client with no user session, for public reads. It can only call functions granted to `anon`. */
export function anonSupabase(): Db {
  client ??= createClient<Database>(env().SUPABASE_URL, env().SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
