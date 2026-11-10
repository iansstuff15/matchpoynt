import type { ProfileInput, SignUpStepId } from '@matchpoynt/shared'
import { ArrowLeft, ArrowRight, Check, LoaderCircle, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import AccountStep from '@/components/auth/signup/AccountStep'
import AgreementsStep from '@/components/auth/signup/AgreementsStep'
import ProfileStep from '@/components/auth/signup/ProfileStep'
import SportsStep from '@/components/auth/signup/SportsStep'
import StepProgress from '@/components/auth/signup/StepProgress'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { signUpSteps } from '@/config/signUp'
import { ApiRequestError } from '@/utils/api/errors'
import { useSaveProfile, useSignUp } from '@/utils/hooks/useAccount'
import { useAcceptInvite } from '@/utils/hooks/useInvites'

interface SignUpFormProps {
  /**
   * `sign-up` creates an account; `complete` fills in what a signed-in profile
   * is missing; `invite` is an account made by a club invite link: it sets its
   * own password (email fixed) and fills in its profile, then joins the club.
   */
  mode: 'sign-up' | 'complete' | 'invite'
  initialProfile: ProfileInput
  /** `invite` mode: the invite's token and the email it was sent to. */
  invite?: { token: string; email: string }
}

/** The steps the server flagged, so the form can jump back to them. */
function flaggedSteps(error: unknown): Set<SignUpStepId> {
  const ids = new Set(signUpSteps.map((s) => s.id as string))
  return new Set(error instanceof ApiRequestError ? (Object.keys(error.fields).filter((k) => ids.has(k)) as SignUpStepId[]) : [])
}

export default function SignUpForm({ mode, initialProfile, invite }: SignUpFormProps) {
  const navigate = useNavigate()
  const steps = mode === 'complete' ? signUpSteps.filter((s) => s.id !== 'account') : signUpSteps
  const [index, setIndex] = useState(0)
  const [account, setAccount] = useState({ email: invite?.email ?? '', password: '', confirm: '' })
  const [profile, setProfile] = useState(initialProfile)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const signUp = useSignUp()
  const saveProfile = useSaveProfile()
  const accept = useAcceptInvite(invite?.token ?? '')
  const save = mode === 'sign-up' ? signUp : mode === 'invite' ? accept : saveProfile
  const flagged = flaggedSteps(save.error)

  // When a new server error arrives, go back to the first step it flags.
  const [seenError, setSeenError] = useState<unknown>(null)
  if (save.error !== seenError) {
    setSeenError(save.error)
    const first = steps.findIndex((s) => flagged.has(s.id))
    if (first >= 0) setIndex(first)
  }

  const step = steps[index]!
  const isLast = index === steps.length - 1
  const patchProfile = (patch: Partial<ProfileInput>) => setProfile((p) => ({ ...p, ...patch }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!isLast) return setIndex((i) => i + 1)
    if (mode === 'invite') {
      accept.mutate({ password: account.password, profile }, { onSuccess: (res) => navigate(res.redirectTo) })
    } else if (mode === 'sign-up') {
      signUp.mutate(
        { email: account.email, password: account.password, profile },
        { onSuccess: (res) => (res.confirmEmail ? setSentTo(account.email) : navigate('/app')) },
      )
    } else {
      saveProfile.mutate(profile, { onSuccess: (status) => status.complete && navigate('/app') })
    }
  }

  if (sentTo) {
    return (
      <div role="status" className="grid gap-3 rounded-lg bg-primary/10 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <MailCheck className="size-4" aria-hidden />
          Confirm your email
        </p>
        <p>
          We sent a link to <span className="font-medium">{sentTo}</span>. Open it on this device to finish creating your account; your
          profile is saved and waiting.
        </p>
        <Button variant="link" className="h-auto justify-start p-0" asChild>
          <Link to="/sign-in">
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-5" aria-label={mode === 'complete' ? 'Complete your profile' : 'Create your account'}>
      <StepProgress steps={steps} current={index} flagged={flagged} />
      <div className="grid gap-1">
        <h2 className="font-display text-lg font-semibold">{step.label}</h2>
        <p className="text-sm text-muted-foreground">{step.description}</p>
      </div>

      {save.isError && flagged.has(step.id) && (
        <ErrorBanner error={save.error} action={mode === 'sign-up' ? 'create your account' : mode === 'invite' ? 'join the club' : 'save your profile'} />
      )}
      {save.isError && flagged.size === 0 && isLast && (
        <ErrorBanner error={save.error} action={mode === 'sign-up' ? 'create your account' : mode === 'invite' ? 'join the club' : 'save your profile'} />
      )}

      {step.id === 'account' && (
        <AccountStep {...account} emailLocked={mode === 'invite'} onChange={(patch) => setAccount((a) => ({ ...a, ...patch }))} />
      )}
      {step.id === 'profile' && <ProfileStep profile={profile} onChange={patchProfile} />}
      {step.id === 'sports' && <SportsStep sports={profile.sports} onChange={(sports) => patchProfile({ sports })} />}
      {step.id === 'agreements' && (
        <AgreementsStep role={profile.role} acceptTerms={profile.acceptTerms} onChange={(patch) => patchProfile(patch)} />
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" className="rounded-full" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
          <ArrowLeft />
          Back
        </Button>
        <Button
          type="submit"
          size="lg"
          className="rounded-full px-6"
          disabled={save.isPending || (step.id === 'sports' && profile.sports.length === 0)}
        >
          {save.isPending ? <LoaderCircle className="animate-spin" /> : isLast ? <Check /> : <ArrowRight />}
          {isLast ? (mode === 'sign-up' ? 'Create account' : mode === 'invite' ? 'Join club' : 'Save profile') : 'Next'}
        </Button>
      </div>
    </form>
  )
}
