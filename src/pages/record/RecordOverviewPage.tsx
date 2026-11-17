import { Navigate, useSearchParams } from 'react-router'
import RecordBreakdown from '@/components/record/RecordBreakdown'
import RecordShell from '@/components/record/RecordShell'

/** Your record's overview (`/record`): the total, then by sport and by club. Old `?tab=` links go to their own pages. */
export default function RecordOverviewPage() {
  const [params] = useSearchParams()
  const tab = params.get('tab')
  if (tab && ['games', 'sessions', 'badges', 'rivals'].includes(tab)) {
    const rest = new URLSearchParams(params)
    rest.delete('tab')
    return <Navigate to={`/record/${tab}${rest.size ? `?${rest}` : ''}`} replace />
  }
  return (
    <RecordShell title="Your record" description="Your record across every club and sport on Matchpoynt: matches, wins, losses and win rate, by sport and by club.">
      {(record) => <RecordBreakdown record={record} />}
    </RecordShell>
  )
}
