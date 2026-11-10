import type { ClubMemberView, SessionSetupInput } from '@matchpoynt/shared'
import { Search, Users } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { sports } from '@/config/sports'
import { memberRow } from '@/utils/forms/planDraft'

interface PlanMembersStepProps {
  setup: SessionSetupInput
  members: ClubMemberView[]
  onChange: (setup: SessionSetupInput) => void
}

/** Picks which club members are on the plan's roster, showing each one's tier for the plan's sport. */
export default function PlanMembersStep({ setup, members, onChange }: PlanMembersStepProps) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const sport = sports[setup.sportId]
  const picked = new Set(setup.members.map((m) => m.id))
  const shown = members.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()))
  const setPicked = (ids: Set<string>) =>
    // Keep the club's order, so the roster reads the same as the members list.
    onChange({ ...setup, members: members.filter((m) => ids.has(m.id)).map((m) => memberRow(m, setup.sportId)) })
  const toggle = (id: string, on: boolean) => {
    const next = new Set(picked)
    if (on) next.add(id)
    else next.delete(id)
    setPicked(next)
  }

  if (members.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>No club members yet</EmptyTitle>
          <EmptyDescription>Add members on the Members tab, or plan without a roster and add players from the board on the day.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={searchId} className="sr-only">
          Find a member
        </label>
        <span className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id={searchId} value={query} placeholder="Find a member" className="pl-8" onChange={(e) => setQuery(e.target.value)} />
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => setPicked(new Set(members.map((m) => m.id)))}>
          <Users />
          Everyone
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(new Set())}>
          Clear
        </Button>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {picked.size} of {members.length} members on the roster
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {shown.map((m) => {
          const row = memberRow(m, setup.sportId)
          const tier = sport.tiers.find((t) => t.id === row.tierId)?.label ?? row.tierId
          const set = m.tiers.some((t) => t.sportId === setup.sportId)
          const id = `plan-member-${m.id}`
          return (
            <li key={m.id}>
              <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-2 has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-muted">
                <Checkbox id={id} checked={picked.has(m.id)} onCheckedChange={(on) => toggle(m.id, on === true)} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium" title={m.name}>
                  {m.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground" title={set ? undefined : `No ${sport.name.toLowerCase()} tier set: starts at ${tier}`}>
                  {tier}
                  {!set && '*'}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {members.some((m) => !m.tiers.some((t) => t.sportId === setup.sportId)) && (
        <p className="text-xs text-muted-foreground">* No {sport.name.toLowerCase()} tier set; they start at the first tier.</p>
      )}
    </div>
  )
}
