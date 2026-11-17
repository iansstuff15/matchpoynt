import { feeCurrencies, feeDefaults, feeKinds, type CurrencyCode, type FeeKind, type FeeScheme } from '@matchpoynt/shared'
import { useId } from 'react'
import AmountField from '@/components/fees/AmountField'
import RadioCard from '@/components/common/RadioCard'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { feeKindIcons, noFee } from '@/config/fees'

interface FeeSchemeFieldsProps {
  fee: FeeScheme | null
  onChange: (fee: FeeScheme | null) => void
}

/**
 * Picks a joining fee: none, fixed, per game, or a base price plus per game,
 * with its currency and amounts. Form state only; the API checks the amounts.
 * Used by session setup, planned sessions and the club's fee scheme.
 */
export default function FeeSchemeFields({ fee, onChange }: FeeSchemeFieldsProps) {
  const currencyId = useId()
  const pick = (kind: string) => onChange(kind === 'none' ? null : { ...(fee ?? feeDefaults), kind: kind as FeeKind })
  const set = (patch: Partial<FeeScheme>) => fee && onChange({ ...fee, ...patch })

  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2">
        <Label asChild>
          <legend>How players pay</legend>
        </Label>
        <RadioGroup value={fee?.kind ?? 'none'} onValueChange={pick} className="sm:grid-cols-2">
          <RadioCard value="none" title={noFee.label} description={noFee.description} icon={feeKindIcons.none} />
          {(Object.keys(feeKinds) as FeeKind[]).map((kind) => (
            <RadioCard key={kind} value={kind} title={feeKinds[kind].label} description={feeKinds[kind].description} icon={feeKindIcons[kind]} />
          ))}
        </RadioGroup>
      </fieldset>

      {fee && (
        <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor={currencyId}>Currency</Label>
            <Select value={fee.currency} onValueChange={(currency) => set({ currency: currency as CurrencyCode })}>
              <SelectTrigger id={currencyId} className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(feeCurrencies) as CurrencyCode[]).map((code) => (
                  <SelectItem key={code} value={code}>
                    {code} · {feeCurrencies[code].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fee.kind !== 'per-game' && (
            <AmountField label={fee.kind === 'fixed' ? 'Fee per player' : 'Base price'} value={fee.base} currency={fee.currency} onChange={(base) => set({ base })} />
          )}
          {fee.kind !== 'fixed' && <AmountField label="Price per game" value={fee.perGame} currency={fee.currency} onChange={(perGame) => set({ perGame })} />}
          {/* Optional: what players may pay first; the rest is paid later. 0 for none. */}
          <AmountField label="Downpayment (optional)" value={fee.downpayment ?? 0} currency={fee.currency} onChange={(downpayment) => set({ downpayment })} />
        </div>
      )}
    </div>
  )
}
