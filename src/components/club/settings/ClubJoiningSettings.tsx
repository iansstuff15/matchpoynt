import { directoryLimits, type ClubJoiningInput, type ClubSummary, type JoinApproval } from '@matchpoynt/shared'
import { Check, LoaderCircle, Plus, ShieldCheck, Trash2, Zap } from 'lucide-react'
import { useId, useState } from 'react'
import RadioCard from '@/components/common/RadioCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import type { useClubActions } from '@/utils/hooks/useClubs'

const same = (a: ClubJoiningInput, b: ClubJoiningInput) => JSON.stringify(a) === JSON.stringify(b)

/**
 * How people join the club (at once, or reviewed by the owner) and the
 * welcome they see once they're in: a message and links (group chat, rules…).
 */
export default function ClubJoiningSettings({ club, actions }: { club: ClubSummary; actions: ReturnType<typeof useClubActions> }) {
  const [draft, setDraft] = useState(club.joining)
  const [seen, setSeen] = useState(club.joining)
  if (!same(seen, club.joining)) {
    setSeen(club.joining)
    setDraft(club.joining)
  }
  const ids = { message: useId(), links: useId() }
  const { saveJoining } = actions
  const setLink = (i: number, patch: Partial<ClubJoiningInput['welcomeLinks'][number]>) =>
    setDraft({ ...draft, welcomeLinks: draft.welcomeLinks.map((l, j) => (j === i ? { ...l, ...patch } : l)) })

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        saveJoining.mutate(draft)
      }}
    >
      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>When someone asks to join</legend>
        </Label>
        <RadioGroup value={draft.approval} onValueChange={(v) => setDraft({ ...draft, approval: v as JoinApproval })} className="sm:grid-cols-2">
          <RadioCard value="manual" title="I review each request" description="Requests wait on the Members page until you approve them." icon={ShieldCheck} />
          <RadioCard value="auto" title="They join at once" description="Anyone who asks joins the roster straight away." icon={Zap} />
        </RadioGroup>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor={ids.message}>Welcome message (optional)</Label>
        <Textarea
          id={ids.message}
          rows={4}
          maxLength={directoryLimits.welcomeMaxLength}
          placeholder="Shown to new members: where you play, what to bring, how to pay…"
          value={draft.welcomeMessage ?? ''}
          onChange={(e) => setDraft({ ...draft, welcomeMessage: e.target.value })}
        />
      </div>
      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>Links for members (optional)</legend>
        </Label>
        <ul className="grid gap-2" aria-label="Links for members">
          {draft.welcomeLinks.map((link, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
              <Input aria-label={`Link ${i + 1} name`} placeholder="Group chat" maxLength={directoryLimits.linkLabelMaxLength} value={link.label} onChange={(e) => setLink(i, { label: e.target.value })} />
              <Input aria-label={`Link ${i + 1} address`} placeholder="https://…" inputMode="url" value={link.url} onChange={(e) => setLink(i, { url: e.target.value })} />
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove link ${i + 1}`} onClick={() => setDraft({ ...draft, welcomeLinks: draft.welcomeLinks.filter((_, j) => j !== i) })}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          disabled={draft.welcomeLinks.length >= directoryLimits.welcomeLinks}
          onClick={() => setDraft({ ...draft, welcomeLinks: [...draft.welcomeLinks, { label: '', url: '' }] })}
        >
          <Plus />
          Add link
        </Button>
      </fieldset>
      {Boolean(saveJoining.error) && <ErrorBanner error={saveJoining.error} action="save how people join" onRetry={saveJoining.isPending ? undefined : () => saveJoining.mutate(draft)} />}
      <div className="flex justify-end">
        <Button type="submit" disabled={saveJoining.isPending || same(draft, club.joining)}>
          {saveJoining.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Save joining
        </Button>
      </div>
    </form>
  )
}
