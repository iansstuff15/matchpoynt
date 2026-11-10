import { WifiOff } from 'lucide-react'
import { useEffect, useRef } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import StatusBanner from '@/components/feedback/StatusBanner'
import { notifyDone } from '@/utils/feedback/notify'
import { useAppConfig } from '@/utils/hooks/useFeatures'
import { useOnline } from '@/utils/hooks/useOnline'

/** App-wide connection state: offline, API unreachable, and a toast when it comes back. */
export default function ConnectionBanner() {
  const online = useOnline()
  const config = useAppConfig()
  const wasDown = useRef(false)
  const down = !online || config.isError

  useEffect(() => {
    if (down) wasDown.current = true
    else if (wasDown.current) {
      wasDown.current = false
      notifyDone('Back online', { description: 'Connected to Matchpoynt again.' })
    }
  }, [down])

  if (!online) {
    return (
      <StatusBanner variant="warning" icon={WifiOff} title="You're offline">
        This device has no network connection. Changes can't be saved until it reconnects.
      </StatusBanner>
    )
  }
  if (config.isError) {
    return <ErrorBanner error={config.error} action="connect to the Matchpoynt API" onRetry={() => void config.refetch()} />
  }
  return null
}

