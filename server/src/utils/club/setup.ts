import type { ClubSetupItem, ClubView } from '@matchpoynt/shared'

/**
 * What a club has set up and what it's still missing, in the order to do it:
 * a handle, a description, photos, colours, a fee scheme (while fees are on), members
 * and a first session (planned or run).
 */
export function clubSetup(view: Omit<ClubView, 'setup'>, feesOn: boolean): ClubSetupItem[] {
  const { club } = view
  const items: ClubSetupItem[] = [
    // Clubs made before handles existed are asked for one.
    { id: 'handle', done: club.handle !== null },
    { id: 'description', done: Boolean(club.description) },
    { id: 'avatar', done: club.avatarUrl !== null },
    { id: 'cover', done: club.coverUrl !== null },
    { id: 'colors', done: club.theme !== null },
    ...(feesOn ? [{ id: 'fee' as const, done: club.fee !== null }] : []),
    { id: 'social', done: club.socialLinks.length > 0 },
    { id: 'members', done: view.members.length > 0 },
    { id: 'session', done: view.planned.length > 0 || view.sessions.length > 0 },
  ]
  return items
}
