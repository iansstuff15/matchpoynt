import type { AccountingView, BillerInput, BillersResponse, ClubInvoicesResponse, ExpenseInput, ExpenseResponse, ExpensesResponse, InvoiceGroupResponse, ManualInvoiceInput } from '@matchpoynt/shared'
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { dismissProgress, notifyDone, notifyProgress } from '@/utils/feedback/notify'
import { rangeQuery, viewerTimeZone, type DateRange } from '@/utils/forms/dateRange'

const path = (clubId: string, rest: string) => `/accounting/${encodeURIComponent(clubId)}${rest}`
const query = (params: Record<string, string>) => (Object.keys(params).length ? `?${new URLSearchParams(params)}` : '')

/** One manual invoice of the club, for its own page. */
export function useManualInvoice(clubId: string, invoiceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.manualInvoice(clubId, invoiceId),
    queryFn: async ({ signal }) => (await api<InvoiceGroupResponse>('GET', path(clubId, `/invoices/${encodeURIComponent(invoiceId)}`), { signal })).group,
    enabled,
  })
}

/** One expense of the club, for its own page. */
export function useExpense(clubId: string, expenseId: string) {
  return useQuery({
    queryKey: queryKeys.expense(clubId, expenseId),
    queryFn: async ({ signal }) => (await api<ExpenseResponse>('GET', path(clubId, `/expenses/${encodeURIComponent(expenseId)}`), { signal })).expense,
  })
}

/** The club's billers, by name. */
export function useBillers(clubId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.billers(clubId),
    queryFn: async ({ signal }) => (await api<BillersResponse>('GET', path(clubId, '/billers'), { signal })).billers,
    enabled,
  })
}

/** Which expenses to list: a date range, a biller id, and `global`, `session` or a session id (empty for all). */
export interface ExpenseFilter extends DateRange {
  biller: string
  scope: string
}

/** The club's expenses, a page at a time, for a filter, newest first, with totals per currency. Keeps the last list on screen while a new filter loads. */
export function useExpenses(clubId: string, filter: ExpenseFilter) {
  const params = { ...rangeQuery(filter), ...(filter.biller && { biller: filter.biller }), ...(filter.scope && { scope: filter.scope }) }
  return useInfiniteQuery({
    queryKey: queryKeys.expenses(clubId, params),
    queryFn: ({ signal, pageParam }) => api<ExpensesResponse>('GET', path(clubId, `/expenses${query({ ...params, offset: String(pageParam) })}`), { signal }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    placeholderData: keepPreviousData,
  })
}

/** The accounting dashboard for a date range, counted in the viewer's time zone. */
export function useAccountingSummary(clubId: string, range: DateRange) {
  const params = { ...rangeQuery(range), tz: viewerTimeZone() }
  return useQuery({
    queryKey: queryKeys.accountingSummary(clubId, params),
    queryFn: ({ signal }) => api<AccountingView>('GET', path(clubId, `/summary${query(params)}`), { signal }),
    placeholderData: keepPreviousData,
  })
}

/** The club's invoices for a date range: manual ones and its sessions', newest first. */
export function useClubInvoices(clubId: string, range: DateRange) {
  const params = { ...rangeQuery(range), tz: viewerTimeZone() }
  return useInfiniteQuery({
    queryKey: queryKeys.clubInvoices(clubId, params),
    queryFn: ({ signal, pageParam }) => api<ClubInvoicesResponse>('GET', path(clubId, `/invoices${query({ ...params, offset: String(pageParam) })}`), { signal }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    placeholderData: keepPreviousData,
  })
}

interface Tracked<V, D> {
  mutationFn: (vars: V) => Promise<D>
  progress: (vars: V) => string
  done: (vars: V) => string
}

/**
 * Billers and expenses changes. The API checks each one; afterwards every
 * accounting query of the club reloads (lists, totals and the dashboard).
 * Progress and results are toasted; failures show in the caller's error banner.
 */
export function useAccountingActions(clubId: string) {
  const client = useQueryClient()
  function useTracked<V, D>(t: Tracked<V, D>) {
    return useMutation<D, unknown, V, { toastId: string | number }>({
      mutationFn: t.mutationFn,
      scope: { id: `accounting-${clubId}` },
      onMutate: (vars) => ({ toastId: notifyProgress(t.progress(vars)) }),
      onSuccess: (_d, vars, ctx) => {
        notifyDone(t.done(vars), { id: ctx?.toastId })
        return client.invalidateQueries({ queryKey: queryKeys.accounting(clubId) })
      },
      onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
    })
  }
  return {
    addBiller: useTracked({
      mutationFn: (biller: BillerInput) => api<BillersResponse>('POST', path(clubId, '/billers'), { body: biller }),
      progress: (b) => `Adding ${b.name.trim() || 'the biller'}…`,
      done: (b) => `${b.name.trim()} added to billers`,
    }),
    updateBiller: useTracked({
      mutationFn: ({ id, biller }: { id: string; biller: BillerInput }) => api<BillersResponse>('PUT', path(clubId, `/billers/${id}`), { body: biller }),
      progress: ({ biller }) => `Saving ${biller.name.trim() || 'the biller'}…`,
      done: ({ biller }) => `${biller.name.trim()} saved`,
    }),
    deleteBiller: useTracked({
      mutationFn: ({ id }: { id: string; name: string }) => api<BillersResponse>('DELETE', path(clubId, `/billers/${id}`)),
      progress: ({ name }) => `Deleting ${name}…`,
      done: ({ name }) => `${name} deleted. Their expenses are kept.`,
    }),
    addExpense: useTracked({
      mutationFn: (expense: ExpenseInput) => api<void>('POST', path(clubId, '/expenses'), { body: expense }),
      progress: (e) => `Adding ${e.description.trim() || 'the expense'}…`,
      done: (e) => `Expense added: ${e.description.trim()}`,
    }),
    updateExpense: useTracked({
      mutationFn: ({ id, expense }: { id: string; expense: ExpenseInput }) => api<void>('PUT', path(clubId, `/expenses/${id}`), { body: expense }),
      progress: ({ expense }) => `Saving ${expense.description.trim() || 'the expense'}…`,
      done: ({ expense }) => `Expense saved: ${expense.description.trim()}`,
    }),
    addInvoice: useTracked({
      mutationFn: (invoice: ManualInvoiceInput) => api<void>('POST', path(clubId, '/invoices'), { body: invoice }),
      progress: (i) => `Creating ${i.title.trim() || 'the invoice'}…`,
      done: (i) => `Invoice created: ${i.title.trim()} for ${i.payers.length} ${i.payers.length === 1 ? 'payer' : 'payers'}`,
    }),
    deleteInvoice: useTracked({
      mutationFn: ({ id }: { id: string; title: string }) => api<void>('DELETE', path(clubId, `/invoices/${id}`)),
      progress: ({ title }) => `Deleting ${title}…`,
      done: ({ title }) => `Invoice deleted: ${title}`,
    }),
    deleteExpense: useTracked({
      mutationFn: ({ id }: { id: string; description: string }) => api<void>('DELETE', path(clubId, `/expenses/${id}`)),
      progress: ({ description }) => `Deleting ${description}…`,
      done: ({ description }) => `Expense deleted: ${description}`,
    }),
  }
}
