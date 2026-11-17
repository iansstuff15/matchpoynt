import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { dehydrate, type Query, type QueryClient } from '@tanstack/react-query'
import type { PersistedClient, PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client'
import type { MeResponse } from '@matchpoynt/shared'
import { localCache } from '@/config/cache'

// The local cache: which query results are kept on this device (localStorage,
// through TanStack Query's persister) so club and profile details show at
// once instead of being fetched every time.
//
// Kept: who's signed in (`me`, without the email), your clubs list (club
// summaries: names, handles, photos, colours, fee scheme), clubs' pages for
// players and join cards. Never kept: config and feature toggles (they must
// fail closed), sessions and boards, members and their contacts, invoices,
// money, profile details beyond the name and photo, and anything else.
// Signing out clears the cache (`useSignOut` clears the query client, and the
// persister writes the empty cache), and a new app version starts afresh.

/** Whether a query's result is safe to keep on this device (see above). */
const keptQuery = (query: Query) => {
  const [root, second] = query.queryKey as unknown[]
  if (query.state.status !== 'success') return false
  if (root === 'me') return true
  // ['clubs'] exactly is your first page of clubs; ['clubs', id] (the owner's full club view, with members) is not kept.
  if (root === 'clubs') return query.queryKey.length === 1
  // A club's page for players (['directory', 'club', handle]) and its join card (['public', 'club', handle]).
  return (root === 'directory' || root === 'public') && second === 'club'
}

/** `me` without the email: the name, @username and photo are enough to draw the sidebar until it's checked again. */
const withoutEmail = (data: unknown) => {
  const me = data as MeResponse
  return me?.user ? { ...me, user: { ...me.user, email: null } } : data
}

/** Writes the kept queries, with the email taken out of `me`. */
const serialize = (client: PersistedClient) =>
  JSON.stringify({
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries.map((q) => (q.queryKey[0] === 'me' ? { ...q, state: { ...q.state, data: withoutEmail(q.state.data) } } : q)),
    },
  })

function storage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    // Storage blocked (private window): nothing is kept.
    return undefined
  }
}

export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister: createSyncStoragePersister({ storage: storage(), key: localCache.storageKey, throttleTime: localCache.throttleMs, serialize }),
  buster: localCache.buster,
  maxAge: localCache.maxAgeMs,
  dehydrateOptions: { shouldDehydrateQuery: keptQuery, shouldDehydrateMutation: () => false },
}

/**
 * Keeps one account's kept clubs from showing for another: when `me` turns
 * into a different account (or signs out, as an expired sign-in does), the
 * kept club details are dropped and fetched again for whoever is here now.
 */
export function forgetOnAccountChange(client: QueryClient) {
  let account: string | null | undefined
  client.getQueryCache().subscribe((event) => {
    // 'added' covers a `me` restored from this device, so a different account fetched next still counts as a change.
    if (event.query.queryKey[0] !== 'me' || (event.type !== 'updated' && event.type !== 'added') || event.query.state.status !== 'success') return
    const now = (event.query.state.data as MeResponse | undefined)?.user?.id ?? null
    if (account !== undefined && now !== account) {
      // Reset, not removed: pages showing them fetch again straight away.
      for (const key of [['clubs'], ['directory'], ['public', 'club']]) void client.resetQueries({ queryKey: key })
    }
    account = now
  })
}

/**
 * Writes the kept queries straight away when the page is left or reloaded.
 * Writes are otherwise batched (`localCache.throttleMs`), so a reload right
 * after a change could bring back the copy from before it, and kept club
 * details count as fresh for minutes.
 */
export function saveCacheOnLeave(client: QueryClient) {
  const store = storage()
  if (!store) return
  window.addEventListener('pagehide', () => {
    try {
      const clientState = dehydrate(client, { shouldDehydrateQuery: keptQuery, shouldDehydrateMutation: () => false })
      store.setItem(localCache.storageKey, serialize({ timestamp: Date.now(), buster: localCache.buster, clientState }))
    } catch {
      // Storage full or blocked: the batched write stands.
    }
  })
}
