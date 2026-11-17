import type { BillerView } from '@matchpoynt/shared'
import { Pencil, Trash2 } from 'lucide-react'
import ConfirmButton from '@/components/common/ConfirmButton'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { billerColumns } from '@/config/accounting'

interface BillerTableProps {
  billers: BillerView[]
  deletingId: string | null
  onEdit: (biller: BillerView) => void
  onDelete: (biller: BillerView) => void
}

/** The club's billers, by name, with how many expenses each has. */
export default function BillerTable({ billers, deletingId, onEdit, onDelete }: BillerTableProps) {
  return (
    <div className="rounded-2xl border bg-card p-2 sm:p-4">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {billerColumns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {billers.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                <span className="block truncate font-medium" title={b.name}>
                  {b.name}
                </span>
                {b.notes && (
                  <span className="block truncate text-xs text-muted-foreground" title={b.notes}>
                    {b.notes}
                  </span>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <span className="block truncate text-muted-foreground" title={b.contact ?? undefined}>
                  {b.contact ?? '—'}
                </span>
              </TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">{b.expenses}</TableCell>
              <TableCell>
                <span className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => onEdit(b)} aria-label={`Edit ${b.name}`} title={`Edit ${b.name}`}>
                    <Pencil />
                  </Button>
                  <ConfirmButton
                    iconOnly
                    variant="ghost"
                    label={`Delete ${b.name}`}
                    icon={Trash2}
                    title={`Delete ${b.name}?`}
                    description={b.expenses ? `Their ${b.expenses} ${b.expenses === 1 ? 'expense is' : 'expenses are'} kept, with no biller.` : 'They have no expenses linked.'}
                    confirmLabel="Delete biller"
                    pending={deletingId === b.id}
                    onConfirm={() => onDelete(b)}
                  />
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
