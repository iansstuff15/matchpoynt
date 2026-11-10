/** How uploaded photos are stored: every one is re-encoded as WebP. */
export const images = {
  /** WebP quality, 0–100. 82 keeps photos sharp at about a third of a JPEG's size. */
  webpQuality: 82,
  /** Larger photos are refused rather than decoded (a 5 MB file can hide a huge image). */
  maxPixels: 40_000_000,
}
