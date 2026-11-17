import { randomUUID } from 'node:crypto'
import type { Locator, Page } from '@playwright/test'
import { closeClubSetup, openClubSettings } from '../support/club'
import { club, expect, test } from '../support/mockApi'
import { gotoReady, pageReady } from '../support/pageReady'
import { checkIn, chooseFee, courtCard, finishMatch, finishSession, setUpSession, setupDialog } from '../support/session'

/** A finished session's invoices card, on its page. */
const invoicesCard = (page: Page) => page.getByRole('region', { name: 'Invoices', exact: true })

/** The invoice table's row for a player. */
const invoiceRow = (scope: Locator, name: string) => scope.getByRole('row').filter({ has: scope.page().getByText(name, { exact: true }) })

test.describe('fees and invoices', () => {
  test('a session with a base price plus per-game fee invoices everyone who came, and payments are tracked', async ({ page }) => {
    await setUpSession(page, {
      players: ['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fay'],
      fees: (dialog) => chooseFee(dialog, { kind: 'Base price + per game', currency: 'USD', base: '10', perGame: '2.50' }),
    })
    // Fay never checks in, so she isn't invoiced.
    await checkIn(page, ['Ana', 'Ben', 'Cy', 'Dee', 'Eve'])
    await courtCard(page, 'Court 1').getByRole('button', { name: 'Start next match' }).click()
    await pageReady(page)
    const [winners, losers] = await finishMatch(page, 'Court 1', [
      [21, 11],
      [21, 13],
    ])
    const played = [...winners, ...losers]
    const waited = ['Ana', 'Ben', 'Cy', 'Dee', 'Eve'].find((name) => !played.includes(name))!
    await finishSession(page)

    // The session's page lists one invoice per player who came: base price, plus their game.
    const card = invoicesCard(page)
    await expect(card).toBeVisible()
    await expect(card).toContainText('Fee: $10.00, plus $2.50 per game')
    for (const name of played) await expect(invoiceRow(card, name)).toContainText('$12.50')
    await expect(invoiceRow(card, waited)).toContainText('$10.00')
    await expect(invoiceRow(card, 'Fay')).toHaveCount(0)
    await expect(card).toContainText('$60.00 owed')
    await expect(card).toContainText('$0.00 of $60.00 collected · 0 of 5 players paid')

    // Marking one paid updates what's collected and still owed.
    // The box shows the change once the API has it, so click and wait for it rather than `check()`.
    const paidBox = card.getByRole('checkbox', { name: `${played[0]} paid $12.50` })
    await paidBox.click()
    await expect(paidBox).toBeChecked()
    await expect(page.getByText(`${played[0]} paid in full`, { exact: true })).toBeVisible()
    await expect(card).toContainText('$12.50 of $60.00 collected · 1 of 5 players paid')
    await expect(card).toContainText('$47.50 owed')

    // Unticking marks it unpaid again; there's no separate invoices page, the session's page holds them.
    await paidBox.click()
    await expect(paidBox).not.toBeChecked()
    await expect(card).toContainText('0 of 5 players paid')
    await expect(card).toContainText('$60.00 owed')
    await gotoReady(page, '/app/invoices')
    await expect(page).toHaveURL('/app')
  })

  test("a club's saved fee is offered when setting up a session", async ({ page, api }) => {
    const id = randomUUID()
    api.clubs.seed(club(id, 'Smash Club'))
    await gotoReady(page, `/clubs/${id}`)
    await closeClubSetup(page)
    const settings = await openClubSettings(page, 'Fees')
    await chooseFee(settings, { kind: 'Fixed', base: '150' })
    await settings.getByRole('button', { name: 'Save fee' }).click()
    await expect(settings).toContainText('Saved: ₱150.00 per player')
    await page.keyboard.press('Escape')

    await setUpSession(page, {
      players: ['Ana'],
      fees: async (dialog) => {
        await dialog.getByRole('button', { name: "Use Smash Club's fee: ₱150.00 per player" }).click()
        await expect(dialog.getByRole('radio', { name: /^Fixed/ })).toBeChecked()
        await expect(dialog.getByLabel('Fee per player', { exact: true })).toHaveValue('150')
      },
    })
    await checkIn(page, ['Ana'])
    await finishSession(page)
    await expect(invoiceRow(invoicesCard(page), 'Ana')).toContainText('₱150.00')
  })

  test('a fee without an amount keeps the session from starting until it is filled in', async ({ page }) => {
    await gotoReady(page, '/app?new=1')
    const dialog = setupDialog(page)
    await dialog.getByRole('button', { name: /Step 6: Fees/ }).click()
    await chooseFee(dialog, { kind: 'Per game' })
    await expect(dialog.getByRole('status').filter({ hasText: 'Enter the price per game.' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Start session' })).toBeDisabled()
    await chooseFee(dialog, { kind: 'Per game', perGame: '50' })
    await expect(dialog.getByRole('button', { name: 'Start session' })).toBeEnabled()
  })

  test('with fees switched off there is no Fees step or club fee', async ({ page, api }) => {
    api.state.features.web.fees = false
    const id = randomUUID()
    api.clubs.seed(club(id, 'Smash Club'))
    await gotoReady(page, '/app?new=1')
    const dialog = setupDialog(page)
    await expect(dialog.getByRole('button', { name: /Step 5: Matchmaking/ })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Fees/ })).toHaveCount(0)

    await gotoReady(page, `/clubs/${id}`)
    await closeClubSetup(page)
    const settings = await openClubSettings(page)
    await expect(settings.getByRole('navigation', { name: 'Club settings' }).getByRole('button', { name: /Fees/ })).toHaveCount(0)
  })
})
