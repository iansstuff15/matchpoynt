/** Member table columns, shared by the table and its skeleton so they line up exactly. */
export const memberColumns = [
  { key: 'name', label: 'Name', className: '' },
  { key: 'contact', label: 'Contact', className: 'hidden sm:table-cell' },
  { key: 'tiers', label: 'Skill tiers', className: 'hidden w-1/3 md:table-cell' },
  { key: 'account', label: 'Account', className: 'hidden w-28 lg:table-cell' },
  { key: 'actions', label: 'Actions', className: 'w-32 text-right' },
] as const

/** Planned session cards shown while the club page loads. */
export const clubSkeletonCards = 3

/** The photo viewer's zoom: from fitted (1) up to `max`, in `step`s (buttons and the mouse wheel). */
export const photoZoom = { min: 1, max: 4, step: 0.5 }

/** Club photo names and hints, shared by the club page, its viewer and the Club info tab. */
export const clubPhotos = {
  avatar: { label: 'Profile photo', description: "Your club's logo or a square photo." },
  cover: { label: 'Cover photo', description: 'A wide photo for the top of the club page.' },
} as const

/** A club's pages, in sidebar order: the dashboard (`/clubs/<id>`), then each at `/clubs/<id>/<page>`. */
export const clubPages = ['dashboard', 'sessions', 'members', 'badges', 'feedback', 'announcements', 'invoices', 'expenses', 'billers', 'accounting'] as const

/** Each page's name, for breadcrumbs and page titles. */
export const clubPageLabels = {
  dashboard: 'Dashboard',
  sessions: 'Sessions',
  members: 'Members',
  badges: 'Badges',
  feedback: 'Feedback',
  announcements: 'Announcements',
  invoices: 'Invoices',
  expenses: 'Expenses',
  billers: 'Billers',
  accounting: 'Accounting',
} as const

/** The club settings dialog's groups, in its sidebar's order. */
export const clubSettingsGroups = ['general', 'social', 'joining', 'appearance', 'fees', 'payments', 'delete'] as const

/** What the Feedback page's skeleton draws while it loads. */
export const feedbackSkeleton = { questions: 3, sessions: 2 }
