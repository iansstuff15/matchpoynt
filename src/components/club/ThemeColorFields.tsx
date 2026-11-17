import type { ClubThemeInput } from '@matchpoynt/shared'
import { useId } from 'react'
import { Label } from '@/components/ui/label'

/** Shown in the colour pickers while a colour is Matchpoynt's own (the pickers need some value). */
const pickerDefaults = { accent: '#f05a1a', sidebar: '#1c1c1c', page: '#f4f4f4' }

const fields = [
  { key: 'accent', label: 'Accent colour' },
  { key: 'sidebar', label: 'Sidebar colour' },
  { key: 'page', label: 'Page colour' },
] as const

/** Any colour for the accent, the sidebar and the page, each "Matchpoynt" until picked. */
export default function ThemeColorFields({ value, onChange }: { value: ClubThemeInput; onChange: (colors: ClubThemeInput) => void }) {
  const ids = { accent: useId(), sidebar: useId(), page: useId() }
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {fields.map(({ key, label }) => (
        <div key={key} className="grid gap-1.5">
          <Label htmlFor={ids[key]}>{label}</Label>
          <div className="flex items-center gap-2">
            <input id={ids[key]} type="color" className="theme-color-input" value={value[key] ?? pickerDefaults[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />
            <span className="text-sm text-muted-foreground tabular-nums">{value[key] ?? 'Matchpoynt'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
