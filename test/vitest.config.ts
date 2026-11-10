import path from 'node:path'
import { defineConfig } from 'vitest/config'

// API unit tests. `@/` is the API's source, as inside server/; `@test/` holds shared test helpers.
export default defineConfig({
  resolve: {
    alias: {
      '@/': `${path.resolve(import.meta.dirname, '../server/src')}/`,
      '@test/': `${path.resolve(import.meta.dirname, 'unit/support')}/`,
    },
  },
  test: {
    include: ['unit/**/*.test.ts'],
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: '.output/unit/junit.xml' },
  },
})
