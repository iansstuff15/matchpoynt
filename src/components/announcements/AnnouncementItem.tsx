import type { ClubAnnouncementView } from '@matchpoynt/shared'
import { Pin } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatWhen } from '@/utils/time/formatWhen'

/** One announcement: its title, pinned and new tags, when it was posted (and edited), and the message; `actions` sit on the right. */
export default function AnnouncementItem({ announcement: a, actions }: { announcement: ClubAnnouncementView; actions?: ReactNode }) {
  const titleId = `announcement-${a.id}`
  return (
    <li aria-labelledby={titleId} className="grid gap-2 rounded-xl border p-4" data-pinned={a.pinned || undefined}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-1">
          <h3 id={titleId} className="flex flex-wrap items-center gap-2 font-semibold">
            {a.title}
            {a.pinned && (
              <Badge variant="secondary" className="gap-1">
                <Pin aria-hidden />
                Pinned
              </Badge>
            )}
            {a.isNew && <Badge>New</Badge>}
          </h3>
          <p className="text-xs text-muted-foreground">
            Posted {formatWhen(a.createdAt)}
            {a.updatedAt !== a.createdAt && ` · edited ${formatWhen(a.updatedAt)}`}
          </p>
        </div>
        {actions && <div className="flex gap-1">{actions}</div>}
      </div>
      {a.body && <p className="text-sm whitespace-pre-line">{a.body}</p>}
    </li>
  )
}
