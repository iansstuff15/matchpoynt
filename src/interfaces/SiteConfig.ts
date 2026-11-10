export interface SiteConfig {
  name: string
  tagline: string
  description: string
  url: string
  version: string
  /** Shown in page titles: "Rankings · Matchpoynt". */
  titleSeparator: string
  /** sessionStorage keys, e.g. so the splash plays once per browser session. */
  sessionKeys: { splashSeen: string }
}
