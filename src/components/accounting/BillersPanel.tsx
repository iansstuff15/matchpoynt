import type { BillerView } from '@matchpoynt/shared'
import { Plus, Store } from 'lucide-react'
import { useState } from 'react'
import BillerDialog from '@/components/accounting/BillerDialog'
import BillerTable from '@/components/accounting/BillerTable'
import BillerTableSkeleton from '@/components/accounting/BillerTableSkeleton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useAccountingActions, useBillers } from '@/utils/hooks/useAccounting'

/** Billers tab: who the club pays (venues, suppliers, coaches), to link its expenses to. */
export default function BillersPanel({ clubId }: { clubId: string }) {
  const billers = useBillers(clubId)
  const { addBiller, updateBiller, deleteBiller } = useAccountingActions(clubId)
  // `null` while closed; `'new'` to add; a biller to edit.
  const [editing, setEditing] = useState<BillerView | 'new' | null>(null)
  const save = editing === 'new' ? addBiller : updateBiller
  const open = (next: BillerView | 'new') => {
    addBiller.reset()
    updateBiller.reset()
    setEditing(next)
  }

  return (
    <section aria-labelledby="club-billers-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="club-billers-title" className="font-display text-xl font-semibold">
            Billers
          </h2>
          <p className="text-sm text-muted-foreground">Who the club pays. Link expenses to them to see where the money goes.</p>
        </div>
        <Button onClick={() => open('new')}>
          <Plus />
          Add biller
        </Button>
      </div>

      {Boolean(deleteBiller.error) && deleteBiller.variables && (
        <ErrorBanner error={deleteBiller.error} action={`delete ${deleteBiller.variables.name}`} onRetry={() => deleteBiller.variables && deleteBiller.mutate(deleteBiller.variables)} />
      )}
      {billers.isError ? (
        <ErrorBanner error={billers.error} action="load the club's billers" onRetry={() => void billers.refetch()} />
      ) : billers.isPending ? (
        <BillerTableSkeleton />
      ) : billers.data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Store />
            </EmptyMedia>
            <EmptyTitle>No billers yet</EmptyTitle>
            <EmptyDescription>Add the venues, suppliers and coaches the club pays, then link expenses to them.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <BillerTable
          billers={billers.data}
          deletingId={deleteBiller.isPending ? (deleteBiller.variables?.id ?? null) : null}
          onEdit={open}
          onDelete={(b) => deleteBiller.mutate({ id: b.id, name: b.name })}
        />
      )}

      <BillerDialog
        open={editing !== null}
        initial={editing === 'new' || editing === null ? null : { name: editing.name, contact: editing.contact, notes: editing.notes }}
        pending={save.isPending}
        error={save.error}
        onOpenChange={(next) => !next && setEditing(null)}
        onSubmit={(biller) => {
          const done = { onSuccess: () => setEditing(null) }
          if (editing === 'new') addBiller.mutate(biller, done)
          else if (editing) updateBiller.mutate({ id: editing.id, biller }, done)
        }}
      />
    </section>
  )
}
