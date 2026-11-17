import { clubLimits, type CreateClubInput } from '@matchpoynt/shared'
import { ArrowLeft, ArrowRight, LoaderCircle, Plus, SkipForward } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import CreateClubReview from '@/components/club/CreateClubReview'
import ThemeColorFields from '@/components/club/ThemeColorFields'
import ThemePresets from '@/components/club/ThemePresets'
import FeeSchemeFields from '@/components/fees/FeeSchemeFields'
import HandleField from '@/components/common/HandleField'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import SetupStepNav from '@/components/session/setup/SetupStepNav'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClubFieldSteps, createClubSteps, type CreateClubStepId } from '@/config/createClub'
import { ApiRequestError } from '@/utils/api/errors'
import { noColors } from '@/utils/forms/clubTheme'
import { useCreateClub } from '@/utils/hooks/useClubs'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useNameCheck } from '@/utils/hooks/useNameCheck'
import { handleFromName } from '@/utils/forms/handle'
import { createClubStepMissing, firstIncomplete } from '@/utils/forms/requiredFields'

interface CreateClubDialogProps {
  /** What opens it; a "New club" button by default. */
  trigger?: ReactNode
  /** Open on arrival (e.g. "Add club" from the sidebar's switcher). */
  defaultOpen?: boolean
}

const blank: CreateClubInput = { name: '', handle: '', description: null, theme: null, fee: null }

/** Splits a server error into per-step messages. */
function stepErrors(error: unknown) {
  const steps: Partial<Record<CreateClubStepId, string>> = {}
  if (error instanceof ApiRequestError) {
    for (const [field, message] of Object.entries(error.fields)) {
      const step = createClubFieldSteps[field.split('.')[0]!]
      if (step) steps[step] = message
    }
  }
  return steps
}

/** Draft state lives here, so it resets every time the dialog opens. */
function CreateClubForm({ onCancel }: { onCancel: () => void }) {
  const { web } = useFeatures()
  const steps = createClubSteps.filter((s) => !s.feature || web[s.feature])
  const create = useCreateClub()
  const navigate = useNavigate()
  const [club, setClub] = useState(blank)
  const [stepId, setStepId] = useState<CreateClubStepId>('details')
  const ids = { name: useId(), description: useId() }
  // The handle follows the name until it's typed in itself.
  const [handleTyped, setHandleTyped] = useState(false)
  const handle = useNameCheck('handle', club.handle)
  const errors = stepErrors(create.error)

  // When a new server error arrives, jump to the first step it flags.
  const [seenError, setSeenError] = useState(create.error)
  if (create.error !== seenError) {
    setSeenError(create.error)
    const first = steps.find((s) => errors[s.id])
    if (first) setStepId(first.id)
  }

  const index = steps.findIndex((s) => s.id === stepId)
  const step = steps[index] ?? steps[0]!
  const go = (offset: number) => {
    const next = steps[index + offset]
    if (next) setStepId(next.id)
  }
  // "Use default": this step goes back to its default, and on to the next.
  const keepDefault = () => {
    if (step.id === 'appearance') setClub({ ...club, theme: null })
    if (step.id === 'fees') setClub({ ...club, fee: null })
    go(1)
  }
  const submit = () => create.mutate(club, { onSuccess: (view) => navigate(`/clubs/${view.club.id}`) })
  const missing = createClubStepMissing(step.id, club, handle.available)
  const lockedAfter = firstIncomplete(steps, (id) => createClubStepMissing(id, club, handle.available))

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[11rem_1fr]">
        <SetupStepNav label="Create a club steps" steps={steps} current={step.id} errors={errors} lockedAfter={lockedAfter} onSelect={setStepId} />
        <section aria-labelledby="create-club-step" className="min-h-0 overflow-y-auto pr-1">
          <h3 id="create-club-step" className="font-display text-lg font-semibold">
            {step.label}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">{step.description}</p>
          {Boolean(create.error) && <ErrorBanner className="mb-4" error={create.error} action="create the club" onRetry={create.isPending ? undefined : submit} />}
          {step.id === 'details' && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor={ids.name}>Club name</Label>
                <Input
                  id={ids.name}
                  value={club.name}
                  maxLength={clubLimits.nameMaxLength}
                  autoComplete="off"
                  autoFocus
                  onChange={(e) => setClub({ ...club, name: e.target.value, handle: handleTyped ? club.handle : handleFromName(e.target.value) })}
                />
              </div>
              <HandleField
                label="Handle"
                value={club.handle}
                check={handle}
                hint="The club's unique name on Matchpoynt, like @riverside."
                onChange={(value) => {
                  setHandleTyped(true)
                  setClub({ ...club, handle: value })
                }}
              />
              <div className="grid gap-2">
                <Label htmlFor={ids.description}>Description (optional)</Label>
                <Textarea
                  id={ids.description}
                  rows={4}
                  maxLength={clubLimits.descriptionMaxLength}
                  placeholder="Where and when you play, who it's for, how to join."
                  value={club.description ?? ''}
                  onChange={(e) => setClub({ ...club, description: e.target.value })}
                />
              </div>
            </div>
          )}
          {step.id === 'appearance' && (
            <div className="grid gap-5">
              <ThemePresets value={club.theme ?? noColors} onChange={(theme) => setClub({ ...club, theme })} />
              <ThemeColorFields value={club.theme ?? noColors} onChange={(theme) => setClub({ ...club, theme })} />
            </div>
          )}
          {step.id === 'fees' && <FeeSchemeFields fee={club.fee} onChange={(fee) => setClub({ ...club, fee })} />}
          {step.id === 'review' && <CreateClubReview club={club} />}
        </section>
      </div>

      {missing && (
        <p role="status" className="text-right text-sm text-muted-foreground">
          {missing}
        </p>
      )}
      <DialogFooter className="gap-2 sm:justify-between">
        <Button type="button" variant="outline" onClick={() => (index === 0 ? onCancel() : go(-1))}>
          <ArrowLeft />
          {index === 0 ? 'Cancel' : 'Back'}
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          {step.optional && (
            <Button type="button" variant="ghost" onClick={keepDefault}>
              <SkipForward />
              Use default
            </Button>
          )}
          {step.id === 'review' ? (
            <Button type="button" onClick={submit} disabled={create.isPending || lockedAfter !== null}>
              {create.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Create club
            </Button>
          ) : (
            <Button type="button" onClick={() => go(1)} disabled={missing !== null}>
              Next
              <ArrowRight />
            </Button>
          )}
        </div>
      </DialogFooter>
    </>
  )
}

/** "New club", step by step: details, colours and fees (each can keep its default), then a review. On to the new club's dashboard. */
export default function CreateClubDialog({ trigger, defaultOpen = false }: CreateClubDialogProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            New club
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create a club</DialogTitle>
          <DialogDescription>A few quick steps. Anything you skip keeps its default and can be changed in the club's settings.</DialogDescription>
        </DialogHeader>
        {open && <CreateClubForm onCancel={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}
