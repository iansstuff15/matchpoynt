import type { Page } from '@playwright/test'
import { appNav } from '../support/appShell'
import { createClub, openClubPage } from '../support/club'
import { expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { checkIn, chooseFee, finishSession, setUpSession } from '../support/session'

/** Picks an option from a labelled shadcn Select. */
async function pick(page: Page, label: string, option: string | RegExp) {
  await page.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option }).click()
}

async function addBiller(page: Page, name: string, contact = '') {
  await page.getByRole('button', { name: 'Add biller' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a biller' })
  await dialog.getByLabel('Name').fill(name)
  if (contact) await dialog.getByLabel('Contact (optional)').fill(contact)
  await dialog.getByRole('button', { name: 'Add biller' }).click()
  return dialog
}

async function addExpense(page: Page, { description, amount, biller, session }: { description: string; amount: string; biller?: string; session?: RegExp }) {
  await page.getByRole('button', { name: 'Add expense' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add an expense' })
  await dialog.getByLabel('What was it for?').fill(description)
  await dialog.getByLabel('Amount', { exact: true }).fill(amount)
  if (biller) await pick(page, 'Biller', biller)
  if (session) {
    await dialog.getByRole('radio', { name: /^A session/ }).check()
    await pick(page, 'Session', session)
  }
  await dialog.getByRole('button', { name: 'Add expense' }).click()
  await expect(dialog).toBeHidden()
  await pageReady(page)
}

const tile = (page: Page, label: string) => page.locator('[data-slot="card"]').filter({ has: page.getByText(label, { exact: true }) }).first()

test.describe('club accounting', () => {
  test('billers can be listed, edited and deleted; names must differ', async ({ page }) => {
    await createClub(page, 'Ledger Club')
    await openClubPage(page, 'Billers')
    await expect(page.getByText('No billers yet')).toBeVisible()

    await addBiller(page, 'City Sports Hall', 'bookings@cityhall.test')
    await pageReady(page)
    await expect(page.getByRole('row', { name: /City Sports Hall/ })).toContainText('bookings@cityhall.test')

    const again = await addBiller(page, 'city sports hall')
    await expect(again.getByRole('alert')).toContainText("There's already a biller called city sports hall.")
    await again.getByRole('button', { name: 'Cancel' }).click()

    await page.getByRole('button', { name: 'Edit City Sports Hall' }).click()
    const edit = page.getByRole('dialog', { name: 'Edit City Sports Hall' })
    await edit.getByLabel('Name').fill('City Hall Courts')
    await edit.getByRole('button', { name: 'Save biller' }).click()
    await expect(edit).toBeHidden()
    await pageReady(page)
    await expect(page.getByRole('row', { name: /City Hall Courts/ })).toBeVisible()

    await page.getByRole('button', { name: 'Delete City Hall Courts' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete biller' }).click()
    await pageReady(page)
    await expect(page.getByText('No billers yet')).toBeVisible()
  })

  test('expenses and session invoices add up on the dashboard, by month, session and biller, within the dates picked', async ({ page, api }) => {
    await createClub(page, 'Ledger Club')
    const clubId = api.clubs.idOf('Ledger Club')

    // A club session charging ₱150 each; Ana pays, Ben still owes.
    await setUpSession(page, { players: ['Ana', 'Ben'], fees: (dialog) => chooseFee(dialog, { kind: 'Fixed', currency: 'PHP', base: '150' }) })
    api.sessions.assignClub(api.sessions.latestId(), clubId)
    await checkIn(page, ['Ana', 'Ben'])
    await finishSession(page)
    const paid = page.getByRole('region', { name: 'Invoices', exact: true }).getByRole('checkbox', { name: 'Ana paid ₱150.00' })
    await paid.click()
    await expect(paid).toBeChecked()

    await gotoReady(page, `/clubs/${clubId}/billers`)
    await addBiller(page, 'City Sports Hall')
    await pageReady(page)

    // One expense for the session, paid to the hall; one for the whole club.
    await openClubPage(page, 'Expenses')
    await addExpense(page, { description: 'Court hire', amount: '100', biller: 'City Sports Hall', session: /^Badminton session/ })
    await addExpense(page, { description: 'Shuttles', amount: '50' })
    await expect(page.getByText('2 expenses ·')).toBeVisible()
    await expect(page.getByText('Total ₱150.00')).toBeVisible()
    await expect(page.getByRole('row', { name: /Court hire/ })).toContainText('City Sports Hall')
    await pick(page, 'For', 'Club-wide only')
    await expect(page.getByText('1 expense ·')).toBeVisible()
    await expect(page.getByRole('row', { name: /Shuttles/ })).toContainText('Whole club')

    // The dashboard: ₱150 collected of ₱300 invoiced, less ₱150 spent.
    await openClubPage(page, 'Accounting')
    await expect(tile(page, 'Net earnings')).toContainText('₱0.00')
    await expect(tile(page, 'Collected')).toContainText('₱150.00')
    await expect(tile(page, 'Collected')).toContainText('Of ₱300.00 invoiced')
    await expect(tile(page, 'Spent')).toContainText('₱150.00')
    await expect(tile(page, 'Spent')).toContainText('₱50.00 club-wide')
    await expect(tile(page, 'Still owed')).toContainText('₱150.00')
    // The session made ₱150 and cost ₱100 itself.
    await expect(page.getByRole('table', { name: 'Earnings by session' }).getByRole('row', { name: /Badminton session/ })).toContainText('₱50.00')
    const billers = page.getByRole('list', { name: 'Spending by biller' }).getByRole('listitem')
    await expect(billers.nth(0)).toContainText('City Sports Hall')
    await expect(billers.nth(0)).toContainText('₱100.00')
    await expect(billers.nth(1)).toContainText('No biller')
    // This month's row and its bar, with the figures on focus.
    const month = new Date().toLocaleString('en', { month: 'short', year: 'numeric' })
    await expect(page.getByRole('table', { name: 'Earnings by month' }).getByRole('row', { name: new RegExp(month) })).toContainText('₱150.00')
    await page.getByRole('listitem', { name: new RegExp(`^${month}: collected ₱150.00, spent ₱150.00, net ₱0.00`) }).focus()

    // Last month had nothing. The filter is in the address, and this browser keeps it on the Expenses page.
    await pick(page, 'Period', 'Last month')
    await pageReady(page)
    await expect(page).toHaveURL(/period=last-month/)
    await expect(tile(page, 'Collected')).toContainText('₱0.00')
    await expect(tile(page, 'Spent')).toContainText('₱0.00')
    await openClubPage(page, 'Expenses')
    await expect(page.getByRole('combobox', { name: 'Period' })).toHaveText('Last month')
    await expect(page.getByText('No expenses for these filters')).toBeVisible()
  })

  test('a manual invoice outside sessions: what it is for, a total split between members and a guest, each ticked off as they pay', async ({ page }) => {
    await createClub(page, 'Ledger Club')
    await openClubPage(page, 'Members')
    for (const name of ['Ana Cruz', 'Ben Lim']) {
      await page.getByRole('button', { name: 'Add member' }).click()
      const add = page.getByRole('dialog', { name: 'Add a member' })
      await add.getByLabel('Name').fill(name)
      await add.getByRole('button', { name: 'Add member' }).click()
      await expect(add).toBeHidden()
      await pageReady(page)
    }

    await openClubPage(page, 'Invoices')
    await page.getByRole('button', { name: 'New invoice' }).click()
    const dialog = page.getByRole('dialog', { name: 'New invoice' })
    await dialog.getByLabel('What is it for?').fill('Club shirts')
    await dialog.getByLabel('Amount', { exact: true }).fill('1000')
    await dialog.getByRole('radio', { name: /^A total to split/ }).check()
    await dialog.getByRole('button', { name: 'Every member' }).click()
    await dialog.getByLabel('Someone else').fill('Guest Player')
    await dialog.getByRole('button', { name: 'Add payer' }).click()
    await expect(dialog.getByText('Who pays · 3 payers')).toBeVisible()
    await dialog.getByRole('button', { name: 'Create invoice' }).click()
    await expect(dialog).toBeHidden()
    await pageReady(page)

    // The list shows it; its own page has every payer. ₱1,000 shared three ways: the odd centavo goes to the first payer.
    await expect(page.getByRole('row', { name: /Club shirts/ })).toContainText('₱1,000.00 owed')
    await page.getByRole('link', { name: 'Club shirts: open its invoice' }).click()
    await pageReady(page)
    await expect(page).toHaveURL(/\/invoices\/manual\/[0-9a-f-]{36}$/)
    const card = page.getByRole('region', { name: 'Club shirts' })
    await expect(card).toContainText('₱1,000.00 split between 3 payers')
    await expect(card.getByRole('row', { name: /Ana Cruz/ })).toContainText('₱333.34')
    await expect(card.getByRole('row', { name: /Guest Player/ })).toContainText('₱333.33')
    await expect(card).toContainText('₱1,000.00 owed')

    const paid = card.getByRole('checkbox', { name: 'Guest Player paid ₱333.33' })
    await paid.click()
    await expect(paid).toBeChecked()
    await expect(card).toContainText('₱333.33 of ₱1,000.00 collected · 1 of 3 payers paid')

    // Ben pays part of his share online: a payment in part, tagged online.
    await card.getByRole('button', { name: "Ben Lim's payments" }).click()
    const payments = page.getByRole('dialog', { name: "Ben Lim's payments" })
    await payments.getByLabel('Amount paid').fill('100')
    await payments.getByRole('radio', { name: 'Online' }).check()
    await payments.getByRole('button', { name: 'Record payment' }).click()
    await pageReady(page)
    await expect(payments.getByRole('list', { name: 'Payments by Ben Lim' })).toContainText('Online')
    await expect(payments).toContainText('₱233.33 left')
    await payments.getByRole('button', { name: 'Close' }).click()
    await expect(card).toContainText('₱433.33 of ₱1,000.00 collected · 1 of 3 payers paid, 1 in part')
    await page.getByRole('link', { name: 'All invoices' }).click()
    await pageReady(page)

    // It counts on the accounting dashboard, outside any session.
    await openClubPage(page, 'Accounting')
    await expect(tile(page, 'Collected')).toContainText('₱433.33')
    await expect(tile(page, 'Collected')).toContainText('Of ₱1,000.00 invoiced')
    await expect(tile(page, 'Still owed')).toContainText('₱566.67')

    // And can be deleted from its page, after a confirmation.
    await openClubPage(page, 'Invoices')
    await page.getByRole('link', { name: 'Club shirts: open its invoice' }).click()
    await pageReady(page)
    await page.getByRole('button', { name: 'Delete Club shirts' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete invoice' }).click()
    await pageReady(page)
    await expect(page.getByText('No invoices in this period')).toBeVisible()
  })

  test('a manual invoice needs payers', async ({ page }) => {
    await createClub(page, 'Ledger Club')
    await openClubPage(page, 'Invoices')
    await page.getByRole('button', { name: 'New invoice' }).click()
    const dialog = page.getByRole('dialog', { name: 'New invoice' })
    await dialog.getByLabel('What is it for?').fill('Dues')
    await dialog.getByLabel('Amount', { exact: true }).fill('50')
    await dialog.getByRole('button', { name: 'Create invoice' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Add who pays')
  })

  test('an expense needs a description and an amount', async ({ page }) => {
    await createClub(page, 'Ledger Club')
    await openClubPage(page, 'Expenses')
    await page.getByRole('button', { name: 'Add expense' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add an expense' })
    await dialog.getByRole('button', { name: 'Add expense' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Say what the expense was for.')
  })

  test('with accounting switched off there are no invoices, expenses, billers or accounting', async ({ page, api }) => {
    api.state.features.web.accounting = false
    await createClub(page, 'Ledger Club')
    for (const name of ['Invoices', 'Expenses', 'Billers', 'Accounting']) await expect(appNav(page).getByRole('link', { name, exact: true })).toHaveCount(0)
    // Their addresses aren't pages either.
    await gotoReady(page, `/clubs/${api.clubs.idOf('Ledger Club')}/expenses`)
    await expect(page.getByRole('heading', { name: 'Out of bounds' })).toBeVisible()
  })
})
