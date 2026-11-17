import { z } from 'zod'

const schema = z.object({
  SUPABASE_URL: z.url(),
  /** Publishable (anon) key. Requests run as the signed-in user, so RLS applies. */
  SUPABASE_ANON_KEY: z.string().min(1),
  /** Public origin of the website, e.g. https://matchpoynt.com. Used for redirects and origin checks. */
  APP_URL: z.url(),
  API_PORT: z.coerce.number().int().positive().default(8787),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** GIPHY API key for badge icon search. Needed only while FEATURE_WEB_GIF_SEARCH is on. */
  GIPHY_API_KEY: z.string().min(1).optional(),
  /** Firebase web API key: the API calls Firebase Auth's REST endpoints with it. */
  FIREBASE_API_KEY: z.string().min(1),
  /** Firebase project id: the issuer and audience of every sign-in token. */
  FIREBASE_PROJECT_ID: z.string().min(1),
  /**
   * Firebase service account. Used only to give accounts the `role: authenticated`
   * claim Supabase needs.
   */
  FIREBASE_CLIENT_EMAIL: z.email(),
  /** The service account's private key. `\n` escapes (as in the downloaded JSON) are turned into newlines. */
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1)
    .transform((key) => key.replace(/\\n/g, '\n')),
  /**
   * Resend API key (resend.com > API Keys). The API sends password resets,
   * email confirmations, email changes and club invites through Resend with it.
   * Optional to start, but needed before any of those emails can go out.
   */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Who the emails are from: an address on a domain verified in Resend. Resend's test sender works until then (it only delivers to your own Resend account's email). */
  EMAIL_FROM: z.string().min(3).default('Matchpoynt <onboarding@resend.dev>'),
  /** Where replies go, if not to EMAIL_FROM. */
  EMAIL_REPLY_TO: z.string().min(3).optional(),
  // The rest of the Firebase web config. Kept with the others; the API doesn't need them.
  FIREBASE_AUTH_DOMAIN: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  FIREBASE_APP_ID: z.string().optional(),
  FIREBASE_MEASUREMENT_ID: z.string().optional(),
})

export type Env = z.infer<typeof schema>

let cached: Env | undefined

/** Reads and validates the environment once. Throws with every missing value listed. */
export function env(): Env {
  if (cached) return cached
  // An empty `KEY=` in the env file counts as unset, so optional values can wait to be filled in.
  const parsed = schema.safeParse(Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== '')))
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Invalid API environment: ${missing}. See .env.example.`)
  }
  cached = parsed.data
  return cached
}
