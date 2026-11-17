import { expect, type Locator, type Page } from '@playwright/test'
import { gotoReady, pageReady } from './pageReady'

/** A player to add: just a name (the form's tier, its default check-in), or a name with a tier label ("Advanced") and/or whether they're already checked in. */
export type NewPlayer = string | { name: string; tier?: string; checkedIn?: boolean }

const nameOf = (player: NewPlayer) => (typeof player === 'string' ? player : player.name)

export interface SetupOptions {
  players: NewPlayer[]
  /** Turn on "Fill courts automatically" on the Rules step. */
  autoFill?: boolean
  /** Fills in the Fees step (no fee when left out). */
  fees?: (dialog: Locator) => Promise<void>
}

/** The setup or settings dialog. */
export const setupDialog = (page: Page, name: 'Set up your session' | 'Session settings' = 'Set up your session') =>
  page.getByRole('dialog', { name })

/** A court card on the board, by its label ("Court 1"). */
export const courtCard = (page: Page, label: string) => page.locator('.court-card').filter({ has: page.getByText(label, { exact: true }) })

/** The queue panel beside the board. */
export const queuePanel = (page: Page) => page.getByRole('complementary', { name: 'Queue' })

/** Adds a player through an "Add a player" form (setup's Members step or the board's), picking their tier if given. */
export async function addPlayer(scope: Locator, player: NewPlayer, button: 'Add player' | 'Add to queue') {
  const form = scope.getByRole('form', { name: 'Add a player' })
  await form.getByLabel('Player name').fill(nameOf(player))
  if (typeof player !== 'string' && player.tier) {
    await form.getByRole('combobox', { name: 'Skill tier' }).click()
    await scope.page().getByRole('option', { name: player.tier, exact: true }).click()
    await expect(form.getByRole('combobox', { name: 'Skill tier' })).toHaveText(player.tier)
  }
  if (typeof player !== 'string' && player.checkedIn !== undefined) {
    await form.getByRole('checkbox', { name: 'Already checked in' }).setChecked(player.checkedIn)
  }
  // No Escape to dismiss suggestions: inside the setup dialog it would close the dialog. The mock has no club members to suggest.
  await form.getByRole('button', { name: button }).click()
}

/** Walks the six setup steps from "New session" (/app?new=1, which works whatever else exists) and starts the session; resolves once its board has loaded. */
export async function setUpSession(page: Page, { players, autoFill = false, fees }: SetupOptions) {
  await gotoReady(page, '/app?new=1')
  const dialog = setupDialog(page)
  await expect(dialog).toBeVisible()

  await expect(dialog.getByRole('heading', { name: 'Courts' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Next' }).click()

  await expect(dialog.getByRole('heading', { name: 'Members' })).toBeVisible()
  for (const player of players) {
    await addPlayer(dialog, player, 'Add player')
    await expect(dialog.getByRole('button', { name: `Remove ${nameOf(player)}` })).toBeAttached()
  }
  await expect(dialog.getByText(`${players.length} players`)).toBeVisible()
  await dialog.getByRole('button', { name: 'Next' }).click()

  await expect(dialog.getByRole('heading', { name: 'Scoring' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Next' }).click()

  await expect(dialog.getByRole('heading', { name: 'Rules' })).toBeVisible()
  if (autoFill) await dialog.getByLabel('Fill courts automatically').check()
  await dialog.getByRole('button', { name: 'Next' }).click()

  await expect(dialog.getByRole('heading', { name: 'Matchmaking' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Next' }).click()

  await expect(dialog.getByRole('heading', { name: 'Fees' })).toBeVisible()
  await fees?.(dialog)
  await dialog.getByRole('button', { name: 'Start session' }).click()

  await expect(page).toHaveURL(/\/app\/[0-9a-f-]{36}$/)
  await expect(dialog).toBeHidden()
  await pageReady(page)
}

/** Checks players in from the queue card's "still to check in" list. */
export async function checkIn(page: Page, names: string[]) {
  for (const name of names) {
    await queuePanel(page).getByRole('button', { name: `Check ${name} in` }).click()
    await expect(queuePanel(page).getByRole('button', { name: `Check ${name} in` })).toHaveCount(0)
  }
}

/** The names on a playing court, both sides. */
export async function playersOn(page: Page, court: string) {
  const names: string[] = []
  for (const side of [1, 2]) names.push(...(await page.getByRole('list', { name: `${court}, side ${side}` }).getByRole('listitem').allInnerTexts()))
  return names.map((n) => n.trim())
}

/** Finishes the match on `court` with these game scores; returns the two sides' names as the dialog showed them. */
export async function finishMatch(page: Page, court: string, games: [number, number][]) {
  await courtCard(page, court).getByRole('button', { name: 'Finish match' }).click()
  const dialog = page.getByRole('dialog', { name: `Finish match on ${court}` })
  await expect(dialog).toBeVisible()
  const headers = dialog.getByRole('columnheader')
  const sides = [await headers.nth(1).innerText(), await headers.nth(2).innerText()] as [string, string]
  for (const [i, [a, b]] of games.entries()) {
    await dialog.getByLabel(`Game ${i + 1}, ${sides[0]} points`).fill(String(a))
    await dialog.getByLabel(`Game ${i + 1}, ${sides[1]} points`).fill(String(b))
  }
  await dialog.getByRole('button', { name: 'Save result' }).click()
  await expect(dialog).toBeHidden()
  await pageReady(page)
  return sides.map((side) => side.split(' & ')) as [string[], string[]]
}

/** A player's place on the leaderboard: their podium card or table row. */
export const standing = (page: Page, name: string) =>
  page
    .getByRole('listitem', { name: new RegExp(`^Place \\d+: ${name}$`) })
    .or(page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) }))

/** Opens the session's Leaderboard tab and waits for the rankings. */
export async function openLeaderboard(page: Page) {
  await page.getByRole('tab', { name: 'Leaderboard' }).click()
  await pageReady(page)
  await expect(page.getByRole('list', { name: 'Top three' })).toBeVisible()
}

/** Back to the courts and queue. */
export async function openManagement(page: Page) {
  await page.getByRole('tab', { name: 'Management' }).click()
  await pageReady(page)
}

/** Picks a fee on the Fees step (setup, plan or club card): its kind, currency, and the amounts its kind asks for. */
export async function chooseFee(scope: Locator, fee: { kind: 'Fixed' | 'Per game' | 'Base price + per game'; currency?: string; base?: string; perGame?: string }) {
  // A radio's name is its title then its description, and "Per game" is also inside "Base price + per game".
  await scope.getByRole('radio', { name: new RegExp(`^${fee.kind.replace(/[+]/g, '\\+')}`) }).check()
  if (fee.currency) {
    await scope.getByRole('combobox', { name: 'Currency' }).click()
    await scope.page().getByRole('option', { name: new RegExp(`^${fee.currency} ·`) }).click()
    await expect(scope.getByRole('combobox', { name: 'Currency' })).toContainText(fee.currency)
  }
  if (fee.base !== undefined) await scope.getByLabel(fee.kind === 'Fixed' ? 'Fee per player' : 'Base price', { exact: true }).fill(fee.base)
  if (fee.perGame !== undefined) await scope.getByLabel('Price per game', { exact: true }).fill(fee.perGame)
}

/** Finishes the session from the board's header (confirmed first) and waits for its "ended" page. */
export async function finishSession(page: Page) {
  await page.getByRole('button', { name: 'Finish session' }).first().click()
  const confirm = page.getByRole('alertdialog', { name: 'Finish this session?' })
  await confirm.getByRole('button', { name: 'Finish session' }).click()
  await expect(confirm).toBeHidden()
  await pageReady(page)
  await expect(page.getByText(/Session ended|ended$/).first()).toBeVisible()
}
