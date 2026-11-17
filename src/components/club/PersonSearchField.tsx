import type { PersonCard } from '@matchpoynt/shared'
import { useState } from 'react'
import PersonRow from '@/components/common/PersonRow'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { useDebounced } from '@/utils/hooks/useDebounced'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { usePeopleSearch } from '@/utils/hooks/useMembers'

interface PersonSearchFieldProps {
  id: string
  value: string
  /** The club being added to: its members aren't suggested. */
  clubId: string
  onChange: (name: string) => void
  onPick: (person: PersonCard) => void
}

/**
 * A member's name, suggesting up to 5 people on Matchpoynt as it's typed, by
 * name, email or @username, each with their photo. Picking one invites them
 * in the app; typing a name that isn't anyone's just adds a roster name.
 */
export default function PersonSearchField({ id, value, clubId, onChange, onPick }: PersonSearchFieldProps) {
  const { web } = useFeatures()
  const [focused, setFocused] = useState(false)
  const q = useDebounced(value, 200)
  const people = usePeopleSearch(q, clubId, web.signIn && web.clubDirectory && focused)
  const list = value.trim() ? (people.data ?? []) : []
  const open = focused && list.length > 0

  return (
    <div>
      <Command shouldFilter={false} className="member-name-field" label="Member name, with people on Matchpoynt suggested">
        <Popover open={open}>
          <PopoverAnchor asChild>
            <div>
              <CommandInput
                id={id}
                value={value}
                placeholder="Name, email or @username"
                autoComplete="off"
                maxLength={60}
                onValueChange={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    setFocused(false)
                  }
                  if (e.key === 'Enter' && !open) {
                    e.preventDefault()
                    e.currentTarget.form?.requestSubmit()
                  }
                }}
              />
            </div>
          </PopoverAnchor>
          <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0" onOpenAutoFocus={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()}>
            <CommandList>
              <CommandGroup heading="People on Matchpoynt">
                {list.map((p) => (
                  <CommandItem
                    key={p.userId}
                    value={p.userId}
                    onSelect={() => {
                      onPick(p)
                      setFocused(false)
                    }}
                  >
                    <PersonRow name={p.displayName ?? p.username ?? 'Someone'} username={p.username} email={p.email} avatarUrl={p.avatarUrl} avatarPosition={p.avatarPosition} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </PopoverContent>
        </Popover>
      </Command>
      {people.isError && <ErrorBanner className="mt-2" error={people.error} action="search for people" onRetry={() => void people.refetch()} />}
    </div>
  )
}
