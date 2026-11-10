import { clubThemePresets, type ClubSummary, type ClubThemeInput } from '@matchpoynt/shared'
import { Check, LoaderCircle, Palette, RotateCcw } from 'lucide-react'
import { useId, useState } from 'react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { theme } from '@/config/theme'
import { cn } from '@/utils/cn'
import type { useClubActions } from '@/utils/hooks/useClubs'

interface ClubAppearanceCardProps {
  club: ClubSummary
  actions: ReturnType<typeof useClubActions>
}

/** Shown in the colour pickers while a colour is Matchpoynt's own (the pickers need some value). */
const pickerDefaults = { accent: '#f05a1a', sidebar: '#1c1c1c' }

const same = (a: ClubThemeInput, b: ClubThemeInput) => a.accent === b.accent && a.sidebar === b.sidebar

/**
 * The club's colours in the app: an accent (buttons, highlights, the selected
 * sidebar item) and the sidebar frame. Presets or any colour; the API checks
 * them and picks readable text colours. Sessions the club runs use them too.
 */
export default function ClubAppearanceCard({ club, actions }: ClubAppearanceCardProps) {
  const saved: ClubThemeInput = club.theme?.colors ?? { accent: null, sidebar: null }
  const [draft, setDraft] = useState<ClubThemeInput>(saved)
  const [seen, setSeen] = useState(saved)
  // Start over from the saved colours whenever they change.
  if (!same(seen, saved)) {
    setSeen(saved)
    setDraft(saved)
  }
  const { saveTheme } = actions
  const accentId = useId()
  const sidebarId = useId()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Palette className="size-5" aria-hidden />
          Appearance
        </CardTitle>
        <CardDescription>The club's colours in the app, and on the sessions it runs.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <ul className="theme-presets" aria-label="Colour presets">
          {clubThemePresets.map((preset) => {
            const picked = same(draft, preset)
            return (
              <li key={preset.name}>
                <button type="button" className={cn('theme-preset', picked && 'theme-preset-picked')} aria-pressed={picked} onClick={() => setDraft({ accent: preset.accent, sidebar: preset.sidebar })}>
                  <span className="theme-preset-swatch" style={{ background: preset.sidebar ?? theme.colors.sidebar }}>
                    {/* Matchpoynt's own colours come from config/theme.ts: the live ones may be this club's. */}
                    <span style={{ background: preset.accent ?? theme.colors.primary }} />
                  </span>
                  {preset.name}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={accentId}>Accent colour</Label>
            <div className="flex items-center gap-2">
              <input
                id={accentId}
                type="color"
                className="theme-color-input"
                value={draft.accent ?? pickerDefaults.accent}
                onChange={(e) => setDraft({ ...draft, accent: e.target.value })}
              />
              <span className="text-sm text-muted-foreground tabular-nums">{draft.accent ?? 'Matchpoynt'}</span>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={sidebarId}>Sidebar colour</Label>
            <div className="flex items-center gap-2">
              <input
                id={sidebarId}
                type="color"
                className="theme-color-input"
                value={draft.sidebar ?? pickerDefaults.sidebar}
                onChange={(e) => setDraft({ ...draft, sidebar: e.target.value })}
              />
              <span className="text-sm text-muted-foreground tabular-nums">{draft.sidebar ?? 'Matchpoynt'}</span>
            </div>
          </div>
        </div>

        {Boolean(saveTheme.error) && <ErrorBanner error={saveTheme.error} action="save the club colours" onRetry={saveTheme.isPending ? undefined : () => saveTheme.mutate(draft)} />}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" disabled={saveTheme.isPending || (!saved.accent && !saved.sidebar)} onClick={() => saveTheme.mutate({ accent: null, sidebar: null })}>
            <RotateCcw />
            Use Matchpoynt colours
          </Button>
          <Button type="button" disabled={saveTheme.isPending || same(draft, saved)} onClick={() => saveTheme.mutate(draft)}>
            {saveTheme.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
            Save colours
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
