import type { ClubMemberView, PlannedSessionInput, PlanStepId, SessionSetupInput } from '@matchpoynt/shared'
import { ArrowLeft, ArrowRight, CalendarPlus, Check, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import PlanDetailsStep from '@/components/club/PlanDetailsStep'
import PlanMembersStep from '@/components/club/PlanMembersStep'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import CourtsStep from '@/components/session/setup/CourtsStep'
import MatchmakingStep from '@/components/session/setup/MatchmakingStep'
import RulesStep from '@/components/session/setup/RulesStep'
import ScoringStep from '@/components/session/setup/ScoringStep'
import SetupStepNav from '@/components/session/setup/SetupStepNav'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { planSteps } from '@/config/planSetup'
import { ApiRequestError } from '@/utils/api/errors'
import { memberRow, planInput, type PlanDraft } from '@/utils/forms/planDraft'
import { lockedIds } from '@/utils/forms/sessionDraft'

interface PlanSessionDialogProps {
  open: boolean
  /** `true` edits an existing plan. */
  editing: boolean
  initial: PlanDraft
  members: ClubMemberView[]
  pending: boolean
  /** The last failed save. The API decides what's valid. */
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (plan: PlannedSessionInput) => void
}

type FormProps = Omit<PlanSessionDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }

const stepIds = new Set<string>(planSteps.map((s) => s.id))
const noLocks = lockedIds(null)

/** Splits a server error into per-step messages. */
function stepErrors(error: unknown) {
  const steps: Partial<Record<PlanStepId, string>> = {}
  if (error instanceof ApiRequestError) {
    for (const [key, message] of Object.entries(error.fields)) if (stepIds.has(key)) steps[key as PlanStepId] = message
  }
  return steps
}

/** Draft state lives here, so it resets every time the dialog opens. */
function PlanForm({ editing, initial, members, pending, error, onSubmit, onCancel }: FormProps) {
  const [draft, setDraft] = useState(initial)
  const [stepId, setStepId] = useState<PlanStepId>('details')
  const errors = stepErrors(error)

  // When a new server error arrives, jump to the first step it flags.
  const [seenError, setSeenError] = useState(error)
  if (error !== seenError) {
    setSeenError(error)
    const first = planSteps.find((s) => errors[s.id])
    if (first) setStepId(first.id)
  }

  const index = planSteps.findIndex((s) => s.id === stepId)
  const step = planSteps[index] ?? planSteps[0]!
  const isLast = index === planSteps.length - 1
  const go = (offset: number) => {
    const next = planSteps[index + offset]
    if (next) setStepId(next.id)
  }

  const byId = new Map(members.map((m) => [m.id, m]))
  // Switching sport shows each picked member's tier for the new sport.
  const setSetup = (setup: SessionSetupInput) =>
    setDraft((d) => ({
      ...d,
      setup:
        setup.sportId === d.setup.sportId
          ? setup
          : { ...setup, members: setup.members.flatMap((m) => (byId.has(m.id) ? [memberRow(byId.get(m.id)!, setup.sportId)] : [])) },
    }))
  const stepProps = { setup: draft.setup, onChange: setSetup }
  const submit = () => onSubmit(planInput(draft))

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl">{editing ? `Edit ${initial.title}` : 'Plan a session'}</DialogTitle>
        <DialogDescription>
          {editing ? 'Changes apply when you start it.' : 'Prepare it now, start it from the club page when play begins.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[11rem_1fr]">
        <SetupStepNav steps={planSteps} current={step.id} errors={errors} onSelect={setStepId} />
        <section aria-labelledby="plan-step-title" className="min-h-0 overflow-y-auto pr-1">
          <h3 id="plan-step-title" className="font-display text-lg font-semibold">
            {step.label}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">{step.description}</p>
          {Boolean(error) && (
            <ErrorBanner className="mb-4" error={error} action="save the planned session" onRetry={pending ? undefined : submit} />
          )}
          {step.id === 'details' && <PlanDetailsStep draft={draft} onChange={setDraft} />}
          {step.id === 'courts' && <CourtsStep {...stepProps} mode="create" locks={noLocks} />}
          {step.id === 'members' && <PlanMembersStep {...stepProps} members={members} />}
          {step.id === 'scoring' && <ScoringStep {...stepProps} />}
          {step.id === 'rules' && <RulesStep {...stepProps} />}
          {step.id === 'matchmaking' && <MatchmakingStep {...stepProps} />}
        </section>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {editing ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => go(-1)} disabled={index === 0}>
            <ArrowLeft />
            Back
          </Button>
        )}
        {editing || isLast ? (
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : editing ? <Check /> : <CalendarPlus />}
            {editing ? 'Save changes' : 'Save plan'}
          </Button>
        ) : (
          <Button type="button" onClick={() => go(1)}>
            Next
            <ArrowRight />
          </Button>
        )}
      </DialogFooter>
    </>
  )
}

/** Plans a session ahead of time, or edits a plan: the setup steps plus a title, a date and a roster of club members. */
export default function PlanSessionDialog({ open, onOpenChange, ...formProps }: PlanSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-3xl">
        {open && <PlanForm {...formProps} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
