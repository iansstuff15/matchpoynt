import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

interface SessionEmptyStateProps {
  onSetup: () => void
}

export default function SessionEmptyState({ onSetup }: SessionEmptyStateProps) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Settings2 />
        </EmptyMedia>
        <EmptyTitle>No session yet</EmptyTitle>
        <EmptyDescription>Set up courts, players, scoring, rules and matchmaking to open the board.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onSetup}>
          <Settings2 />
          Set up session
        </Button>
      </EmptyContent>
    </Empty>
  )
}
