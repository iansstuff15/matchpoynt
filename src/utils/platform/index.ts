import { isTauri } from '@tauri-apps/api/core'
import type { Platform } from '@/types/platform'

/** True when running inside the Tauri desktop app. */
export function isDesktop(): boolean {
  return isTauri()
}

export function getPlatform(): Platform {
  return isDesktop() ? 'desktop' : 'web'
}
