import BadgeCollection from '@/components/record/BadgeCollection'
import RecordShell from '@/components/record/RecordShell'

/** Your badge collection (`/record/badges`): every badge, how often, in which sports and where it came from. */
export default function RecordBadgesPage() {
  return (
    <RecordShell title="Your badges" description="Every badge you've earned on your clubs' leaderboards: how often, in which sports and where.">
      {(record) => <BadgeCollection record={record} />}
    </RecordShell>
  )
}
