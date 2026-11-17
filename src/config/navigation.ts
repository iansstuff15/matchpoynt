import {
  Award,
  Building2,
  CalendarDays,
  ChartColumn,
  CircleUserRound,
  Compass,
  Gauge,
  House,
  LayoutGrid,
  MessageSquareText,
  Megaphone,
  ReceiptText,
  ScrollText,
  Store,
  Swords,
  Timer,
  Trophy,
  UserRound,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react'
import type { AppNavGroup, AppNavItem, NavItem } from '@/interfaces/NavItem'

export const webNavigation: NavItem[] = [
  { label: 'Home', href: '/', icon: House, description: 'Matchpoynt home: fair queues and court sessions for every sport' },
  { label: 'Rankings', href: '/rankings', icon: Trophy, description: 'Public player rankings by sport and season', feature: 'rankings' },
  { label: 'Session board', tabLabel: 'Board', href: '/app', icon: LayoutGrid, description: 'Run a live court session with a fair player queue', sessionRunner: true },
  { label: 'Clubs', href: '/clubs', icon: Building2, description: 'Manage your clubs: members, planned sessions and photos', feature: 'clubs', clubManager: true },
  {
    label: 'Find clubs',
    tabLabel: 'Find',
    href: '/choose-club',
    icon: Compass,
    description: 'Every club on Matchpoynt: its sessions, badges and leaderboard, and asking to join',
    feature: ['clubs', 'signIn', 'clubDirectory'],
  },
]

/**
 * The app shell's sidebar (web and desktop), in two groups: **You** (your
 * sessions, invoices, finding clubs and your profile, under the session
 * switcher) and **Club** (the pages of the club picked in the club switcher
 * above them). No website pages (home, public rankings) here.
 */
export const appNavigation: AppNavGroup[] = [
  {
    label: 'You',
    icon: UserRound,
    switcher: 'session',
    items: [
      { label: 'Session board', href: '/app', icon: LayoutGrid, description: 'Run a live court session with a fair player queue', sessionRunner: true },
      {
        label: 'Playing now',
        href: '/play',
        icon: Timer,
        feature: ['clubs', 'signIn', 'clubDirectory', 'playerView'],
        description: "Your clubs' sessions running now: your wait, who's on court, who's up next and the queue",
      },
      { label: 'Friends', href: '/friends', end: true, icon: UsersRound, feature: ['signIn', 'friends'], description: 'Your friends on Matchpoynt, and friend requests to answer' },
      { label: 'Your record', href: '/record', end: true, icon: Trophy, feature: 'signIn', description: 'Your record across your clubs and sports' },
      { label: 'Match history', href: '/record/games', end: true, icon: ScrollText, feature: 'signIn', description: 'Every match you played across your clubs, sports and sessions' },
      { label: 'Your sessions', href: '/record/sessions', end: true, icon: CalendarDays, feature: 'signIn', description: 'Every club session you played in, with your place and badges' },
      { label: 'Badges', href: '/record/badges', end: true, icon: Award, feature: 'signIn', description: 'Your badge collection' },
      { label: 'Rivals', href: '/record/rivals', end: true, icon: Swords, feature: 'signIn', description: 'Who you play against and with most, and how it goes' },
      { label: 'Your profile', href: '/profile', end: true, icon: CircleUserRound, feature: 'signIn', description: 'Your details, record, badges, clubs and games' },
    ],
  },
  {
    label: 'Club',
    icon: Building2,
    feature: 'clubs',
    clubManager: true,
    namedByClub: true,
    switcher: 'club',
    items: [
      { label: 'Dashboard', href: '/clubs', clubPage: 'dashboard', icon: Gauge, description: "The club at a glance: its info and settings, what's still to set up, sessions and money" },
      { label: 'Sessions', href: '/clubs', clubPage: 'sessions', icon: CalendarDays, description: "The club's planned sessions and the sessions it has run" },
      { label: 'Members', href: '/clubs', clubPage: 'members', icon: Users, description: "The club's players: names, contacts, skill tiers and invites" },
      { label: 'Badges', href: '/clubs', clubPage: 'badges', feature: 'clubBadges', icon: Award, description: "The club's own badges: conditions and GIF icons" },
      {
        label: 'Feedback',
        href: '/clubs',
        clubPage: 'feedback',
        feature: 'clubFeedback',
        icon: MessageSquareText,
        description: "The club's post-session feedback form and how each session was rated",
      },
      {
        label: 'Announcements',
        href: '/clubs',
        clubPage: 'announcements',
        feature: 'clubAnnouncements',
        icon: Megaphone,
        description: 'News for members: posted, pinned and edited, shown on the club page',
      },
      { label: 'Invoices', href: '/clubs', clubPage: 'invoices', feature: 'accounting', icon: ReceiptText, description: "Invoices made by the club and its sessions' fees, with who has paid" },
      { label: 'Expenses', href: '/clubs', clubPage: 'expenses', feature: 'accounting', icon: Wallet, description: "The club's expenses, club-wide and per session, linked to its billers" },
      { label: 'Billers', href: '/clubs', clubPage: 'billers', feature: 'accounting', icon: Store, description: 'Who the club pays: venues, suppliers and coaches' },
      { label: 'Accounting', href: '/clubs', clubPage: 'accounting', feature: 'accounting', icon: ChartColumn, description: "The club's earnings by month: invoices collected less expenses" },
      { label: 'All clubs', href: '/clubs', end: true, icon: Building2, description: 'Pick, add or edit your clubs' },
    ],
  },
]

/**
 * The app shell's bottom tab bar on phones (`AppTabBar`), with a Menu tab after
 * these that opens the full sidebar (switchers, account, the club's pages).
 * Labels are short to fit a tab; descriptions stay search friendly.
 */
export const appTabs: AppNavItem[] = [
  { label: 'Board', href: '/app', icon: LayoutGrid, description: 'Run a live court session with a fair player queue', sessionRunner: true },
  { label: 'Your record', tabLabel: 'Overview', href: '/record', end: true, icon: ChartColumn, feature: 'signIn', description: 'Your record across your clubs and sports' },
  {
    label: 'Your sessions',
    tabLabel: 'Sessions',
    href: '/record/sessions',
    end: true,
    icon: CalendarDays,
    feature: 'signIn',
    description: 'Every club session you played in, with your place and badges',
  },
  {
    label: 'Playing now',
    tabLabel: 'Playing',
    href: '/play',
    icon: Timer,
    cta: true,
    feature: ['clubs', 'signIn', 'clubDirectory', 'playerView'],
    description: "Your clubs' sessions running now: your wait, who's on court, who's up next and the queue",
  },
  { label: 'Clubs', href: '/clubs', icon: Building2, description: 'Your clubs: planned sessions, members, badges and photos', feature: 'clubs', clubManager: true },
  { label: 'Badges', href: '/record/badges', end: true, icon: Award, feature: 'signIn', description: 'Your badge collection' },
  { label: 'Friends', href: '/friends', end: true, icon: UsersRound, feature: ['signIn', 'friends'], description: 'Your friends on Matchpoynt, and friend requests to answer' },
]
