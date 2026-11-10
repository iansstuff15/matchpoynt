import { expect, type Page } from '@playwright/test'
import { pageReady } from './pageReady'
import { courtCard } from './session'

export interface NewTournament {
  name: string
  /** Players to leave out of the draw (the setup ticks every checked-in player). */
  leaveOut?: string[]
}

/** Switches `court` to tournament play and sets up a single-elimination tournament there. */
export async function startTournament(page: Page, court: string, { name, leaveOut = [] }: NewTournament) {
  await courtCard(page, court).getByRole('switch', { name: `Tournament play on ${court}` }).click()
  const dialog = page.getByRole('dialog', { name: 'Set up a tournament' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Tournament name').fill(name)
  await dialog.getByRole('radio', { name: /Single elimination/ }).check()
  for (const player of leaveOut) await dialog.getByRole('checkbox', { name: player, exact: true }).uncheck()
  await dialog.getByRole('button', { name: `Start tournament on ${court}` }).click()
  await expect(dialog).toBeHidden()
  await pageReady(page)
  await expect(page.getByRole('tab', { name: 'Tournament' })).toBeVisible()
}

/** Starts the tournament match due on `court` (its button names it, e.g. "Start Semifinal 1"). */
export async function startDueMatch(page: Page, court: string, label: string) {
  await courtCard(page, court).getByRole('button', { name: `Start ${label}` }).click()
  await pageReady(page)
  await expect(courtCard(page, court).getByRole('button', { name: 'Finish match' })).toBeVisible()
}
