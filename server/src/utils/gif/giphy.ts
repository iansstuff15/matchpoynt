import { clubBadgeIcons, gifSearch, type GifResult, type GifSearchResponse } from '@matchpoynt/shared'
import { gifs } from '@/config/gifs'
import { invalid, notFound, unavailable } from '@/utils/http/errors'

// GIPHY, called only from the API: the key never reaches a browser. Search
// returns preview links (GIPHY's media host, in img-src); a picked GIF is
// downloaded here and stored as the badge's own icon, so leaderboards never
// load anything from GIPHY.

interface GiphyImage {
  url?: string
  width?: string
  height?: string
  size?: string
}

/** The parts of a GIPHY GIF object Matchpoynt uses. */
export interface GiphyGif {
  id: string
  title?: string
  images?: { fixed_width?: GiphyImage; fixed_height?: GiphyImage; downsized?: GiphyImage }
}

/** A search result, from a GIPHY GIF (`null` when it has no usable preview). */
export function toGifResult(gif: GiphyGif): GifResult | null {
  const preview = gif.images?.fixed_width
  if (!preview?.url) return null
  return { id: gif.id, title: gif.title?.trim() || 'GIF', previewUrl: preview.url, width: Number(preview.width) || 200, height: Number(preview.height) || 200 }
}

/** The file to store as a badge icon: GIPHY's 200px-high rendition, small enough for a chip. */
export function iconSource(gif: GiphyGif): string {
  const image = gif.images?.fixed_height ?? gif.images?.downsized
  if (!image?.url) throw notFound('That GIF has no version Matchpoynt can use. Pick another.')
  if (Number(image.size) > clubBadgeIcons.maxBytes) throw invalid('That GIF is too large for a badge icon. Pick a smaller one.', { icon: 'Too large' })
  const url = new URL(image.url)
  if (url.protocol !== 'https:' || !gifs.mediaHost.test(url.hostname)) throw unavailable('GIPHY sent a GIF from an unexpected address, so it was not used.')
  return url.toString()
}

/** Calls GIPHY, mapping its failures to messages the user can act on. */
async function call(url: string): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(gifs.timeoutMs) })
  } catch (error) {
    throw Object.assign(unavailable("The API couldn't reach GIPHY. GIF search is unavailable right now; try again, or upload an image instead."), { cause: error })
  }
  if (res.status === 401 || res.status === 403) throw unavailable('GIPHY refused the API key (GIPHY_API_KEY). GIF search needs a valid key.')
  if (res.status === 429) throw unavailable('GIF search is busy (GIPHY rate limit). Try again in a minute.')
  if (res.status === 404) throw notFound('That GIF is no longer on GIPHY. Pick another.')
  if (!res.ok) throw unavailable(`GIPHY answered HTTP ${res.status}. Try again, or upload an image instead.`)
  return res
}

const withKey = (path: string, key: string, params: Record<string, string> = {}) =>
  `${gifs.apiBase}${path}?${new URLSearchParams({ api_key: key, ...params })}`

/** One page of GIPHY search results. */
export async function searchGifs(key: string, query: string, offset: number): Promise<GifSearchResponse> {
  const q = query.trim().slice(0, gifSearch.maxQueryLength)
  if (!q) return { results: [], nextOffset: null, attribution: gifSearch.attribution }
  const res = await call(
    withKey('/search', key, { q, limit: String(gifSearch.pageSize), offset: String(offset), rating: gifs.rating, lang: gifs.lang, bundle: 'messaging_non_clips' }),
  )
  const body = (await res.json()) as { data?: GiphyGif[]; pagination?: { total_count?: number; count?: number; offset?: number } }
  const results = (body.data ?? []).map(toGifResult).filter((r): r is GifResult => r !== null)
  const page = body.pagination
  const next = (page?.offset ?? offset) + (page?.count ?? results.length)
  return { results, nextOffset: page?.total_count && next < page.total_count ? next : null, attribution: gifSearch.attribution }
}

/** Downloads a GIF picked from search, for storing as a badge icon. */
export async function downloadGif(key: string, gifId: string): Promise<Uint8Array> {
  const res = await call(withKey(`/${encodeURIComponent(gifId)}`, key, { rating: gifs.rating }))
  const body = (await res.json()) as { data?: GiphyGif }
  if (!body.data?.id) throw notFound('That GIF is no longer on GIPHY. Pick another.')
  const file = await call(iconSource(body.data))
  return new Uint8Array(await file.arrayBuffer())
}
