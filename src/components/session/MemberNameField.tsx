import type { MemberSuggestion, SportId } from '@matchpoynt/shared'
import { Users } from 'lucide-react'
import { useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { sports } from '@/config/sports'
import { useDebounced } from '@/utils/hooks/useDebounced'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMemberSuggestions } from '@/utils/hooks/useMembers'

interface MemberNameFieldProps {
  id: string
  value: string
  sportId: SportId
  sessionId?: string
  /** Names already in the draft, so they aren't suggested again. */
  exclude?: string[]
  className?: string
  onChange: (name: string) => void
  /** A suggestion was picked: its name, and its tier when the member has one for this sport. */
  onPick: (suggestion: MemberSuggestion) => void
}

/**
 * The player-name field, suggesting club members as you type (shadcn
 * Command in a Popover). Enter picks the highlighted member while the list
 * is open, and submits the form otherwise.
 */
export default function MemberNameField({ id, value, sportId, sessionId, exclude, className, onChange, onPick }: MemberNameFieldProps) {
  const { web } = useFeatures()
  const [focused, setFocused] = useState(false)
  const q = useDebounced(value, 200)
  const suggestions = useMemberSuggestions({ q, sportId, sessionId, exclude }, web.clubs && focused)
  const list = value.trim() ? (suggestions.data ?? []) : []
  const open = focused && list.length > 0
  const tier = (tierId: string | null) => sports[sportId].tiers.find((t) => t.id === tierId)?.label

  return (
    <div className={className}>
      <Command shouldFilter={false} className="member-name-field" label="Player name with club member suggestions">
        <Popover open={open}>
          <PopoverAnchor asChild>
            <div>
              <CommandInput
                id={id}
                value={value}
                placeholder="e.g. Sam Cruz"
                autoComplete="off"
                onValueChange={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setFocused(false)
                  // With no list open, Enter adds the name as typed.
                  if (e.key === 'Enter' && !open) {
                    e.preventDefault()
                    e.currentTarget.form?.requestSubmit()
                  }
                }}
              />
            </div>
          </PopoverAnchor>
          <PopoverContent
            align="start"
            className="w-(--radix-popover-trigger-width) min-w-64 p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
            // Keep focus in the field, so a click picks before the list closes.
            onMouseDown={(e) => e.preventDefault()}
          >
            <CommandList>
              <CommandGroup heading="Club members">
                {list.map((s) => (
                  <CommandItem
                    key={s.memberId}
                    value={s.memberId}
                    onSelect={() => {
                      onPick(s)
                      setFocused(false)
                    }}
                  >
                    <Users aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[tier(s.tierId), s.clubName].filter(Boolean).join(' · ')}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </PopoverContent>
        </Popover>
      </Command>
      {suggestions.isError && <ErrorBanner className="mt-2" error={suggestions.error} action="look up club members" onRetry={() => void suggestions.refetch()} />}
    </div>
  )
}
