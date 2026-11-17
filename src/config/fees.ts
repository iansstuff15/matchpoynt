import type { FeeKind, PaymentMethod } from '@matchpoynt/shared'
import { CircleSlash, Layers, Repeat, Ticket, type LucideIcon } from 'lucide-react'

/** Icons for the fee choices. Their labels and descriptions are `feeKinds` in shared config. */
export const feeKindIcons: Record<FeeKind | 'none', LucideIcon> = {
  none: CircleSlash,
  fixed: Ticket,
  'per-game': Repeat,
  'base-per-game': Layers,
}

/** The "no fee" choice in the fee forms. */
export const noFee = { label: 'No fee', description: 'Nobody is invoiced when the session ends.' }

/** Invoice table columns, shared by the table and its skeleton so they line up exactly. */
export const invoiceColumns = [
  { key: 'name', label: 'Player', className: '' },
  { key: 'breakdown', label: 'Worked out as', className: 'hidden md:table-cell' },
  { key: 'amount', label: 'Amount', className: 'w-28 text-right' },
  { key: 'paid', label: 'Paid', className: 'w-28 text-right' },
] as const

/** Invoice groups shown while the Invoices page loads. */
export const invoiceSkeletonGroups = 2

/** How a payment was made, as the invoice pages word it. */
export const paymentMethods: Record<PaymentMethod, string> = { cash: 'Cash', online: 'Online' }
