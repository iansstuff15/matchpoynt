import { CircleAlert, type LucideIcon } from 'lucide-react'
import { setupSteps } from '@/config/sessionSetup'
import type { SetupStepId } from '@matchpoynt/shared'
import { cn } from '@/utils/cn'

interface SetupStepNavProps<T extends string> {
  /** The dialog's steps; the session setup steps by default. */
  steps?: { id: T; label: string; icon: LucideIcon }[]
  current: T
  errors: Partial<Record<T, string>>
  onSelect: (step: T) => void
}

/** Step list for the setup dialogs (session setup, plan a session). Every step stays reachable, in both modes. */
export default function SetupStepNav<T extends string = SetupStepId>({ steps, current, errors, onSelect }: SetupStepNavProps<T>) {
  const list = steps ?? (setupSteps as unknown as { id: T; label: string; icon: LucideIcon }[])
  return (
    <nav aria-label="Session setup steps">
      <ol className="flex gap-1 overflow-x-auto md:flex-col">
        {list.map(({ id, label, icon: Icon }, index) => {
          const active = id === current
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm whitespace-nowrap transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="flex-1">
                  <span className="sr-only">Step {index + 1}: </span>
                  {label}
                </span>
                {errors[id] && <CircleAlert className="size-4 text-destructive" aria-label="Needs attention" />}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
