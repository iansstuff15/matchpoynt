import { directoryLimits, type ClubJoiningInput, type WelcomeLink } from '@matchpoynt/shared'
import { invalid } from '@/utils/http/errors'
import { tidyUrl } from '@/utils/social/links'

// How people join a club, and the welcome they get: what a valid setting
// looks like. Pure; the routes and the joining functions do the rest.

/** Checks the joining settings: an approval mode, a welcome message within its limit, and labelled web links. */
export function cleanJoining(input: ClubJoiningInput): ClubJoiningInput {
  const fail = (field: string, message: string): never => {
    throw invalid(message, { [field]: message })
  }
  const message = input.welcomeMessage?.trim() || null
  if (message && message.length > directoryLimits.welcomeMaxLength) fail('welcomeMessage', `The welcome message can be up to ${directoryLimits.welcomeMaxLength} characters.`)
  if (input.welcomeLinks.length > directoryLimits.welcomeLinks) fail('welcomeLinks', `Share up to ${directoryLimits.welcomeLinks} links.`)
  const links: WelcomeLink[] = input.welcomeLinks.map((link) => {
    const label = link.label.trim()
    if (!label) return fail('welcomeLinks', 'Give every link a name, like "Group chat".')
    if (label.length > directoryLimits.linkLabelMaxLength) return fail('welcomeLinks', `Link names can be up to ${directoryLimits.linkLabelMaxLength} characters.`)
    const url = tidyUrl(link.url)
    if (!url) return fail('welcomeLinks', `"${link.url.trim() || '(empty)'}" isn't a web address. Paste the full link.`)
    if (url.protocol === 'http:') url.protocol = 'https:'
    return { label, url: url.toString() }
  })
  return { approval: input.approval === 'auto' ? 'auto' : 'manual', welcomeMessage: message, welcomeLinks: links }
}

/** Joining settings as stored, with defaults for anything missing. */
export function joiningOf(row: { join_approval: string; welcome_message: string | null; welcome_links: unknown }): ClubJoiningInput {
  const links = Array.isArray(row.welcome_links) ? (row.welcome_links as WelcomeLink[]).filter((l) => typeof l?.label === 'string' && typeof l?.url === 'string') : []
  return { approval: row.join_approval === 'auto' ? 'auto' : 'manual', welcomeMessage: row.welcome_message, welcomeLinks: links }
}
