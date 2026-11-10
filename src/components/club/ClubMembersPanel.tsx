import type { ClubBadgeView, ClubMemberView } from '@matchpoynt/shared'
import { UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import InviteMemberDialog from '@/components/club/InviteMemberDialog'
import MemberDialog from '@/components/club/MemberDialog'
import MemberTable from '@/components/club/MemberTable'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { useClubActions } from '@/utils/hooks/useClubs'
import { useFeatures } from '@/utils/hooks/useFeatures'

interface ClubMembersPanelProps {
  clubName: string
  members: ClubMemberView[]
  /** The club's badges: members show the career badges they've earned. */
  badges: ClubBadgeView[]
  actions: ReturnType<typeof useClubActions>
}

/** Members tab: the roster, adding, editing and removing members. */
export default function ClubMembersPanel({ clubName, members, badges, actions }: ClubMembersPanelProps) {
  const { addMember, updateMember, removeMember, sendInvite, cancelInvite } = actions
  const { web } = useFeatures()
  const [inviting, setInviting] = useState<ClubMemberView | null>(null)
  // `null` while closed; `'new'` to add; a member to edit.
  const [editing, setEditing] = useState<ClubMemberView | 'new' | null>(null)
  const save = editing === 'new' ? addMember : updateMember
  const open = (next: ClubMemberView | 'new') => {
    addMember.reset()
    updateMember.reset()
    setEditing(next)
  }

  return (
    <section aria-labelledby="club-members-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="club-members-title" className="font-display text-xl font-semibold">
            Members
          </h2>
          <p className="text-sm text-muted-foreground">Pick them for planned sessions; their tiers carry over to the board.</p>
        </div>
        <Button onClick={() => open('new')}>
          <UserPlus />
          Add member
        </Button>
      </div>

      {members.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No members yet</EmptyTitle>
            <EmptyDescription>Add the people who play with your club, with their skill tier in each sport.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <MemberTable
          members={members}
          badges={badges}
          removingId={removeMember.isPending ? (removeMember.variables?.id ?? null) : null}
          invitesOn={web.signIn && web.signInEmail}
          onEdit={open}
          onRemove={(m) => removeMember.mutate({ id: m.id, name: m.name })}
          onInvite={(m) => {
            sendInvite.reset()
            setInviting(m)
          }}
          onCancelInvite={(m) => cancelInvite.mutate({ memberId: m.id, name: m.name })}
        />
      )}

      <InviteMemberDialog
        member={inviting}
        clubName={clubName}
        pending={sendInvite.isPending}
        error={sendInvite.error}
        onOpenChange={(next) => !next && setInviting(null)}
        onSend={(email) => inviting && sendInvite.mutate({ memberId: inviting.id, name: inviting.name, email }, { onSuccess: () => setInviting(null) })}
      />

      <MemberDialog
        open={editing !== null}
        initial={editing === 'new' || editing === null ? null : { name: editing.name, contact: editing.contact, tiers: editing.tiers }}
        pending={save.isPending}
        error={save.error}
        onOpenChange={(next) => !next && setEditing(null)}
        onSubmit={(member) => {
          const done = { onSuccess: () => setEditing(null) }
          if (editing === 'new') addMember.mutate(member, done)
          else if (editing) updateMember.mutate({ id: editing.id, member }, done)
        }}
      />
    </section>
  )
}
