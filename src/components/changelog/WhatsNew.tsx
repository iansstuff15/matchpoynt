import { useMemo, useState, type ReactNode } from 'react'
import ChangelogDialog from '@/components/changelog/ChangelogDialog'
import { latestRelease } from '@/config/changelog'
import { hasSeenRelease, markReleaseSeen } from '@/utils/changelog/seen'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'
import { WhatsNewContext } from '@/utils/hooks/useWhatsNew'

/**
 * Shows "What's new" once per release for each account (or the guest) the
 * first time they open the app after it, and lets the account menu open it
 * again (`useWhatsNew`). Seen releases are remembered in this browser.
 */
export default function WhatsNew({ children }: { children: ReactNode }) {
  const { web } = useFeatures()
  const me = useMe()
  // Who's here: the signed-in account, or this browser's guest while sign-in is off. Unknown until `me` answers.
  const account = !web.signIn ? 'guest' : me.isSuccess ? (me.data.user?.id ?? null) : null
  const [manual, setManual] = useState(false)
  // Closing is kept in state, not only in storage: storage changes don't re-render, and may be blocked.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)
  // First visit after a release for this account: open by itself, until closed.
  const auto = Boolean(account && latestRelease && dismissedFor !== account && !hasSeenRelease(account, latestRelease.version))
  const context = useMemo(() => ({ open: () => setManual(true) }), [])

  const close = () => {
    if (account && latestRelease) markReleaseSeen(account, latestRelease.version)
    setManual(false)
    setDismissedFor(account)
  }

  return (
    <WhatsNewContext.Provider value={context}>
      {children}
      <ChangelogDialog open={manual || auto} onOpenChange={(open) => (open ? setManual(true) : close())} />
    </WhatsNewContext.Provider>
  )
}
