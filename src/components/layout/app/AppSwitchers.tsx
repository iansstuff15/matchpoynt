import { Layers } from 'lucide-react'
import { useMatch, useNavigate } from 'react-router'
import ClubSwitcher from '@/components/club/ClubSwitcher'
import SessionSwitcher from '@/components/session/SessionSwitcher'
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useSelectedClub } from '@/utils/hooks/useSelectedClub'
import { useActiveSessions } from '@/utils/hooks/useSession'
import { recall } from '@/utils/platform/remember'

/** The sidebar's session and club switchers, for whoever runs the board (signed in, or a guest with sign-in off). */
export default function AppSwitchers() {
  const { web } = useFeatures()
  const { signedIn, clubs, currentId } = useSelectedClub()
  const navigate = useNavigate()
  const sessionMatch = useMatch('/app/:sessionId')
  const sessions = useActiveSessions(signedIn)
  if (!signedIn) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <Layers aria-hidden />
        <span className="ml-1.5">Workspace</span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SessionSwitcher
              variant="sidebar"
              sessions={sessions.data ?? []}
              currentId={sessionMatch?.params.sessionId ?? recall('session')}
              onNew={() => navigate('/app?new=1')}
            />
          </SidebarMenuItem>
          {web.clubs && (
            <SidebarMenuItem>
              <ClubSwitcher clubs={clubs.data ?? []} currentId={currentId} />
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
