import { expect, type Page } from '@playwright/test'
import { gotoReady } from './pageReady'

/** The app sidebar on a desktop screen (shadcn `Sidebar`, `data-state` expanded or collapsed). */
export const sidebar = (page: Page) => page.locator('[data-slot="sidebar"][data-state]')

/** The sidebar's page links. */
export const appNav = (page: Page) => page.getByRole('navigation', { name: 'App' })

/** Opens a page in the app shell (not bare /app, whose setup dialog hides the shell) and waits until it has loaded and the sidebar is there. */
export async function openApp(page: Page, path: string) {
  await gotoReady(page, path)
  await expect(appNav(page).or(page.getByRole('button', { name: 'Open navigation' }))).toBeVisible()
}

/** /app with no session opens setup on its own; close it to reach the shell behind. */
export async function closeSetup(page: Page) {
  const setup = page.getByRole('dialog', { name: 'Set up your session' })
  await expect(setup).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(setup).toBeHidden()
}
