import { defineConfig } from 'drizzle-kit'

// DATABASE_URL is the Supabase Postgres connection string. Only migrations
// use it (locally or in CI); the running API never connects directly.
try {
  process.loadEnvFile('../.env')
} catch {
  // No .env: rely on the environment (CI).
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  schemaFilter: ['public'],
  // Supabase owns its roles (anon, authenticated, ...); don't try to create them.
  entities: { roles: { provider: 'supabase' } },
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
})
