import type { ClubSummary } from '@matchpoynt/shared'
import { AtSign, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import HandleField from '@/components/common/HandleField'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { useClubActions } from '@/utils/hooks/useClubs'
import { handleFromName } from '@/utils/forms/handle'
import { useNameCheck } from '@/utils/hooks/useNameCheck'

/**
 * Every club needs an @handle: a club without one (made before handles)
 * gets this dialog on all its pages, and it can't be closed until a free
 * handle is saved. The API checks the handle again when it's saved.
 */
export default function ClubHandleRequiredDialog({ club, actions }: { club: ClubSummary; actions: ReturnType<typeof useClubActions> }) {
  const [handle, setHandle] = useState(() => handleFromName(club.name))
  const check = useNameCheck('handle', handle, club.id)
  const { saveInfo } = actions
  const save = () => saveInfo.mutate({ name: club.name, handle: handle.trim().replace(/^@+/, ''), description: club.description })
  const keepOpen = (e: Event) => e.preventDefault()

  return (
    <Dialog open dismissible={false}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={keepOpen} onPointerDownOutside={keepOpen} onInteractOutside={keepOpen} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <AtSign className="size-5" aria-hidden />
            Pick a handle for {club.name}
          </DialogTitle>
          <DialogDescription>Every club has a unique @handle: it's how players find the club, join it and open its QR. Set one to keep going.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (check.available) save()
          }}
        >
          <HandleField label="Handle" value={handle} onChange={setHandle} check={check} hint="Letters, digits, dots and underscores. You can change it later in settings." />
          {Boolean(saveInfo.error) && <ErrorBanner error={saveInfo.error} action="save the handle" onRetry={saveInfo.isPending ? undefined : save} />}
          <DialogFooter>
            <Button type="submit" disabled={!check.available || saveInfo.isPending}>
              {saveInfo.isPending ? <LoaderCircle className="animate-spin" /> : <AtSign />}
              Save handle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
