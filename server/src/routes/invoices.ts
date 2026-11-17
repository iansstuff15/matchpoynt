import type { InvoiceGroupResponse } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import { loadInvoiceGroup, loadSessionInvoice, saveSessionInvoicePayments } from '@/queries/invoices'
import { markedPaid, withPayment, withoutPayment, type PaymentRecord } from '@/utils/fees/payments'
import { conflict, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body, requireCompleteProfile, requireSessionRunner, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { invoicePaidSchema, invoicePaymentSchema, uuidParam } from '@/utils/validation/schemas'

function idParam(c: Context, name: string): string {
  const parsed = uuidParam.safeParse(c.req.param(name))
  if (!parsed.success) throw notFound('Not found.')
  return parsed.data
}

const sessionNotFound = () => notFound('Session not found. The link may be wrong, or the session belongs to another account.')

/** The group, or why there isn't one: still running (409) or not the caller's (404). */
async function groupOrFail(c: Context<AppEnv>, sessionId: string): Promise<InvoiceGroupResponse> {
  const group = await loadInvoiceGroup(c.get('db'), sessionId)
  if (group === undefined) throw sessionNotFound()
  return { group }
}

/**
 * Invoices of finished sessions: written when a session ends (from its fee),
 * then paid in parts (a downpayment, then the rest) or in full, in cash or
 * online, or marked unpaid. Every change answers with the session's invoices.
 */
export const invoiceRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'fees'))
  .use(resolveUser)
  .use(requireUser)
  .use(requireCompleteProfile)
  .use(requireSessionRunner)
  .get('/:sessionId', async (c) => c.json(await groupOrFail(c, idParam(c, 'sessionId'))))
  // Paid in full (what's left, by `method`) or unpaid (its payments cleared).
  .put('/:sessionId/:invoiceId', async (c) => {
    const { paid, method } = await body(c, invoicePaidSchema)
    return changePayments(c, (invoice) => markedPaid(invoice.amount, invoice.payments, paid, method ?? 'cash', crypto.randomUUID(), new Date()))
  })
  // A payment towards it: a downpayment, part of it, or the rest.
  .post('/:sessionId/:invoiceId/payments', async (c) => {
    const input = await body(c, invoicePaymentSchema)
    return changePayments(c, (invoice) => withPayment(invoice.amount, invoice.payments, input, invoice.currency, crypto.randomUUID(), new Date()))
  })
  // A payment recorded by mistake.
  .delete('/:sessionId/:invoiceId/payments/:paymentId', async (c) => {
    const paymentId = idParam(c, 'paymentId')
    return changePayments(c, (invoice) => withoutPayment(invoice.amount, invoice.payments, paymentId))
  })

/** Loads one invoice, applies the change to its payments, saves, and answers with the session's invoices. */
async function changePayments(c: Context<AppEnv>, change: (invoice: NonNullable<Awaited<ReturnType<typeof loadSessionInvoice>>>) => PaymentRecord) {
  const sessionId = idParam(c, 'sessionId')
  const invoiceId = idParam(c, 'invoiceId')
  const invoice = await loadSessionInvoice(c.get('db'), sessionId, invoiceId)
  if (!invoice) throw notFound('That invoice no longer exists. The session may have been deleted on another device.')
  await saveSessionInvoicePayments(c.get('db'), sessionId, invoiceId, change(invoice))
  const response = await groupOrFail(c, sessionId)
  if (!response.group) throw conflict('This session has no fee, so it has no invoices.')
  return c.json(response)
}
