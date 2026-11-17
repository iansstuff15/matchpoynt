import { accountLimits, type ProfileInput } from '@matchpoynt/shared'
import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import HandleField from '@/components/common/HandleField'
import { useNameCheck } from '@/utils/hooks/useNameCheck'

interface ProfileStepProps {
  profile: ProfileInput
  onChange: (patch: Partial<ProfileInput>) => void
}

export default function ProfileStep({ profile, onChange }: ProfileStepProps) {
  const ids = { first: useId(), last: useId(), phone: useId(), city: useId() }
  const username = useNameCheck('username', profile.username)
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={ids.first}>First name</Label>
          <Input id={ids.first} autoComplete="given-name" required maxLength={accountLimits.nameMaxLength} value={profile.firstName} onChange={(e) => onChange({ firstName: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={ids.last}>Last name</Label>
          <Input id={ids.last} autoComplete="family-name" required maxLength={accountLimits.nameMaxLength} value={profile.lastName} onChange={(e) => onChange({ lastName: e.target.value })} />
        </div>
      </div>
      <HandleField label="Username" value={profile.username} onChange={(value) => onChange({ username: value })} check={username} hint="Unique to you, like @maria. It's also your name on courts, queues and leaderboards." />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={ids.phone}>
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id={ids.phone} type="tel" autoComplete="tel" maxLength={accountLimits.phoneMaxLength} value={profile.phone ?? ''} onChange={(e) => onChange({ phone: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={ids.city}>
            City <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id={ids.city} autoComplete="address-level2" maxLength={accountLimits.cityMaxLength} value={profile.city ?? ''} onChange={(e) => onChange({ city: e.target.value })} />
        </div>
      </div>
    </div>
  )
}
