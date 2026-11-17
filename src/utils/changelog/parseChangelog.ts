import type { ChangelogRelease } from '@/interfaces/Changelog'

const releaseLine = /^## \[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/

/**
 * Reads CHANGELOG.md (Keep a Changelog) into releases, newest first, for the
 * "What's new" dialog: each `## [version] - date`, its first paragraph, and
 * its `### Section` bullet lists. Only those shapes are read; anything else
 * is left out. An `[Unreleased]` section is skipped.
 */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = []
  let current: ChangelogRelease | null = null
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd()
    const release = releaseLine.exec(line)
    if (release) {
      current = release[1]!.toLowerCase() === 'unreleased' ? null : { version: release[1]!, date: release[2] ?? null, summary: null, sections: [] }
      if (current) releases.push(current)
      continue
    }
    if (!current) continue
    if (line.startsWith('### ')) current.sections.push({ title: line.slice(4).trim(), items: [] })
    else if (/^[-*] /.test(line) && current.sections.length) current.sections.at(-1)!.items.push(line.slice(2).trim())
    else if (line.trim() && !current.sections.length && current.summary === null) current.summary = line.trim()
  }
  return releases
}
