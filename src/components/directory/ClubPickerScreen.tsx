import type { DirectoryClubView } from '@matchpoynt/shared'
import { Compass } from 'lucide-react'
import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { clubPickerEntrance, pickTile } from '@/animations/clubPicker'
import { useMotion } from '@/animations/useMotion'
import ClubFinder from '@/components/directory/ClubFinder'
import MemberClubTile from '@/components/directory/MemberClubTile'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { choosePlayerClub } from '@/utils/hooks/usePlayerClub'

/**
 * The club picker once the clubs have loaded, animated as it appears
 * (`clubPickerEntrance`: the title, the club tiles, then the Find clubs sheet
 * in the bottom 40% of the screen, each fading in from a little below).
 * Picking a club fades it all out (`pickTile`), then opens the app in its colours.
 */
export default function ClubPickerScreen({ clubs }: { clubs: DirectoryClubView[] }) {
  const { web } = useFeatures()
  const navigate = useNavigate()
  const root = useRef<HTMLDivElement>(null)
  useMotion(root, clubPickerEntrance)
  const pick = async (club: DirectoryClubView) => {
    if (root.current) await pickTile(root.current)
    choosePlayerClub(club.id)
    navigate(web.playerView ? '/play' : club.handle ? `/c/${club.handle}` : '/profile')
  }

  return (
    <div ref={root} className="full-screen-page">
      <section aria-labelledby="choose-club-title" className="club-picker club-picker-stage">
        <h1 id="choose-club-title" data-picker-title className="club-picker-title">
          {clubs.length ? 'Who are you playing with?' : 'Find your club'}
        </h1>
        {clubs.length ? (
          <ul className="club-picker-grid" aria-label="Playing with">
            {clubs.map((club) => (
              <li key={club.id}>
                <MemberClubTile club={club} onPick={() => void pick(club)} />
              </li>
            ))}
          </ul>
        ) : (
          <p data-picker-tile className="max-w-md text-center text-deep-muted">
            You're not a member of a club yet. Find one below and join it, or ask a club to invite you.
          </p>
        )}
      </section>
      {/* Find clubs: a sheet with rounded top corners in the bottom 40% of the screen; it scrolls up for more. */}
      <section id="find" data-picker-sheet aria-labelledby="find-clubs-title" className="club-picker-sheet">
        <h2 id="find-clubs-title" className="flex items-center gap-2 font-display text-2xl font-bold">
          <Compass className="size-6" aria-hidden />
          Find clubs
        </h2>
        <p className="text-sm text-muted-foreground">Open a club to see its sessions, badges, fees and leaderboard, and ask to join.</p>
        <ClubFinder />
      </section>
    </div>
  )
}
