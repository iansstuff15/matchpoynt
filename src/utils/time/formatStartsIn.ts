/** How soon something should start, in words: "any moment now", "in about 1 min", "in about 12 min", "in about 1 h 5 min". */
export function formatStartsIn(ms: number): string {
  if (ms < 45_000) return 'any moment now'
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `in about ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `in about ${hours} h${rest ? ` ${rest} min` : ''}`
}
