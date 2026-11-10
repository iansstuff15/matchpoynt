/** Which club photo an upload replaces. */
export type ClubImageKind = 'avatar' | 'cover'

/** Where a club's session stands, for its card on the club page. */
export type ClubSessionStatus = 'planned' | 'active' | 'ended'

/** Steps of the plan-a-session dialog: the setup steps plus the plan's own details. */
export type PlanStepId = 'details' | 'courts' | 'members' | 'scoring' | 'rules' | 'matchmaking'

/** Where a club badge's conditions count: one session's results, or every session the club has run. */
export type ClubBadgeScope = 'session' | 'career'

/** A number a club badge's condition checks (always "at least"). */
export type ClubBadgeMetric = 'wins' | 'played' | 'streak' | 'pointsFor' | 'pointDiff' | 'winRate' | 'sessions'

/** Where a club badge's icon came from. */
export type ClubBadgeIconSource = 'upload' | 'giphy'
