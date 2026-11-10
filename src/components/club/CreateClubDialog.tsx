import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import ClubInfoForm from '@/components/club/ClubInfoForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useCreateClub } from '@/utils/hooks/useClubs'

interface CreateClubDialogProps {
  /** What opens it; a "New club" button by default. */
  trigger?: ReactNode
  /** Open on arrival (e.g. "Add club" from the sidebar's switcher). */
  defaultOpen?: boolean
}

/** "New club": name and description, then on to the new club's page. */
export default function CreateClubDialog({ trigger, defaultOpen = false }: CreateClubDialogProps) {
  const [open, setOpen] = useState(defaultOpen)
  const create = useCreateClub()
  const navigate = useNavigate()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) create.reset()
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            New club
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create a club</DialogTitle>
          <DialogDescription>You can add photos, members and planned sessions next.</DialogDescription>
        </DialogHeader>
        {open && (
          <ClubInfoForm
            initial={{ name: '', description: null }}
            pending={create.isPending}
            error={create.error}
            action="create the club"
            submitLabel="Create club"
            submitIcon={Plus}
            onCancel={() => setOpen(false)}
            onSubmit={(info) =>
              create.mutate(info, {
                onSuccess: (view) => {
                  setOpen(false)
                  navigate(`/clubs/${view.club.id}`)
                },
              })
            }
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
