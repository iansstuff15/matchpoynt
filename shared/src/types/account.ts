/** How someone uses Matchpoynt. Queue Masters run sessions; players join them. */
export type AccountRole = 'queue_master' | 'player' | 'both'

/** Steps of the sign-up / complete-profile form. Server errors are keyed by these. */
export type SignUpStepId = 'account' | 'profile' | 'sports' | 'agreements'

/** Profile fields the API requires before someone can use the app. */
export type ProfileField = 'firstName' | 'lastName' | 'displayName' | 'role' | 'terms' | 'sports'
