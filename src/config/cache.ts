import { site } from '@/config/site'

/**
 * What the web app keeps on this device so pages open without waiting:
 * only non-sensitive club and profile details (`utils/api/persistCache.ts`).
 */
export const localCache = {
  /** The localStorage key the cache is kept under. */
  storageKey: 'matchpoynt.cache',
  /** A new app version starts from an empty cache, so old shapes never load. */
  buster: site.version,
  /** Kept data older than this is dropped. */
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  /** Kept club details (your clubs list, club pages for players, join cards) count as fresh for this long. */
  clubStaleMs: 5 * 60 * 1000,
  /** Writes to storage are batched this far apart. */
  throttleMs: 1000,
}
