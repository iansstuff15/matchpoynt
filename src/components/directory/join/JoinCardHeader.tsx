import type { ClubJoinCardView } from '@matchpoynt/shared'
import { Users } from 'lucide-react'
import ClubAvatar from '@/components/club/ClubAvatar'

/** The top of the join card: the club's photo, an invitation line, its name, @handle and size. */
export default function JoinCardHeader({ card, line }: { card: ClubJoinCardView; line: string }) {
  return (
    <div className="grid justify-items-center gap-2 text-center">
      <ClubAvatar name={card.name} url={card.avatarUrl} position={card.avatarPosition} className="size-20 text-2xl" />
      <p className="text-sm text-muted-foreground">{line}</p>
      <h1 id="join-title" className="font-display text-2xl font-bold">
        {card.name}
      </h1>
      <p className="flex flex-wrap items-center justify-center gap-x-3 text-sm text-muted-foreground">
        <span>@{card.handle}</span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-4" aria-hidden />
          {card.members} {card.members === 1 ? 'member' : 'members'}
        </span>
      </p>
      {card.description && <p className="line-clamp-3 text-sm">{card.description}</p>}
    </div>
  )
}
