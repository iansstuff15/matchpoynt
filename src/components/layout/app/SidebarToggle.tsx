import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'

/** Collapses the sidebar to its icon rail and back (on small screens, closes the sheet). */
export default function SidebarToggle() {
  const { state, isMobile, toggleSidebar } = useSidebar()
  const collapsed = state === 'collapsed' && !isMobile
  const label = isMobile ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
      aria-label={label}
      aria-expanded={!collapsed}
      title={isMobile ? label : `${label} (Ctrl/⌘ B)`}
      onClick={toggleSidebar}
    >
      <Icon aria-hidden />
    </Button>
  )
}
