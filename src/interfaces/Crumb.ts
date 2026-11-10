/** One step of the app's breadcrumb trail. The last one is the page on screen and has no link. */
export interface Crumb {
  /** `null` while the name it shows is still loading. */
  label: string | null
  href?: string
}
