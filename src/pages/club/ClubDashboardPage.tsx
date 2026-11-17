import type { ClubImageKind } from '@matchpoynt/shared'
import { useEffect, useState } from 'react'
import ClubHero from '@/components/club/ClubHero'
import ClubInfoCard from '@/components/club/dashboard/ClubInfoCard'
import ClubMoneyCard from '@/components/club/dashboard/ClubMoneyCard'
import ClubSessionsCard from '@/components/club/dashboard/ClubSessionsCard'
import ClubSetupDialog from '@/components/club/dashboard/ClubSetupDialog'
import PageMeta from '@/components/seo/PageMeta'
import { useClubPage } from '@/utils/hooks/useClubPage'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { recall, remember } from '@/utils/platform/remember'

const shownIds = () => (recall('setupShown') ?? '').split(',').filter(Boolean)

/**
 * The club's page (`/clubs/<id>`): its banner, its info and settings at a
 * glance, its sessions and this month's money. While anything is left to set
 * up, "Finish setting up" opens by itself the first time (in this browser) and
 * from the banner after that.
 */
export default function ClubDashboardPage() {
  const { view, actions, openSettings } = useClubPage()
  const { web } = useFeatures()
  const { club } = view
  const [editingPhoto, setEditingPhoto] = useState<ClubImageKind | null>(null)
  const left = view.setup.filter((item) => !item.done).length
  // Not while the club still needs its @handle: that dialog comes first.
  const [setupOpen, setSetupOpen] = useState(() => left > 0 && Boolean(club.handle) && !shownIds().includes(club.id))
  // Opened by itself once per club in this browser; the banner's button opens it after that.
  useEffect(() => {
    if (setupOpen && !shownIds().includes(club.id)) remember('setupShown', [...shownIds(), club.id].join(','))
  }, [setupOpen, club.id])

  return (
    <>
      <PageMeta title={club.name} description={club.description ?? `${club.name} on Matchpoynt: members, sessions, invoices and earnings.`} />
      <ClubHero
        club={club}
        actions={actions}
        onSettings={() => openSettings()}
        setupLeft={left}
        onSetup={() => setSetupOpen(true)}
        editing={editingPhoto}
        onEditingChange={setEditingPhoto}
      />
      <div className="club-dashboard-grid">
        <ClubInfoCard view={view} onEdit={() => openSettings()} />
        <div className="grid content-start gap-6">
          <ClubSessionsCard view={view} />
          {web.accounting && <ClubMoneyCard clubId={club.id} />}
        </div>
      </div>
      <ClubSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        clubId={club.id}
        items={view.setup}
        onAction={(action) => ('settings' in action ? openSettings(action.settings) : 'photo' in action ? setEditingPhoto(action.photo) : undefined)}
      />
    </>
  )
}
