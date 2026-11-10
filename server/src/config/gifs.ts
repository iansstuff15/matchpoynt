/** GIF search through GIPHY (utils/gif/giphy.ts). */
export const gifs = {
  apiBase: 'https://api.giphy.com/v1/gifs',
  /** GIPHY's content rating ceiling for results. */
  rating: 'pg',
  lang: 'en',
  /** Give up on GIPHY after this long. */
  timeoutMs: 8000,
  /** Only GIFs from GIPHY's own media hosts are downloaded as badge icons. */
  mediaHost: /^media\d*\.giphy\.com$/,
}
