import { isTauri } from '@tauri-apps/api/core'
import type { Platform } from '@/types/platform'

/** True when running inside the Tauri desktop app. */
export function isDesktop(): boolean {
  return isTauri()
}

export function getPlatform(): Platform {
  return isDesktop() ? 'desktop' : 'web'
}

/** Where "home" links go: the landing page on the website, the board on desktop (which has no landing page). */
export function homePath(): string {
  return isDesktop() ? '/app' : '/'
}
