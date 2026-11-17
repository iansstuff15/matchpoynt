import { clubThemePresets, type ClubThemeInput } from '@matchpoynt/shared'
import ThemeSwatch from '@/components/club/ThemeSwatch'
import { cn } from '@/utils/cn'
import { colorsOf, sameColors } from '@/utils/forms/clubTheme'

/** The ready-made colour presets; the one matching `value` shows as picked. */
export default function ThemePresets({ value, onChange }: { value: ClubThemeInput; onChange: (colors: ClubThemeInput) => void }) {
  return (
    <ul className="theme-presets" aria-label="Colour presets">
      {clubThemePresets.map((preset) => {
        const picked = sameColors(value, preset)
        return (
          <li key={preset.name}>
            <button type="button" className={cn('theme-preset', picked && 'theme-preset-picked')} aria-pressed={picked} onClick={() => onChange(colorsOf(preset))}>
              <ThemeSwatch colors={preset} />
              {preset.name}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
