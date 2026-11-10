import { featuresOff, type AppConfigResponse, type Features } from '@matchpoynt/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'

/** The /api/config query. `App` waits for it before rendering any routes. */
export function useAppConfig() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: ({ signal }) => api<AppConfigResponse>('GET', '/config', { signal }),
    staleTime: 5 * 60_000,
    // Components mounting after a failure must not each refetch; focus and reconnect still retry.
    retryOnMount: false,
  })
}

/**
 * Feature toggles from the API (FEATURE_* variables on the server). If the
 * API can't be reached every feature is off: toggles fail closed.
 */
export function useFeatures(): Features {
  return useAppConfig().data?.features ?? featuresOff
}
