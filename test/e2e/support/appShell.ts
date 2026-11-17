import { expect, type Page } from '@playwright/test'
import { gotoReady } from './pageReady'

/** The app sidebar on a desktop screen (shadcn `Sidebar`, `data-state` expanded or collapsed). */
export const sidebar = (page: Page) => page.locator('[data-slot="sidebar"][data-state]')

/** The sidebar's page links. */
export const appNav = (page: Page) => page.getByRole('navigation', { name: 'App' })

/** The bottom tab bar on phones (website and app shell). */
export const tabBar = (page: Page) => page.getByRole('navigation', { name: 'Tabs' })

/** Opens a page in the app shell (not bare /app, whose setup dialog hides the shell) and waits until it has loaded and the sidebar (or, on a phone, the tab bar) is there. */
export async function openApp(page: Page, path: string) {
  await gotoReady(page, path)
  await expect(appNav(page).or(tabBar(page))).toBeVisible()
}

/** /app with no session shows the empty board (setup never opens by itself). */
export async function expectEmptyBoard(page: Page) {
  await expect(page.getByRole('button', { name: /Set up (a )?session|New session/ }).first()).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Set up your session' })).toHaveCount(0)
}
