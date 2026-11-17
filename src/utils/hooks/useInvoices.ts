import type { InvoiceGroupResponse, InvoiceGroupView, PaymentMethod } from '@matchpoynt/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { dismissProgress, notifyDone, notifyProgress } from '@/utils/feedback/notify'
import { formatMoney } from '@/utils/forms/money'

/** One finished session's invoices; `null` when it had no fee. */
export function useSessionInvoices(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.sessionInvoices(sessionId),
    queryFn: async ({ signal }) => (await api<InvoiceGroupResponse>('GET', `/invoices/${encodeURIComponent(sessionId)}`, { signal })).group,
    enabled,
  })
}

interface MarkPaid {
  invoiceId: string
  name: string
  paid: boolean
  /** How what's left was paid, when marking paid. */
  method?: PaymentMethod
}

/** A change to one person's payments: a payment (part, a downpayment, or the rest), or removing one. */
export type PaymentChange =
  | { kind: 'record'; invoiceId: string; name: string; amount: number; method: PaymentMethod }
  | { kind: 'remove'; invoiceId: string; name: string; paymentId: string }

/**
 * Marks one person's invoice paid or unpaid: a player's on a session, or a
 * payer's on a manual invoice. The API answers with the group and its new
 * totals, which replace the cached ones; the club's accounting reloads.
 * Failures show in the caller's error banner.
 */
export function useMarkInvoicePaid(group: Pick<InvoiceGroupView, 'id' | 'kind' | 'clubId'>) {
  const client = useQueryClient()
  const path = (invoiceId: string) =>
    group.kind === 'session'
      ? `/invoices/${encodeURIComponent(group.id)}/${encodeURIComponent(invoiceId)}`
      : `/accounting/${encodeURIComponent(group.clubId ?? '')}/invoices/${encodeURIComponent(group.id)}/payers/${encodeURIComponent(invoiceId)}`
  return useMutation<InvoiceGroupResponse, unknown, MarkPaid, { toastId: string | number }>({
    mutationFn: ({ invoiceId, paid, method }) => api<InvoiceGroupResponse>('PUT', path(invoiceId), { body: { paid, method } }),
    // One change at a time per group, in the order they were made.
    scope: { id: `invoices-${group.id}` },
    onMutate: ({ name, paid }) => ({ toastId: notifyProgress(paid ? `Marking ${name} as paid…` : `Marking ${name} as unpaid…`) }),
    onSuccess: ({ group: next }, { name, paid }, ctx) => {
      notifyDone(paid ? `${name} paid in full` : `${name} marked as unpaid`, {
        id: ctx?.toastId,
        description: next ? `${next.paidCount} of ${next.invoices.length} paid for ${next.label}` : undefined,
      })
      if (!next) return
      if (next.kind === 'session') client.setQueryData(queryKeys.sessionInvoices(next.id), next)
      if (next.clubId) void client.invalidateQueries({ queryKey: queryKeys.accounting(next.clubId) })
    },
    onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
  })
}

/**
 * Records a payment towards one person's invoice (a downpayment, part of it,
 * or the rest), or removes one recorded by mistake. Same routes and caching as
 * marking paid; failures show in the caller's error banner.
 */
export function useInvoicePayment(group: Pick<InvoiceGroupView, 'id' | 'kind' | 'clubId'>) {
  const client = useQueryClient()
  const base = (invoiceId: string) =>
    group.kind === 'session'
      ? `/invoices/${encodeURIComponent(group.id)}/${encodeURIComponent(invoiceId)}/payments`
      : `/accounting/${encodeURIComponent(group.clubId ?? '')}/invoices/${encodeURIComponent(group.id)}/payers/${encodeURIComponent(invoiceId)}/payments`
  return useMutation<InvoiceGroupResponse, unknown, PaymentChange, { toastId: string | number }>({
    mutationFn: (change) =>
      change.kind === 'record'
        ? api<InvoiceGroupResponse>('POST', base(change.invoiceId), { body: { amount: change.amount, method: change.method } })
        : api<InvoiceGroupResponse>('DELETE', `${base(change.invoiceId)}/${encodeURIComponent(change.paymentId)}`),
    scope: { id: `invoices-${group.id}` },
    onMutate: (change) => ({ toastId: notifyProgress(change.kind === 'record' ? `Recording ${change.name}'s payment…` : `Removing ${change.name}'s payment…`) }),
    onSuccess: ({ group: next }, change, ctx) => {
      const mine = next?.invoices.find((i) => i.id === change.invoiceId)
      notifyDone(change.kind === 'record' ? `${change.name}'s payment recorded` : `${change.name}'s payment removed`, {
        id: ctx?.toastId,
        description: mine ? (mine.balance ? `Still owes ${formatMoney(mine.balance, next!.currency)}` : 'Paid in full') : undefined,
      })
      if (!next) return
      if (next.kind === 'session') client.setQueryData(queryKeys.sessionInvoices(next.id), next)
      if (next.clubId) void client.invalidateQueries({ queryKey: queryKeys.accounting(next.clubId) })
    },
    onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
  })
}
