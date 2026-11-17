import { useMatch, useNavigate } from 'react-router'
import ClubSwitcher from '@/components/club/ClubSwitcher'
import PlayerClubSwitcher from '@/components/directory/PlayerClubSwitcher'
import SessionSwitcher from '@/components/session/SessionSwitcher'
import { SidebarMenuItem } from '@/components/ui/sidebar'
import { useCanRunSessions } from '@/utils/hooks/useCanRunSessions'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { usePlayerClub } from '@/utils/hooks/usePlayerClub'
import { useSelectedClub } from '@/utils/hooks/useSelectedClub'
import { useActiveSessions } from '@/utils/hooks/useSession'
import { recall } from '@/utils/platform/remember'

/**
 * The switcher at the top of a sidebar group: your running sessions (with
 * "New session") over your own links, or, for players, the club they're
 * playing with (`PlayerClubSwitcher`); and your clubs over the club's pages.
 */
export default function SidebarSwitcher({ kind }: { kind: 'session' | 'club' }) {
  const { signedIn, clubs, currentId } = useSelectedClub()
  const navigate = useNavigate()
  const sessionMatch = useMatch('/app/:sessionId')
  // Player-only accounts don't run sessions, so they get no session switcher.
  const canRunSessions = useCanRunSessions()
  const sessions = useActiveSessions(signedIn && kind === 'session' && canRunSessions)
  const { web } = useFeatures()
  const directory = web.clubs && web.signIn && web.clubDirectory
  const player = usePlayerClub()
  if (!signedIn) return null
  // Players switch the club they're playing with where a Queue Master switches sessions.
  if (kind === 'session' && !canRunSessions) {
    if (!directory) return null
    return (
      <SidebarMenuItem>
        <PlayerClubSwitcher clubs={player.clubs.data ?? []} current={player.club} />
      </SidebarMenuItem>
    )
  }
  return (
    <SidebarMenuItem>
      {kind === 'session' ? (
        <SessionSwitcher variant="sidebar" sessions={sessions.data ?? []} currentId={sessionMatch?.params.sessionId ?? recall('session')} onNew={() => navigate('/app?new=1')} />
      ) : (
        <ClubSwitcher clubs={clubs.data ?? []} currentId={currentId} findClubs={directory} />
      )}
    </SidebarMenuItem>
  )
}
