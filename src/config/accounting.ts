/** Biller table columns, shared by the table and its skeleton so they line up exactly. */
export const billerColumns = [
  { key: 'name', label: 'Biller', className: '' },
  { key: 'contact', label: 'Contact', className: 'hidden sm:table-cell' },
  { key: 'expenses', label: 'Expenses', className: 'hidden w-24 text-right md:table-cell' },
  { key: 'actions', label: 'Actions', className: 'w-24 text-right' },
] as const

/** Expense table columns, shared by the table and its skeleton. */
export const expenseColumns = [
  { key: 'date', label: 'Date', className: 'w-28' },
  { key: 'description', label: 'Expense', className: '' },
  { key: 'for', label: 'For', className: 'hidden lg:table-cell' },
  { key: 'biller', label: 'Biller', className: 'hidden md:table-cell' },
  { key: 'amount', label: 'Amount', className: 'w-28 text-right' },
  { key: 'open', label: '', className: 'w-8' },
] as const

/** The club's invoices list. */
export const invoiceListColumns = [
  { key: 'label', label: 'Invoice', className: '' },
  { key: 'date', label: 'Date', className: 'hidden w-40 md:table-cell' },
  { key: 'collected', label: 'Collected', className: 'hidden w-44 text-right sm:table-cell' },
  { key: 'status', label: 'Status', className: 'w-36 text-right' },
  { key: 'open', label: '', className: 'w-8' },
] as const

/** Rows shown while a table loads. */
export const accountingSkeletonRows = 5

/** The expense list's "for" filter: everything, club-wide only, or session expenses only (or one session, by id). */
export const expenseScopes = [
  { value: 'all', label: 'Club-wide and sessions' },
  { value: 'global', label: 'Club-wide only' },
  { value: 'session', label: 'Sessions only' },
] as const

/** The dashboard's monthly chart: series names and their theme colours (validated as a pair). */
export const accountingSeries = [
  { key: 'collected', label: 'Collected', color: 'var(--chart-collected)' },
  { key: 'expenses', label: 'Expenses', color: 'var(--chart-spent)' },
] as const

/** How many month labels the chart shows at most; the months between go unlabelled (phones fit about six). */
export const chartMaxMonthLabels = 6
