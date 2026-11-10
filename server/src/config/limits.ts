/** Size limits for request bodies and lists. */
export const limits = {
  bodyBytes: 64 * 1024,
  /** Photo uploads: the largest photo (shared clubImages.maxBytes) plus room for the form encoding. */
  uploadBodyBytes: 4 * 1024 * 1024 + 64 * 1024,
  recentMatches: 10,
  maxScore: 99,
}
