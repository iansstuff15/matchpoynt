import { useEffect, useState } from 'react'
import type { AppInfo } from '@/interfaces/AppInfo'
import { getAppInfo } from '@/utils/desktop/app'

/** Desktop build identity; `null` on the web or while loading. */
export function useAppInfo(): { info: AppInfo | null; isLoading: boolean } {
  const [state, setState] = useState<{ info: AppInfo | null; isLoading: boolean }>({ info: null, isLoading: true })

  useEffect(() => {
    let active = true
    getAppInfo()
      .then((info) => active && setState({ info, isLoading: false }))
      // Errors stay silent on purpose: the shell falls back to config/site.ts.
      .catch(() => active && setState({ info: null, isLoading: false }))
    return () => {
      active = false
    }
  }, [])

  return state
}
