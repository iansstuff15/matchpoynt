import type { SessionView } from '@matchpoynt/shared'
import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { draftFromSession } from '@/utils/forms/sessionDraft'
import type { useSessionActions } from '@/utils/hooks/useSession'

interface QueueingSwitchProps {
  session: SessionView
  actions: ReturnType<typeof useSessionActions>
}

/** Turns automatic queueing on or off for the running session, right from the board. */
export default function QueueingSwitch({ session, actions }: QueueingSwitchProps) {
  const id = useId()
  const on = session.rules.queueing === 'automatic'
  const pending = actions.setQueueing.isPending

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
      <Switch
        id={id}
        checked={on}
        disabled={pending}
        onCheckedChange={(next) => {
          const draft = draftFromSession(session)
          actions.setQueueing.mutate({ ...draft, rules: { ...draft.rules, queueing: next ? 'automatic' : 'manual' } })
        }}
      />
      <Label htmlFor={id} className="cursor-pointer text-sm">
        Automatic queueing
      </Label>
    </div>
  )
}
