import { clubLimits, type ClubMemberInput, type MemberTier, type SportId } from '@matchpoynt/shared'
import { Check, LoaderCircle, UserPlus } from 'lucide-react'
import { useId, useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sportList } from '@/config/sports'

interface MemberDialogProps {
  open: boolean
  /** `null` adds a new member. */
  initial: ClubMemberInput | null
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (member: ClubMemberInput) => void
}

const notPlaying = 'none'

/** Draft state lives here, so it resets each time the dialog opens. */
function MemberForm({ initial, pending, error, onSubmit, onCancel }: Omit<MemberDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [member, setMember] = useState<ClubMemberInput>(initial ?? { name: '', contact: null, tiers: [] })
  const nameId = useId()
  const contactId = useId()
  const tierOf = (sportId: SportId) => member.tiers.find((t) => t.sportId === sportId)?.tierId ?? notPlaying
  const setTier = (sportId: SportId, tierId: string) => {
    const others = member.tiers.filter((t) => t.sportId !== sportId)
    const tiers: MemberTier[] = tierId === notPlaying ? others : [...others, { sportId, tierId }]
    setMember({ ...member, tiers })
  }
  const submit = () => onSubmit(member)
  const adding = initial === null

  return (
    <form
      className="grid min-h-0 gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {Boolean(error) && <ErrorBanner error={error} action={adding ? 'add the member' : 'save the member'} onRetry={pending ? undefined : submit} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={nameId}>Name</Label>
          <Input id={nameId} value={member.name} maxLength={60} autoComplete="off" onChange={(e) => setMember({ ...member, name: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={contactId}>Contact (optional)</Label>
          <Input
            id={contactId}
            value={member.contact ?? ''}
            maxLength={clubLimits.contactMaxLength}
            placeholder="Email or phone"
            autoComplete="off"
            onChange={(e) => setMember({ ...member, contact: e.target.value })}
          />
        </div>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Skill tier by sport</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {sportList.map(({ id, name, icon: Icon, tiers }) => (
            <li key={id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{name}</span>
              </span>
              <Select value={tierOf(id)} onValueChange={(tierId) => setTier(id, tierId)}>
                <SelectTrigger className="w-36" size="sm" aria-label={`${name} skill tier`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={notPlaying}>Doesn't play</SelectItem>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Sports left as "Doesn't play" start at the first tier if the member joins a session for them.</p>
      </fieldset>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : adding ? <UserPlus /> : <Check />}
          {adding ? 'Add member' : 'Save member'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Adds a club member or edits one: name, contact and a tier per sport. */
export default function MemberDialog({ open, onOpenChange, initial, ...formProps }: MemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{initial ? `Edit ${initial.name}` : 'Add a member'}</DialogTitle>
          <DialogDescription>Members are a named roster: they don't need a Matchpoynt account.</DialogDescription>
        </DialogHeader>
        {open && <MemberForm initial={initial} {...formProps} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
