import { defineConfig, devices } from '@playwright/test'

// UI tests: the real web app (Vite dev server) against a mocked API (e2e/support/mockApi.ts).
// Settings come from the environment so scripts/test-all.mjs can pass its arguments through.
const port = Number(process.env.UI_PORT ?? 1420)
// localhost, not 127.0.0.1: Vite may listen on IPv6 only ([::1]).
const baseURL = process.env.UI_BASE_URL ?? `http://localhost:${port}`
const headless = Boolean(process.env.CI) || process.env.UI_HEADLESS === '1'
// A pause before every browser action, so each step can be followed in the window; none when headless.
const slowMo = Number(process.env.UI_SLOW_MO ?? (headless ? 0 : 1000))

// Each run of scripts/test-all.mjs passes its own folder, so runs going at the same time never clear each other's results.
const output = process.env.UI_OUTPUT_DIR ?? '.output/ui'

export default defineConfig({
  testDir: 'e2e',
  outputDir: `${output}/results`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: Number(process.env.UI_RETRIES ?? (process.env.CI ? 2 : 0)),
  workers: process.env.UI_WORKERS ? Number(process.env.UI_WORKERS) : undefined,
  // First loads compile the app on demand in Vite, and the slowed-down steps of a headed run add up.
  timeout: slowMo > 0 ? 240_000 : 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: `${output}/report`, open: 'never' }]],
  use: {
    baseURL,
    // The browser window always shows, except in CI (no screen) or when asked for headless (--headless in scripts/test-all.mjs).
    headless,
    launchOptions: { slowMo },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Skips the splash and GSAP motion, as the app does for anyone who asks for less motion.
    reducedMotion: 'reduce',
  },
  projects: [
    // `*.mobile.spec.ts` runs at phone width (390px, as CLAUDE.md asks pages to be checked); everything else on a desktop screen.
    { name: 'desktop', testIgnore: '**/*.mobile.spec.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', testMatch: '**/*.mobile.spec.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: process.env.UI_BASE_URL
    ? undefined
    : {
        command: 'pnpm --dir .. dev:web',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
