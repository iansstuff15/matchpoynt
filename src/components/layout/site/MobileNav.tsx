import { Menu } from 'lucide-react'
import { NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { webNavigation } from '@/config/navigation'
import { useNavigation } from '@/utils/hooks/useNavigation'
import { site } from '@/config/site'

/** Slide-over navigation for small screens. */
export default function MobileNav() {
  const nav = useNavigation(webNavigation)
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="Open navigation menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{site.name}</SheetTitle>
          <SheetDescription>{site.tagline}</SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
          {nav.map(({ label, href, icon: Icon, description }) => (
            <Button key={href} variant="ghost" className="justify-start" asChild>
              <NavLink to={href} title={description} end={href === '/'}>
                <Icon />
                {label}
              </NavLink>
            </Button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
