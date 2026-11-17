import { useNavigate } from 'react-router'
import RecordSessionsCard from '@/components/record/RecordSessionsCard'
import RecordShell from '@/components/record/RecordShell'

/** Your session history (`/record/sessions`): each session's place, record and badges; its page, its games and its images. */
export default function RecordSessionsPage() {
  const navigate = useNavigate()
  return (
    <RecordShell title="Your sessions" description="Every club session you played in: your place, record and the badges you earned there.">
      {(record) => <RecordSessionsCard record={record} onGames={(session) => navigate(`/record/games?${new URLSearchParams({ session })}`)} />}
    </RecordShell>
  )
}
