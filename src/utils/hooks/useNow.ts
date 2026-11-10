import { useEffect, useState } from 'react'

/**
 * Current time, refreshed every `intervalMs` while `active`. `offsetMs` is
 * added so timers follow the API's clock rather than a device's wrong one.
 */
export function useNow(active = true, intervalMs = 1000, offsetMs = 0): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [active, intervalMs])

  return now + offsetMs
}
