import { Users } from 'lucide-react'
import AddPlayerForm from '@/components/session/AddPlayerForm'
import MemberRow from '@/components/session/setup/MemberRow'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { sports } from '@/config/sports'
import type { SessionSetupInput } from '@matchpoynt/shared'
import { draftId, type DraftLocks } from '@/utils/forms/sessionDraft'

interface MembersStepProps {
  setup: SessionSetupInput
  locks: DraftLocks
  onChange: (setup: SessionSetupInput) => void
}

export default function MembersStep({ setup, locks, onChange }: MembersStepProps) {
  const sport = sports[setup.sportId]
  const { members } = setup
  const setMembers = (next: SessionSetupInput['members']) => onChange({ ...setup, members: next })

  return (
    <div className="space-y-6">
      <AddPlayerForm
        key={sport.id}
        sport={sport}
        submitLabel="Add player"
        checkedInByDefault={false}
        exclude={members.map((m) => m.name)}
        onAdd={(name, tierId, checkedIn) => setMembers([...members, { id: draftId(), name: name.trim(), tierId, checkedIn }])}
      />
      {members.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No players yet</EmptyTitle>
            <EmptyDescription>Add players now, or add them from the board as they arrive.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">{members.length} players</p>
          <ul className="grid gap-2">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                sport={sport}
                locked={locks.memberIds.has(member.id)}
                arrived={locks.checkedInIds.has(member.id)}
                onChange={(next) => setMembers(members.map((m) => (m.id === next.id ? next : m)))}
                onRemove={() => setMembers(members.filter((m) => m.id !== member.id))}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
