import type { ClubMemberView } from '@matchpoynt/shared'
import { LoaderCircle, Send } from 'lucide-react'
import { useId, useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InviteMemberDialogProps {
  member: ClubMemberView | null
  clubName: string
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSend: (email: string) => void
}

/** Emails a member a sign-in link: they set their own password, fill in the sign-up form, and join the club. */
export default function InviteMemberDialog({ member, clubName, pending, error, onOpenChange, onSend }: InviteMemberDialogProps) {
  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {member && <InviteForm key={member.id} member={member} clubName={clubName} pending={pending} error={error} onSend={onSend} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function InviteForm({ member, clubName, pending, error, onSend, onCancel }: Omit<InviteMemberDialogProps, 'member' | 'onOpenChange'> & { member: ClubMemberView; onCancel: () => void }) {
  const emailId = useId()
  // Start from the address used before, or the contact if it looks like one.
  const [email, setEmail] = useState(member.email ?? (member.contact?.includes('@') ? member.contact : ''))
  const resend = member.invite?.status === 'pending'
  const send = () => onSend(email)

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-display">{resend ? `Resend ${member.name}'s invite` : `Invite ${member.name}`}</DialogTitle>
        <DialogDescription>
          They get a sign-in link for {clubName}. Opening it, they choose their own password and fill in the sign-up form; their account is then linked to
          this member.
        </DialogDescription>
      </DialogHeader>
      {Boolean(error) && <ErrorBanner error={error} action={`invite ${member.name}`} onRetry={pending ? undefined : send} />}
      <div className="grid gap-2">
        <Label htmlFor={emailId}>Email address</Label>
        <Input id={emailId} type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        {resend && <p className="text-xs text-muted-foreground">Sending again cancels the earlier link.</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
          {resend ? 'Resend invite' : 'Send invite'}
        </Button>
      </DialogFooter>
    </form>
  )
}
