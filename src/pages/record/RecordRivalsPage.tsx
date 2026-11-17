import { Handshake, Swords } from 'lucide-react'
import RecordShell from '@/components/record/RecordShell'
import RivalsCard from '@/components/record/RivalsCard'

/** Your rivals (`/record/rivals`): who you've played against most and your record against them, and your regular partners. */
export default function RecordRivalsPage() {
  return (
    <RecordShell title="Rivals" description="The players you've faced most and your record against them, and the partners you've played with most.">
      {(record) => (
        <>
          <RivalsCard
            id="rivals-opponents"
            title="Rivals"
            description="Who you've played against most, and your wins and losses against them."
            icon={Swords}
            people={record.rivals.opponents}
            empty="Play a few more matches: anyone you face twice or more shows here."
          />
          <RivalsCard
            id="rivals-partners"
            title="Partners"
            description="Who you've played with most, and your wins and losses together."
            icon={Handshake}
            people={record.rivals.partners}
            empty="Partners you've played with twice or more show here."
          />
        </>
      )}
    </RecordShell>
  )
}
