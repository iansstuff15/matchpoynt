import { Moon, SquareDashed, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { shareBackgrounds } from '@/config/shareCards'
import type { ShareBackground } from '@/types/leaderboard'

const icons: Record<ShareBackground, LucideIcon> = { black: Moon, white: Sun, transparent: SquareDashed }

/** Black, white or transparent: what the share images are drawn on. */
export default function ShareBackgroundPicker({ value, onChange }: { value: ShareBackground; onChange: (value: ShareBackground) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Background</legend>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as ShareBackground)} className="flex flex-wrap gap-2">
        {(Object.keys(shareBackgrounds) as ShareBackground[]).map((id) => {
          const Icon = icons[id]
          return (
            <Label key={id} className="share-background-option">
              <RadioGroupItem value={id} className="sr-only" />
              <Icon aria-hidden />
              {shareBackgrounds[id].label}
            </Label>
          )
        })}
      </RadioGroup>
    </fieldset>
  )
}
