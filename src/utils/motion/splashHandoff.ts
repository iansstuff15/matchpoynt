// The splash handing over to the app: while it's on, SplashHandoff covers the
// screen exactly like the splash's last frame, so the splash can go away and
// the app load underneath without anything flashing.

type Listener = () => void

let on = false
const listeners = new Set<Listener>()

export function subscribeHandoff(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const isHandingOff = () => on

export function setHandingOff(value: boolean): void {
  if (on === value) return
  on = value
  listeners.forEach((l) => l())
}
