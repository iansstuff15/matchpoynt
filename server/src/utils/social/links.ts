import { socialLimits, socialPlatforms, type SocialLink } from '@matchpoynt/shared'
import { invalid } from '@/utils/http/errors'

// Social and web links on clubs and profiles: what a valid list looks like.

/** The address as saved: https:// added when it has no scheme. `null` when it isn't a web address at all. */
export function tidyUrl(raw: string): URL | null {
  const text = raw.trim()
  if (!text) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

const onHost = (url: URL, hosts: string[]) => hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))

/**
 * Checks a list of links: up to `socialLimits.maxLinks`, each a web address on
 * its platform's site (any site for `website`), nothing twice. Returns them
 * tidied (https, as typed otherwise). Throws `invalid` keyed `links`.
 */
export function cleanSocialLinks(links: SocialLink[]): SocialLink[] {
  const fail = (message: string): never => {
    throw invalid(message, { links: message })
  }
  if (links.length > socialLimits.maxLinks) fail(`Add up to ${socialLimits.maxLinks} links.`)
  const cleaned = links.map((link) => {
    const platform = socialPlatforms[link.platform]
    if (!platform) return fail('Pick what kind of link each one is.')
    const url = tidyUrl(link.url)
    if (!url || link.url.trim().length > socialLimits.urlMaxLength) return fail(`"${link.url.trim() || '(empty)'}" isn't a web address. Paste the full link to the page.`)
    if (url.protocol === 'http:') url.protocol = 'https:'
    if (platform.hosts.length && !onHost(url, platform.hosts)) return fail(`That ${platform.label} link isn't on ${platform.hosts[0]}. Check you picked the right kind of link.`)
    return { platform: link.platform, url: url.toString() }
  })
  const urls = cleaned.map((l) => l.url.toLowerCase())
  if (new Set(urls).size !== urls.length) fail('Each link can be added once.')
  return cleaned
}

/** Links as stored, skipping anything unreadable. */
export function socialLinksOf(stored: unknown): SocialLink[] {
  if (!Array.isArray(stored)) return []
  return stored.filter((l): l is SocialLink => typeof l?.url === 'string' && l.platform in socialPlatforms)
}
