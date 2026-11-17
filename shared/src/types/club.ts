/** Which club photo an upload replaces. */
export type ClubImageKind = 'avatar' | 'cover'

/** Where a club's session stands, for its card on the club page. */
export type ClubSessionStatus = 'planned' | 'active' | 'ended'

/** Steps of the plan-a-session dialog: the setup steps plus the plan's own details. */
export type PlanStepId = 'details' | 'courts' | 'members' | 'scoring' | 'rules' | 'matchmaking' | 'fees'

/** Where a club badge's conditions count: one session's results, or every session the club has run. */
export type ClubBadgeScope = 'session' | 'career'

/** A number a club badge's condition checks (always "at least"). */
export type ClubBadgeMetric = 'wins' | 'played' | 'streak' | 'pointsFor' | 'pointDiff' | 'winRate' | 'sessions'

/** Where a club badge's icon came from. */
export type ClubBadgeIconSource = 'upload' | 'giphy'

/** Something a club can set up: the dashboard asks for whatever is still missing. */
export type ClubSetupItemId = 'handle' | 'description' | 'avatar' | 'cover' | 'colors' | 'fee' | 'social' | 'members' | 'session'

/** `auto`: anyone who asks joins at once. `manual`: the owner approves each request. */
export type JoinApproval = 'auto' | 'manual'

/** Where someone stands with a club. */
export type ClubMembership = 'owner' | 'member' | 'requested' | 'invited' | 'none'

/** What a member does in the club, given by its owner. Every member starts as `member`. */
export type ClubMemberRole = 'member' | 'captain' | 'coach' | 'queue_master' | 'manager'

/** The kinds of question a club's feedback form can ask. */
export type FeedbackQuestionKind = 'rating' | 'choice' | 'yes_no' | 'text'

/** How members get onto a planned session (`planSignUpModes`). */
export type PlanSignUp = 'approval' | 'open'
