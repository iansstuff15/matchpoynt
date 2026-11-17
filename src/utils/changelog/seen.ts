import { recall, remember } from '@/utils/platform/remember'

// Which accounts have seen which release's "What's new" in this browser,
// stored as "<account>@<version>" entries. The newest few are kept.

const keep = 20
const entries = () => (recall('changelogSeen') ?? '').split(',').filter(Boolean)
const entry = (account: string, version: string) => `${account}@${version}`

export const hasSeenRelease = (account: string, version: string) => entries().includes(entry(account, version))

export function markReleaseSeen(account: string, version: string) {
  if (hasSeenRelease(account, version)) return
  remember('changelogSeen', [...entries(), entry(account, version)].slice(-keep).join(','))
}
