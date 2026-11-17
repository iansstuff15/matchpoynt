import type { ClubMemberView, ManualInvoiceInput } from '@matchpoynt/shared'
import { Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

type Payer = ManualInvoiceInput['payers'][number]

interface PayerPickerProps {
  members: ClubMemberView[]
  payers: Payer[]
  onChange: (payers: Payer[]) => void
}

/** Who pays an invoice: club members ticked from the roster, and anyone else added by name. Form state only; the API checks the list. */
export default function PayerPicker({ members, payers, onChange }: PayerPickerProps) {
  const nameId = useId()
  const [name, setName] = useState('')
  const picked = new Set(payers.flatMap((p) => (p.memberId ? [p.memberId] : [])))
  const others = payers.filter((p) => !p.memberId)
  const toggle = (member: ClubMemberView, on: boolean) =>
    onChange(on ? [...payers, { memberId: member.id, name: member.name }] : payers.filter((p) => p.memberId !== member.id))
  const allPicked = members.length > 0 && members.every((m) => picked.has(m.id))
  const addName = () => {
    if (!name.trim()) return
    onChange([...payers, { memberId: null, name: name.trim() }])
    setName('')
  }

  return (
    <fieldset className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label asChild>
          <legend>Who pays · {payers.length} {payers.length === 1 ? 'payer' : 'payers'}</legend>
        </Label>
        {members.length > 0 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => onChange(allPicked ? others : [...others, ...members.map((m) => ({ memberId: m.id, name: m.name }))])}
          >
            {allPicked ? 'Clear members' : 'Every member'}
          </Button>
        )}
      </div>
      {members.length > 0 ? (
        <ScrollArea className="max-h-48 rounded-md border">
          <ul className="grid gap-1 p-2" aria-label="Club members">
            {members.map((m) => (
              <li key={m.id}>
                <Label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 font-normal hover:bg-muted">
                  <Checkbox checked={picked.has(m.id)} onCheckedChange={(on) => toggle(m, on === true)} />
                  {m.name}
                </Label>
              </li>
            ))}
          </ul>
        </ScrollArea>
      ) : (
        <p className="text-sm text-muted-foreground">The club has no members yet. Add payers by name.</p>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor={nameId}>Someone else</Label>
        <div className="flex gap-2">
          <Input
            id={nameId}
            value={name}
            maxLength={60}
            autoComplete="off"
            placeholder="Name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addName()
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addName}>
            <Plus />
            Add payer
          </Button>
        </div>
      </div>
      {others.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Other payers">
          {others.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-3 text-sm">
              {p.name}
              <Button type="button" variant="ghost" size="icon-sm" className="size-6" aria-label={`Remove ${p.name}`} onClick={() => onChange(payers.filter((x) => x !== p))}>
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}
