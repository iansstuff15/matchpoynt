import type { ProfileGamesResponse, ProfilePageView, ProfileRecordView, ProfileStatus } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import { removeMedia, uploadMedia } from '@/queries/clubs'
import { loadMemberHistories, loadProfile, loadProfileExtras, saveProfile, updateProfileExtras, usernameTaken } from '@/queries/profiles'
import { cleanPosition } from '@/utils/club/appearance'
import { checkImage, profileMediaPath, profileMediaUrl } from '@/utils/club/media'
import { ApiError, conflict, invalid } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body, currentUser, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { uploadedImage } from '@/utils/http/upload'
import { toWebp } from '@/utils/image/webp'
import { filterGames, pageOfGames, profileBadges, profileGames, profileRecord, profileStats } from '@/utils/profile/history'
import { assertValidProfile, usernameTakenError } from '@/utils/profile/rules'
import { profileStatus } from '@/utils/profile/status'
import { normalizeHandle } from '@/utils/social/handles'
import { cleanSocialLinks } from '@/utils/social/links'
import { photoPositionSchema, profileGamesQuery, profileSchema, socialLinksSchema } from '@/utils/validation/schemas'

/** The signed-in person, refusing guests (who have no profile). */
function person(c: Context<AppEnv>) {
  const user = currentUser(c)
  if (user.isAnonymous) throw new ApiError('forbidden', 'Guest sessions have no profile. Sign in with an account to create one.')
  return user
}

/** The signed-in person's profile and profile page. Completing it is part of signing in, so it follows the sign-in toggle. */
export const profileRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'signIn'))
  .use(resolveUser)
  .use(requireUser)
  .get('/', async (c) => {
    const response: ProfileStatus = await profileStatus(c.get('db'), person(c))
    return c.json(response)
  })
  .put('/', async (c) => {
    const user = person(c)
    const input = await body(c, profileSchema)
    assertValidProfile(input)
    if (await usernameTaken(c.get('db'), normalizeHandle(input.username), user.id)) throw usernameTakenError(input.username)
    await saveProfile(c.get('db'), input, new Date())
    const response: ProfileStatus = await profileStatus(c.get('db'), user)
    return c.json(response)
  })
  // The profile page: details, photo, links, clubs, record and badges. Games load a page at a time.
  .get('/page', async (c) => {
    const user = person(c)
    const db = c.get('db')
    const [profile, extras, { clubs, histories }] = await Promise.all([loadProfile(db, user.id), loadProfileExtras(db, user.id), loadMemberHistories(db)])
    const games = profileGames(histories)
    const response: ProfilePageView = {
      profile,
      email: user.email,
      avatarUrl: profileMediaUrl(extras.avatarPath),
      avatarPosition: extras.avatarPosition,
      socialLinks: extras.socialLinks,
      memberSince: extras.createdAt,
      clubs,
      stats: profileStats(histories, games),
      ...profileBadges(histories),
    }
    return c.json(response)
  })
  .get('/games', async (c) => {
    person(c)
    const parsed = profileGamesQuery.safeParse(c.req.query())
    if (!parsed.success) throw invalid('The games asked for are not valid. Reload the page.')
    const { before, ...filter } = parsed.data
    const { histories } = await loadMemberHistories(c.get('db'))
    const response: ProfileGamesResponse = pageOfGames(filterGames(profileGames(histories), filter), before ?? null)
    return c.json(response)
  })
  // Their record across every club, sport and session, and their badge collection.
  .get('/record', async (c) => {
    person(c)
    const { clubs, histories } = await loadMemberHistories(c.get('db'))
    const response: ProfileRecordView = profileRecord(histories, new Map(clubs.map((club) => [club.id, club.avatarUrl])))
    return c.json(response)
  })
  // The profile photo: stored as WebP in the person's own folder; the old one is deleted.
  .put('/avatar', async (c) => {
    const user = person(c)
    const db = c.get('db')
    const bytes = await uploadedImage(c)
    const webp = await toWebp(bytes, checkImage(bytes))
    const path = profileMediaPath(user.id, crypto.randomUUID())
    const old = (await loadProfileExtras(db, user.id)).avatarPath
    await uploadMedia(db, path, webp, 'image/webp')
    // A new photo starts centred.
    await updateProfileExtras(db, user.id, { avatar_path: path, avatar_position: null })
    await removeMedia(db, [old])
    return c.body(null, 204)
  })
  .put('/avatar/position', async (c) => {
    const user = person(c)
    const db = c.get('db')
    if (!(await loadProfileExtras(db, user.id)).avatarPath) throw conflict('Upload a photo before aligning it.')
    await updateProfileExtras(db, user.id, { avatar_position: cleanPosition(await body(c, photoPositionSchema)) })
    return c.body(null, 204)
  })
  .delete('/avatar', async (c) => {
    const user = person(c)
    const db = c.get('db')
    const old = (await loadProfileExtras(db, user.id)).avatarPath
    await updateProfileExtras(db, user.id, { avatar_path: null, avatar_position: null })
    await removeMedia(db, [old])
    return c.body(null, 204)
  })
  .put('/social', async (c) => {
    const user = person(c)
    const { links } = await body(c, socialLinksSchema)
    await updateProfileExtras(c.get('db'), user.id, { social_links: cleanSocialLinks(links) })
    return c.body(null, 204)
  })
