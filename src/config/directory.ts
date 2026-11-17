import type { ClubMembership } from '@matchpoynt/shared'

/** How each membership reads on a club's card and page. */
export const membershipLabels: Record<ClubMembership, string> = {
  owner: 'Your club',
  member: 'Member',
  requested: 'Request sent',
  invited: 'Invited',
  none: '',
}

/** Club cards shown while the directory loads. */
export const directorySkeletonCards = 6
