import { Award, Building2, CalendarDays, History, House, Info, LayoutGrid, Trophy, Users } from 'lucide-react'
import type { AppNavGroup, NavItem } from '@/interfaces/NavItem'

export const webNavigation: NavItem[] = [
  { label: 'Home', href: '/', icon: House, description: 'Matchpoynt home: fair queues and court sessions for every sport' },
  { label: 'Rankings', href: '/rankings', icon: Trophy, description: 'Public player rankings by sport and season', feature: 'rankings' },
  { label: 'Session board', href: '/app', icon: LayoutGrid, description: 'Run a live court session with a fair player queue' },
  { label: 'Clubs', href: '/clubs', icon: Building2, description: 'Manage your clubs: members, planned sessions and photos', feature: 'clubs' },
]

/**
 * The app shell's sidebar (web and desktop): the court board, then the
 * pages of the club picked in the sidebar's club switcher. No website pages
 * (home, public rankings) here.
 */
export const appNavigation: AppNavGroup[] = [
  {
    label: 'Courts',
    icon: LayoutGrid,
    items: [
      { label: 'Session board', href: '/app', icon: LayoutGrid, description: 'Run a live court session with a fair player queue' },
      { label: 'Past sessions', href: '/app/past', end: true, icon: History, description: 'Finished sessions and their final leaderboards' },
    ],
  },
  {
    label: 'Club',
    icon: Building2,
    feature: 'clubs',
    namedByClub: true,
    items: [
      { label: 'Sessions', href: '/clubs', clubTab: 'sessions', icon: CalendarDays, description: "The club's planned sessions and the sessions it has run" },
      { label: 'Members', href: '/clubs', clubTab: 'members', icon: Users, description: "The club's players: names, contacts, skill tiers and invites" },
      { label: 'Badges', href: '/clubs', clubTab: 'badges', feature: 'clubBadges', icon: Award, description: "The club's own badges: conditions and GIF icons" },
      { label: 'Club info', href: '/clubs', clubTab: 'info', icon: Info, description: "The club's name, description and photos" },
      { label: 'All clubs', href: '/clubs', end: true, icon: Building2, description: 'Pick, add or edit your clubs' },
    ],
  },
]
