import type { ClubDirectoryResponse, ClubSummary, PlayerClubPageView } from '@matchpoynt/shared'
import type { InfiniteData } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import type { ClubPreview } from '@/components/club/ClubLoadingScreen'
import { queryKeys } from '@/utils/api/queryClient'

/**
 * What lists loaded earlier already say about a club (your clubs, the
 * directory, its page for players), by id or handle, so its loading screen
 * can show its photo, name and colours at once. Never fetches.
 */
export function useClubPreview({ id, handle }: { id?: string; handle?: string }): ClubPreview | null {
  const client = useQueryClient()
  const mine = client.getQueryData<ClubSummary[]>(queryKeys.clubs)?.find((c) => c.id === id || (handle && c.handle === handle))
  if (mine) return { name: mine.name, handle: mine.handle, avatarUrl: mine.avatarUrl, avatarPosition: mine.avatarPosition, theme: mine.theme }
  const page = handle ? client.getQueryData<PlayerClubPageView>(queryKeys.playerClub(handle))?.club : undefined
  const listed = client
    .getQueriesData<InfiniteData<ClubDirectoryResponse>>({ queryKey: ['directory', 'list'] })
    .flatMap(([, data]) => data?.pages.flatMap((p) => p.clubs) ?? [])
    .find((c) => c.id === id || (handle && c.handle === handle))
  const card = page ?? listed
  return card ? { name: card.name, handle: card.handle, avatarUrl: card.avatarUrl, avatarPosition: card.avatarPosition, theme: card.theme } : null
}
