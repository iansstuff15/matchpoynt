import { play } from '@/config/play'

// Telling a player they've been called (up next, or onto a court) when they
// aren't looking: the phone vibrates and the system shows a notification.
// Both are the browser's; what counts as "called" is the API's status.

/** Whether this browser can show system notifications at all. */
export const canNotify = (): boolean => typeof window !== 'undefined' && 'Notification' in window

/** Asks once for permission to notify; true when it's granted. */
export async function allowNotifications(): Promise<boolean> {
  if (!canNotify()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

/** Vibrates (where the device can) and shows a notification (where allowed and the page isn't in front). */
export function alertCalled(title: string, body: string): void {
  try {
    navigator.vibrate?.(play.calledVibration)
  } catch {
    // No vibration motor, or not allowed: the notification and the page still say it.
  }
  if (!canNotify() || Notification.permission !== 'granted' || document.visibilityState === 'visible') return
  try {
    new Notification(title, { body, tag: 'matchpoynt-called', icon: '/favicon.svg' })
  } catch {
    // Some mobile browsers only notify through a service worker: the vibration and page still tell them.
  }
}
