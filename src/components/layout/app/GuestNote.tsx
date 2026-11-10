import { UserRound } from 'lucide-react'
import { useAppConfig, useFeatures } from '@/utils/hooks/useFeatures'

/** With sign-in off, a card at the foot of the sidebar saying sessions stay with this browser. */
export default function GuestNote() {
  const { web } = useFeatures()
  const config = useAppConfig()

  // Without the API we don't know the account mode, so show nothing rather than guess.
  if (config.isError || config.isLoading || web.signIn) return null

  return (
    <aside className="sidebar-note" aria-label="Guest mode">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <UserRound className="size-4 text-sidebar-primary" aria-hidden />
        Guest mode
      </p>
      <p className="text-sidebar-foreground/70">Sessions stay with this browser. Clearing its cookies clears them.</p>
    </aside>
  )
}
