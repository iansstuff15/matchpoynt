/** One group of changes in a release ("Added", "Changed", …). */
export interface ChangelogSection {
  title: string
  items: string[]
}

/** One release in CHANGELOG.md: `## [0.2.0] - 2026-11-11`, an intro line and its sections. */
export interface ChangelogRelease {
  version: string
  /** The release day as written (YYYY-MM-DD), or `null` when it has none. */
  date: string | null
  summary: string | null
  sections: ChangelogSection[]
}
