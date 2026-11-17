import type { ProfileInput, ProfilePageView } from '@matchpoynt/shared'
import { Check, KeyRound, LoaderCircle, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import ProfileStep from '@/components/auth/signup/ProfileStep'
import SportsStep from '@/components/auth/signup/SportsStep'
import RadioCard from '@/components/common/RadioCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import SetupStepNav from '@/components/session/setup/SetupStepNav'
import SocialLinksEditor from '@/components/social/SocialLinksEditor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { profileSettingsGroups, type ProfileSettingsGroup } from '@/config/profileSettings'
import { accountRoleOptions } from '@/config/signUp'
import { useFeatures } from '@/utils/hooks/useFeatures'
import type { useProfileActions } from '@/utils/hooks/useProfile'

interface ProfileSettingsDialogProps {
  page: ProfilePageView
  actions: ReturnType<typeof useProfileActions>
  /** The group on screen; `null` while closed. */
  group: ProfileSettingsGroup | null
  onGroupChange: (group: ProfileSettingsGroup | null) => void
}

/** The saved profile as an editable draft. The terms were accepted when it was made. */
const draftOf = ({ profile }: ProfilePageView): ProfileInput => ({
  firstName: profile.firstName ?? '',
  lastName: profile.lastName ?? '',
  username: profile.username ?? '',
  phone: profile.phone,
  city: profile.city,
  role: profile.role ?? 'both',
  acceptTerms: true,
  sports: profile.sports,
})

/** Draft state lives here, so it resets each time the dialog opens. */
function ProfileForm({ page, actions, group }: Omit<ProfileSettingsDialogProps, 'group' | 'onGroupChange'> & { group: 'details' | 'sports' }) {
  const [draft, setDraft] = useState(() => draftOf(page))
  const { saveProfile } = actions
  const save = () => saveProfile.mutate(draft)
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      {group === 'details' ? (
        <>
          <ProfileStep profile={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} />
          <fieldset className="grid gap-2">
            <Label asChild>
              <legend>How you use Matchpoynt</legend>
            </Label>
            <RadioGroup value={draft.role} onValueChange={(role) => setDraft({ ...draft, role: role as ProfileInput['role'] })} className="sm:grid-cols-3">
              {accountRoleOptions.map((r) => (
                <RadioCard key={r.id} value={r.id} title={r.label} />
              ))}
            </RadioGroup>
          </fieldset>
        </>
      ) : (
        <SportsStep sports={draft.sports} onChange={(sports) => setDraft({ ...draft, sports })} />
      )}
      {Boolean(saveProfile.error) && <ErrorBanner error={saveProfile.error} action="save your profile" onRetry={saveProfile.isPending ? undefined : save} />}
      <div className="flex justify-end">
        <Button type="submit" disabled={saveProfile.isPending}>
          {saveProfile.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Save profile
        </Button>
      </div>
    </form>
  )
}

/**
 * Everything editable about the profile, behind its settings button: a
 * sidebar of groups (details, sports, social links, account) and the group on
 * screen. The photo changes by clicking it on the profile page.
 */
export default function ProfileSettingsDialog({ page, actions, group, onGroupChange }: ProfileSettingsDialogProps) {
  const { web } = useFeatures()
  const current = group ?? 'details'
  const meta = profileSettingsGroups.find((g) => g.id === current)!

  return (
    <Dialog open={group !== null} onOpenChange={(open) => !open && onGroupChange(null)}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Profile settings</DialogTitle>
          <DialogDescription>Each group saves on its own. Change your photo by clicking it on your profile.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[11rem_1fr]">
          <SetupStepNav label="Profile settings" steps={profileSettingsGroups} current={current} errors={{}} onSelect={onGroupChange} />
          <section aria-labelledby="profile-settings-group" className="min-h-0 overflow-y-auto pr-1">
            <h3 id="profile-settings-group" className="font-display text-lg font-semibold">
              {meta.label}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">{meta.description}</p>
            {(current === 'details' || current === 'sports') && <ProfileForm key={current} page={page} actions={actions} group={current} />}
            {current === 'social' && (
              <SocialLinksEditor saved={page.socialLinks} pending={actions.saveSocial.isPending} error={actions.saveSocial.error} onSave={(links) => actions.saveSocial.mutate(links)} />
            )}
            {current === 'account' && (
              <div className="grid gap-4 text-sm">
                <p>
                  You sign in as <span className="font-medium">{page.email ?? 'a guest'}</span>.
                </p>
                {web.signInEmail && (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="justify-self-start">
                      <Link to="/account/password">
                        <KeyRound />
                        Set or change your password
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-self-start">
                      <Link to="/account/email">
                        <Mail />
                        Change your email
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
