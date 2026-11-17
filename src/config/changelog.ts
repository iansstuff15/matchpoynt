import changelogMarkdown from '../../CHANGELOG.md?raw'
import { parseChangelog } from '@/utils/changelog/parseChangelog'

/** Every release in CHANGELOG.md, newest first, bundled with the app (no request needed). */
export const releases = parseChangelog(changelogMarkdown)

/** The newest release: the one "What's new" opens on, and the one remembered as seen. */
export const latestRelease = releases[0] ?? null
