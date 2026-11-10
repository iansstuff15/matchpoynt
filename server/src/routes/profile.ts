import type { ProfileStatus } from '@matchpoynt/shared'
import { Hono } from 'hono'
import { saveProfile } from '@/queries/profiles'
import { ApiError } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body, currentUser, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { assertValidProfile } from '@/utils/profile/rules'
import { profileStatus } from '@/utils/profile/status'
import { profileSchema } from '@/utils/validation/schemas'

/** The signed-in person's profile. Completing it is part of signing in, so it follows the sign-in toggle. */
export const profileRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'signIn'))
  .use(resolveUser)
  .use(requireUser)
  .get('/', async (c) => {
    const user = currentUser(c)
    if (user.isAnonymous) throw new ApiError('forbidden', 'Guest sessions have no profile. Sign in with an account to create one.')
    const response: ProfileStatus = await profileStatus(c.get('db'), user)
    return c.json(response)
  })
  .put('/', async (c) => {
    const user = currentUser(c)
    if (user.isAnonymous) throw new ApiError('forbidden', 'Guest sessions have no profile. Sign in with an account to create one.')
    const input = await body(c, profileSchema)
    assertValidProfile(input)
    await saveProfile(c.get('db'), input, new Date())
    const response: ProfileStatus = await profileStatus(c.get('db'), user)
    return c.json(response)
  })
