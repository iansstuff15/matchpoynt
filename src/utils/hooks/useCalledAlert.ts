import type { PlayerLiveMe } from '@matchpoynt/shared'
import { useEffect, useRef, useState } from 'react'
import { play } from '@/config/play'
import { notifyChange } from '@/utils/feedback/notify'
import { alertCalled, allowNotifications, canNotify } from '@/utils/platform/calledAlert'
import { forget, recall, remember } from '@/utils/platform/remember'

/**
 * "Alert me when I'm called": once on (remembered in this browser), moving to
 * up next or onto a court buzzes the phone, shows a notification while the
 * page is in the background, and always toasts. The status is the API's.
 */
export function useCalledAlert(me: PlayerLiveMe | null) {
  const [on, setOn] = useState(() => recall('calledAlert') === 'on')
  const last = useRef(me?.status)
  const status = me?.status

  useEffect(() => {
    const before = last.current
    last.current = status
    if (!on || !status || before === undefined || before === status) return
    if (status !== 'up_next' && status !== 'playing') return
    const words = play.called[status]
    alertCalled(words.title, me?.courtLabel ? `${words.body} (${me.courtLabel})` : words.body)
    notifyChange(words.title, words.body)
  }, [on, status, me?.courtLabel])

  const toggle = async () => {
    if (on) {
      forget('calledAlert')
      setOn(false)
      return
    }
    // Notifications need permission once; without it the phone still buzzes and the page toasts.
    await allowNotifications()
    remember('calledAlert', 'on')
    setOn(true)
  }

  return { on, toggle, notifications: canNotify() }
}
