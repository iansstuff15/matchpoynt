import { clubBadgeLimits, clubBadgeMetrics, clubBadgeScopes, type ClubBadgeInput, type ClubBadgeScope, type ClubBadgeView } from '@matchpoynt/shared'
import { Check, LoaderCircle, Plus } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import BadgeConditionsField from '@/components/club/badges/BadgeConditionsField'
import BadgeIconPicker from '@/components/club/badges/BadgeIconPicker'
import RadioCard from '@/components/common/RadioCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import type { BadgeIconChoice, useClubActions } from '@/utils/hooks/useClubs'

interface ClubBadgeDialogProps {
  /** `null` while closed; `'new'` to create; a badge to edit. */
  badge: ClubBadgeView | 'new' | null
  actions: ReturnType<typeof useClubActions>
  onOpenChange: (open: boolean) => void
}

const blank: ClubBadgeInput = { name: '', description: null, scope: 'session', conditions: [{ metric: 'wins', min: 3 }] }

/** Draft state lives here, so it resets every time the dialog opens. */
function BadgeForm({ badge, actions, onDone }: { badge: ClubBadgeView | 'new'; actions: ClubBadgeDialogProps['actions']; onDone: () => void }) {
  const editing = badge === 'new' ? null : badge
  const [draft, setDraft] = useState<ClubBadgeInput>(editing ? { name: editing.name, description: editing.description, scope: editing.scope, conditions: editing.conditions } : blank)
  const [icon, setIcon] = useState<BadgeIconChoice | null>(null)
  // Set once the badge is saved, so a retry after a failed icon only sends the icon (and edits, not a second badge).
  const [savedId, setSavedId] = useState<string | null>(editing?.id ?? null)
  const { saveBadge, setBadgeIcon } = actions
  const pending = saveBadge.isPending || setBadgeIcon.isPending
  const nameId = useId()
  const descriptionId = useId()

  const setScope = (scope: ClubBadgeScope) =>
    // Conditions that don't count in the new scope are dropped from the draft.
    setDraft({ ...draft, scope, conditions: draft.conditions.filter((c) => clubBadgeMetrics[c.metric].scopes.includes(scope)) })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const known = new Set(editing ? [editing.id] : [])
    try {
      const view = await saveBadge.mutateAsync({ badgeId: savedId, badge: draft })
      const id = savedId ?? view.badges.find((b) => !known.has(b.id) && b.name === draft.name.trim())?.id ?? view.badges.at(-1)?.id
      if (!id) return
      setSavedId(id)
      if (icon) await setBadgeIcon.mutateAsync({ badgeId: id, name: draft.name.trim(), icon })
      onDone()
    } catch {
      // The error banner below shows what went wrong.
    }
  }

  return (
    <form onSubmit={submit} className="badge-form" aria-label="Badge">
      <div className="badge-form-body">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={nameId}>Badge name</Label>
            <Input id={nameId} value={draft.name} maxLength={clubBadgeLimits.nameMaxLength} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Smash King" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={descriptionId}>Description (optional)</Label>
            <Textarea
              id={descriptionId}
              rows={2}
              value={draft.description ?? ''}
              maxLength={clubBadgeLimits.descriptionMaxLength}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What it celebrates"
            />
          </div>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Where it's earned</legend>
          <RadioGroup value={draft.scope} onValueChange={(v) => setScope(v as ClubBadgeScope)} className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(clubBadgeScopes) as ClubBadgeScope[]).map((scope) => (
              <RadioCard key={scope} value={scope} title={clubBadgeScopes[scope].label} description={clubBadgeScopes[scope].description} />
            ))}
          </RadioGroup>
        </fieldset>

        <BadgeConditionsField scope={draft.scope} conditions={draft.conditions} onChange={(conditions) => setDraft({ ...draft, conditions })} />

        <BadgeIconPicker name={draft.name} currentUrl={editing?.iconUrl ?? null} choice={icon} onChoice={setIcon} />

        {Boolean(saveBadge.error ?? setBadgeIcon.error) && (
          <ErrorBanner
            error={setBadgeIcon.error ?? saveBadge.error}
            action={setBadgeIcon.error ? `set the ${draft.name.trim() || 'badge'} icon` : `save the ${draft.name.trim() || 'new'} badge`}
            onRetry={pending ? undefined : () => void submit({ preventDefault: () => {} } as FormEvent)}
          />
        )}
      </div>

      {/* Outside the scrolling part, so Create and Cancel are always in view. */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : editing ? <Check /> : <Plus />}
          {editing ? 'Save badge' : 'Create badge'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Creates or edits a club badge: name, where it's earned, its conditions and its icon. */
export default function ClubBadgeDialog({ badge, actions, onOpenChange }: ClubBadgeDialogProps) {
  return (
    <Dialog open={badge !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{badge && badge !== 'new' ? `Edit ${badge.name}` : 'Create a badge'}</DialogTitle>
          <DialogDescription>Players earn it on the leaderboard when they meet every condition. Matchpoynt checks the results.</DialogDescription>
        </DialogHeader>
        {badge && <BadgeForm badge={badge} actions={actions} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
