import type { ClubSummary } from '@matchpoynt/shared'
import ClubInfoForm from '@/components/club/ClubInfoForm'
import ClubAppearanceSettings from '@/components/club/settings/ClubAppearanceSettings'
import ClubDeleteSettings from '@/components/club/settings/ClubDeleteSettings'
import ClubJoiningSettings from '@/components/club/settings/ClubJoiningSettings'
import ClubFeeSettings from '@/components/club/settings/ClubFeeSettings'
import ClubPaymentQrSettings from '@/components/club/settings/ClubPaymentQrSettings'
import SocialLinksEditor from '@/components/social/SocialLinksEditor'
import SetupStepNav from '@/components/session/setup/SetupStepNav'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { clubSettingsGroups } from '@/config/club'
import { clubSettingsMeta } from '@/config/clubSettings'
import type { ClubSettingsGroup } from '@/types/club'
import type { useClubActions } from '@/utils/hooks/useClubs'
import { useFeatures } from '@/utils/hooks/useFeatures'

interface ClubSettingsDialogProps {
  club: ClubSummary
  actions: ReturnType<typeof useClubActions>
  /** The group on screen; `null` while closed. */
  group: ClubSettingsGroup | null
  onGroupChange: (group: ClubSettingsGroup | null) => void
}

/**
 * Everything editable about a club, behind its settings button: a sidebar of
 * groups (general, social links, appearance, fees, delete) and the group on screen. Photos
 * are changed by clicking them on the dashboard.
 */
export default function ClubSettingsDialog({ club, actions, group, onGroupChange }: ClubSettingsDialogProps) {
  const { web } = useFeatures()
  const groups = clubSettingsGroups.filter((g) => !clubSettingsMeta[g].feature || web[clubSettingsMeta[g].feature!])
  const steps = groups.map((id) => ({ id, label: clubSettingsMeta[id].label, icon: clubSettingsMeta[id].icon }))
  const current = group && groups.includes(group) ? group : 'general'
  const meta = clubSettingsMeta[current]

  return (
    <Dialog open={group !== null} onOpenChange={(open) => !open && onGroupChange(null)}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{club.name} settings</DialogTitle>
          <DialogDescription>Each group saves on its own. Change the photos by clicking them on the dashboard.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[11rem_1fr]">
          <SetupStepNav label="Club settings" steps={steps} current={current} errors={{}} onSelect={onGroupChange} />
          <section aria-labelledby="club-settings-group" className="min-h-0 overflow-y-auto pr-1">
            <h3 id="club-settings-group" className="font-display text-lg font-semibold">
              {meta.label}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">{meta.description}</p>
            {current === 'general' && (
              <ClubInfoForm
                // Start over from the saved values whenever they change.
                key={`${club.name}\u0000${club.handle ?? ''}\u0000${club.description ?? ''}`}
                clubId={club.id}
                initial={{ name: club.name, handle: club.handle ?? '', description: club.description }}
                pending={actions.saveInfo.isPending}
                error={actions.saveInfo.error}
                action="save the club info"
                submitLabel="Save club info"
                onSubmit={(info) => actions.saveInfo.mutate(info)}
              />
            )}
            {current === 'social' && (
              <SocialLinksEditor saved={club.socialLinks} pending={actions.saveSocial.isPending} error={actions.saveSocial.error} onSave={(links) => actions.saveSocial.mutate(links)} />
            )}
            {current === 'joining' && <ClubJoiningSettings club={club} actions={actions} />}
            {current === 'appearance' && <ClubAppearanceSettings club={club} actions={actions} />}
            {current === 'fees' && <ClubFeeSettings club={club} actions={actions} />}
            {current === 'payments' && <ClubPaymentQrSettings club={club} actions={actions} />}
            {current === 'delete' && <ClubDeleteSettings club={club} actions={actions} />}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
