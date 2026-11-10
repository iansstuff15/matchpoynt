import type { AccountRole } from '@matchpoynt/shared'
import { useId } from 'react'
import RadioCard from '@/components/common/RadioCard'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { accountRoleOptions } from '@/config/signUp'

interface AgreementsStepProps {
  role: AccountRole
  acceptTerms: boolean
  onChange: (patch: { role?: AccountRole; acceptTerms?: boolean }) => void
}

export default function AgreementsStep({ role, acceptTerms, onChange }: AgreementsStepProps) {
  const termsId = useId()
  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>How will you use Matchpoynt?</legend>
        </Label>
        <RadioGroup value={role} onValueChange={(v) => onChange({ role: v as AccountRole })}>
          {accountRoleOptions.map((o) => (
            <RadioCard key={o.id} value={o.id} title={o.label} description={o.description} />
          ))}
        </RadioGroup>
      </fieldset>
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <Checkbox id={termsId} required checked={acceptTerms} onCheckedChange={(v) => onChange({ acceptTerms: v === true })} />
        <Label htmlFor={termsId} className="grid gap-1 font-normal">
          <span className="font-medium">I accept the Matchpoynt terms of use</span>
          <span className="text-xs text-muted-foreground">Including how sessions, results and your display name are shared with other players.</span>
        </Label>
      </div>
    </div>
  )
}
