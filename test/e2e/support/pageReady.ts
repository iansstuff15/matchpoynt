import { expect, type Page } from '@playwright/test'

/**
 * Waits until the page has finished loading before a test's next step: the
 * document and its scripts have loaded, no requests (API data, lazy modules)
 * are still in flight, and every skeleton or busy region has been replaced
 * by real content.
 */
export async function pageReady(page: Page) {
  // Generous limits: on a busy machine (a full parallel run) loads take longer, and that isn't a failure.
  const timeout = 30_000
  await page.waitForLoadState('load', { timeout })
  await page.waitForLoadState('networkidle', { timeout })
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout })
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout })
}

/** Opens `path` and waits for it to finish loading. */
export async function gotoReady(page: Page, path: string) {
  await page.goto(path)
  await pageReady(page)
}

/** Reloads and waits for the page to finish loading again. */
export async function reloadReady(page: Page) {
  await page.reload()
  await pageReady(page)
}
