import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadGif, iconSource, searchGifs, toGifResult } from '@/utils/gif/giphy'
import { ApiError } from '@/utils/http/errors'

const gif = (id: string, host = 'media1.giphy.com') => ({
  id,
  title: `GIF ${id}`,
  images: {
    fixed_width: { url: `https://${host}/media/${id}/200w.gif`, width: '200', height: '150' },
    fixed_height: { url: `https://${host}/media/${id}/200.gif`, width: '266', height: '200', size: '120000' },
  },
})

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('toGifResult', () => {
  it('keeps the id, a title and the small preview', () => {
    expect(toGifResult(gif('abc'))).toEqual({ id: 'abc', title: 'GIF abc', previewUrl: 'https://media1.giphy.com/media/abc/200w.gif', width: 200, height: 150 })
    expect(toGifResult({ id: 'x' })).toBeNull()
  })
})

describe('iconSource', () => {
  it("uses GIPHY's own media host only", () => {
    expect(iconSource(gif('abc'))).toBe('https://media1.giphy.com/media/abc/200.gif')
    expect(() => iconSource(gif('abc', 'evil.example.com'))).toThrow(ApiError)
  })

  it('refuses a GIF over the size limit', () => {
    const big = gif('big')
    big.images.fixed_height.size = String(6 * 1024 * 1024)
    expect(() => iconSource(big)).toThrow(/too large/)
  })
})

describe('searchGifs', () => {
  it('sends the key and query to GIPHY and pages through results', async () => {
    const fetchMock = vi.fn(async (_url: string) => respond({ data: [gif('a'), gif('b')], pagination: { total_count: 30, count: 2, offset: 0 } }))
    vi.stubGlobal('fetch', fetchMock)
    const page = await searchGifs('KEY', ' trophy ', 0)
    const url = new URL(fetchMock.mock.calls[0]![0])
    expect(url.searchParams.get('api_key')).toBe('KEY')
    expect(url.searchParams.get('q')).toBe('trophy')
    expect(url.searchParams.get('rating')).toBe('pg')
    expect(page.results.map((r) => r.id)).toEqual(['a', 'b'])
    expect(page.nextOffset).toBe(2)
    expect(page.attribution).toBe('Powered by GIPHY')
  })

  it('returns nothing for a blank query without calling GIPHY', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect((await searchGifs('KEY', '   ', 0)).results).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('explains a refused key, a rate limit and an outage', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond({}, 403)))
    await expect(searchGifs('BAD', 'cat', 0)).rejects.toThrow(/refused the API key/)
    vi.stubGlobal('fetch', vi.fn(async () => respond({}, 429)))
    await expect(searchGifs('KEY', 'cat', 0)).rejects.toThrow(/rate limit/)
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))))
    await expect(searchGifs('KEY', 'cat', 0)).rejects.toThrow(/couldn't reach GIPHY/)
  })
})

describe('downloadGif', () => {
  it('looks the GIF up, then downloads its icon rendition', async () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 2, 3])
    const fetchMock = vi.fn(async (url: string) => (url.includes('api.giphy.com') ? respond({ data: gif('xyz') }) : new Response(bytes)))
    vi.stubGlobal('fetch', fetchMock)
    expect(await downloadGif('KEY', 'xyz')).toEqual(bytes)
    expect(fetchMock.mock.calls[1]![0]).toBe('https://media1.giphy.com/media/xyz/200.gif')
  })
})
