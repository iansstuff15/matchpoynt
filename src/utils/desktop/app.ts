import { invoke } from '@tauri-apps/api/core'
import type { AppInfo } from '@/interfaces/AppInfo'
import { isDesktop } from '@/utils/platform'

/** Typed wrapper for the `app_info` command in `src-tauri/src/commands/app.rs`. */
export async function getAppInfo(): Promise<AppInfo | null> {
  if (!isDesktop()) return null
  return invoke<AppInfo>('app_info')
}
