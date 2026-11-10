import type { PlannedSessionView } from '@matchpoynt/shared'

// Wording for club manager toasts. Errors never come here: they go to an error banner.

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const planSummary = (plan: Pick<PlannedSessionView, 'courts' | 'memberIds'>) =>
  `${count(plan.courts.length, 'court')} · ${count(plan.memberIds.length, 'player')}`

export const photoLabel = { avatar: 'profile photo', cover: 'cover photo' } as const
