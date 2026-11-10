import { site } from '@/config/site'

/** "Rankings · Matchpoynt", or the bare site name for the home page. */
export function pageTitle(title?: string): string {
  return title ? `${title}${site.titleSeparator}${site.name}` : `${site.name}${site.titleSeparator}${site.tagline}`
}
