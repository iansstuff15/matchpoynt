import type { ClubBadgeView, ClubMemberView } from '@matchpoynt/shared'
import { Mail, MailCheck, MailX, Pencil, UserCheck, UserMinus } from 'lucide-react'
import ClubBadgeIcon from '@/components/club/badges/ClubBadgeIcon'
import ConfirmButton from '@/components/common/ConfirmButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { memberColumns } from '@/config/club'
import { sports } from '@/config/sports'

interface MemberTableProps {
  members: ClubMemberView[]
  /** The club's badges, to show each member's career badges by their name. */
  badges: ClubBadgeView[]
  /** Member being removed right now. */
  removingId: string | null
  /** Invites are possible (sign-in with email links is on). */
  invitesOn: boolean
  onEdit: (member: ClubMemberView) => void
  onRemove: (member: ClubMemberView) => void
  onInvite: (member: ClubMemberView) => void
  onCancelInvite: (member: ClubMemberView) => void
}

const sentOn = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })

/** The club roster, by name, with each member's tier per sport. */
export default function MemberTable({ members, badges, removingId, invitesOn, onEdit, onRemove, onInvite, onCancelInvite }: MemberTableProps) {
  return (
    <div className="rounded-2xl border bg-card p-2 sm:p-4">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {memberColumns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <span className="block truncate font-medium" title={m.name}>
                  {m.name}
                </span>
                {m.badges.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1" aria-label={`${m.name}'s club badges`}>
                    {badges
                      .filter((b) => m.badges.includes(b.id))
                      .map((b) => (
                        <span key={b.id} title={`${b.name}: ${b.summary}`}>
                          <ClubBadgeIcon url={b.iconUrl} name={b.name} className="size-6" />
                        </span>
                      ))}
                  </span>
                )}
                <span className="block truncate text-xs text-muted-foreground sm:hidden">{m.contact}</span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <span className="block truncate text-muted-foreground" title={m.contact ?? undefined}>
                  {m.contact ?? '—'}
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="flex flex-wrap gap-1">
                  {m.tiers.length === 0 && <span className="text-muted-foreground">—</span>}
                  {m.tiers.map((t) => {
                    const sport = sports[t.sportId]
                    const Icon = sport.icon
                    return (
                      <Badge key={t.sportId} variant="outline" className="gap-1" title={sport.name}>
                        <Icon aria-hidden />
                        {sport.tiers.find((tier) => tier.id === t.tierId)?.label ?? t.tierId}
                        <span className="sr-only">in {sport.name}</span>
                      </Badge>
                    )
                  })}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {m.linked ? (
                  <Badge variant="secondary" className="gap-1">
                    <UserCheck aria-hidden />
                    Joined
                  </Badge>
                ) : m.invite?.status === 'pending' ? (
                  <Badge variant="outline" className="gap-1" title={`Sent to ${m.email ?? ''}`}>
                    <MailCheck aria-hidden />
                    Invited {sentOn(m.invite.sentAt)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <span className="flex justify-end gap-1">
                  {invitesOn && !m.linked && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onInvite(m)}
                      aria-label={m.invite?.status === 'pending' ? `Resend ${m.name}'s invite` : `Invite ${m.name}`}
                      title={m.invite?.status === 'pending' ? 'Resend invite' : 'Invite by email'}
                    >
                      <Mail />
                    </Button>
                  )}
                  {invitesOn && m.invite?.status === 'pending' && !m.linked && (
                    <Button variant="ghost" size="icon-sm" onClick={() => onCancelInvite(m)} aria-label={`Cancel ${m.name}'s invite`} title="Cancel invite">
                      <MailX />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-sm" onClick={() => onEdit(m)} aria-label={`Edit ${m.name}`} title={`Edit ${m.name}`}>
                    <Pencil />
                  </Button>
                  <ConfirmButton
                    iconOnly
                    variant="ghost"
                    label={`Remove ${m.name}`}
                    icon={UserMinus}
                    title={`Remove ${m.name} from the club?`}
                    description="They leave the roster and any planned sessions. Sessions they already played keep their results."
                    confirmLabel="Remove member"
                    pending={removingId === m.id}
                    onConfirm={() => onRemove(m)}
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
