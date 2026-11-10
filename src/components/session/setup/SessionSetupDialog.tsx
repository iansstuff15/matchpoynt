import type { SessionSetupInput, SetupStepId } from '@matchpoynt/shared'
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Play } from 'lucide-react'
import { useState } from 'react'
import CourtsStep from '@/components/session/setup/CourtsStep'
import MatchmakingStep from '@/components/session/setup/MatchmakingStep'
import MembersStep from '@/components/session/setup/MembersStep'
import RulesStep from '@/components/session/setup/RulesStep'
import ScoringStep from '@/components/session/setup/ScoringStep'
import SetupStepNav from '@/components/session/setup/SetupStepNav'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { setupSteps } from '@/config/sessionSetup'
import type { SetupMode } from '@/types/session'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { ApiRequestError } from '@/utils/api/errors'
import type { DraftLocks } from '@/utils/forms/sessionDraft'

interface SessionSetupDialogProps {
  open: boolean
  mode: SetupMode
  initial: SessionSetupInput
  locks: DraftLocks
  pending: boolean
  /** The last failed save, if any. The server decides what's valid. */
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (setup: SessionSetupInput) => void
}

type FormProps = Omit<SessionSetupDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }

const stepIds = new Set<string>(setupSteps.map((s) => s.id))

/** Splits a server error into per-step messages and a general one. */
function stepErrors(error: unknown) {
  const steps: Partial<Record<SetupStepId, string>> = {}
  if (error instanceof ApiRequestError) {
    for (const [key, message] of Object.entries(error.fields)) if (stepIds.has(key)) steps[key as SetupStepId] = message
  }
  return steps
}

/** Draft state lives here, so it resets every time the dialog opens. */
function SetupForm({ mode, initial, locks, pending, error, onSubmit, onCancel }: FormProps) {
  const [setup, setSetup] = useState(initial)
  const [stepId, setStepId] = useState<SetupStepId>('courts')
  const errors = stepErrors(error)

  // When a new server error arrives, jump to the first step it flags.
  const [seenError, setSeenError] = useState(error)
  if (error !== seenError) {
    setSeenError(error)
    const first = setupSteps.find((s) => errors[s.id])
    if (first) setStepId(first.id)
  }

  const index = setupSteps.findIndex((s) => s.id === stepId)
  const step = setupSteps[index] ?? setupSteps[0]!
  const isLast = index === setupSteps.length - 1
  const go = (offset: number) => {
    const next = setupSteps[index + offset]
    if (next) setStepId(next.id)
  }
  const stepProps = { setup, onChange: setSetup }
  const submitIcon = pending ? <LoaderCircle className="animate-spin" /> : null

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl">{mode === 'create' ? 'Set up your session' : 'Session settings'}</DialogTitle>
        <DialogDescription>
          {mode === 'create'
            ? 'Five quick steps. You can change any of this later from the board.'
            : 'Changes apply to the next match. Matches in progress keep their courts and players.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[11rem_1fr]">
        <SetupStepNav current={step.id} errors={errors} onSelect={setStepId} />
        <section aria-labelledby="setup-step-title" className="min-h-0 overflow-y-auto pr-1">
          <h3 id="setup-step-title" className="font-display text-lg font-semibold">
            {step.label}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">{step.description}</p>
          {Boolean(error) && (
            <ErrorBanner
              className="mb-4"
              error={error}
              action={mode === 'create' ? 'start the session' : 'save the session settings'}
              onRetry={pending ? undefined : () => onSubmit(setup)}
            />
          )}
          {step.id === 'courts' && <CourtsStep {...stepProps} mode={mode} locks={locks} />}
          {step.id === 'members' && <MembersStep {...stepProps} locks={locks} />}
          {step.id === 'scoring' && <ScoringStep {...stepProps} />}
          {step.id === 'rules' && <RulesStep {...stepProps} />}
          {step.id === 'matchmaking' && <MatchmakingStep {...stepProps} />}
        </section>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {mode === 'create' ? (
          <>
            <Button type="button" variant="outline" onClick={() => go(-1)} disabled={index === 0}>
              <ArrowLeft />
              Back
            </Button>
            {isLast ? (
              <Button type="button" onClick={() => onSubmit(setup)} disabled={pending}>
                {submitIcon ?? <Play />}
                Start session
              </Button>
            ) : (
              <Button type="button" onClick={() => go(1)}>
                Next
                <ArrowRight />
              </Button>
            )}
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={() => onSubmit(setup)} disabled={pending}>
              {submitIcon ?? <Check />}
              Save changes
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  )
}

/** First-run setup and later edits share this dialog. */
export default function SessionSetupDialog({ open, onOpenChange, ...formProps }: SessionSetupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-3xl">
        {open && <SetupForm {...formProps} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
