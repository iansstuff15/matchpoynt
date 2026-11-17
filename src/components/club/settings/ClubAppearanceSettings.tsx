import { clubThemeLimits, type ClubSummary, type ClubThemeInput } from '@matchpoynt/shared'
import { BookmarkPlus, Check, LoaderCircle, RotateCcw, X } from 'lucide-react'
import { useId, useState } from 'react'
import ThemeColorFields from '@/components/club/ThemeColorFields'
import ThemePresets from '@/components/club/ThemePresets'
import ThemeSwatch from '@/components/club/ThemeSwatch'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { noColors as none, sameColors as same } from '@/utils/forms/clubTheme'
import type { useClubActions } from '@/utils/hooks/useClubs'

interface ClubAppearanceSettingsProps {
  club: ClubSummary
  actions: ReturnType<typeof useClubActions>
}

/**
 * The club's colours in the app: an accent (buttons, highlights, the selected
 * sidebar item), the sidebar frame and the page in the middle. Presets, the
 * club's saved themes or any colour; the API checks them and works out
 * readable text, cards and borders. Sessions the club runs use them too.
 */
export default function ClubAppearanceSettings({ club, actions }: ClubAppearanceSettingsProps) {
  const saved: ClubThemeInput = club.theme?.colors ?? none
  const [draft, setDraft] = useState<ClubThemeInput>(saved)
  const [seen, setSeen] = useState(saved)
  // Start over from the saved colours whenever they change.
  if (!same(seen, saved)) {
    setSeen(saved)
    setDraft(saved)
  }
  const [themeName, setThemeName] = useState('')
  const { saveTheme, saveThemeAs, deleteSavedTheme } = actions
  const ids = { name: useId() }
  const draftIsBlank = !draft.accent && !draft.sidebar && !draft.page
  const full = club.savedThemes.length >= clubThemeLimits.maxSaved
  const saveAs = () => saveThemeAs.mutate({ name: themeName, colors: draft }, { onSuccess: () => setThemeName('') })

  return (
    <div className="grid gap-5">
        <ThemePresets value={draft} onChange={setDraft} />

        {club.savedThemes.length > 0 && (
          <div className="grid gap-2">
            <h4 className="text-sm font-medium">Saved themes</h4>
            <ul className="theme-presets" aria-label="Saved themes">
              {club.savedThemes.map((t) => {
                const picked = same(draft, t.colors)
                return (
                  <li key={t.id} className="theme-saved">
                    <button type="button" className="theme-preset" aria-pressed={picked} onClick={() => setDraft(t.colors)}>
                      <ThemeSwatch colors={t.colors} />
                      {t.name}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete the theme ${t.name}`}
                      title={`Delete ${t.name}`}
                      disabled={deleteSavedTheme.isPending}
                      onClick={() => deleteSavedTheme.mutate({ id: t.id, name: t.name })}
                    >
                      {deleteSavedTheme.isPending && deleteSavedTheme.variables?.id === t.id ? <LoaderCircle className="animate-spin" /> : <X />}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <ThemeColorFields value={draft} onChange={setDraft} />

        {Boolean(saveTheme.error) && <ErrorBanner error={saveTheme.error} action="save the club colours" onRetry={saveTheme.isPending ? undefined : () => saveTheme.mutate(draft)} />}
        {Boolean(saveThemeAs.error) && <ErrorBanner error={saveThemeAs.error} action="save the theme" onRetry={saveThemeAs.isPending ? undefined : saveAs} />}
        {Boolean(deleteSavedTheme.error) && deleteSavedTheme.variables && (
          <ErrorBanner
            error={deleteSavedTheme.error}
            action={`delete the theme ${deleteSavedTheme.variables.name}`}
            onRetry={deleteSavedTheme.isPending ? undefined : () => deleteSavedTheme.variables && deleteSavedTheme.mutate(deleteSavedTheme.variables)}
          />
        )}

        <form
          className="grid gap-1.5"
          aria-label="Save these colours as a theme"
          onSubmit={(e) => {
            e.preventDefault()
            saveAs()
          }}
        >
          <Label htmlFor={ids.name}>Theme name</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id={ids.name}
              className="min-w-0 flex-1 sm:max-w-64"
              placeholder="e.g. Finals night"
              maxLength={clubThemeLimits.nameMaxLength}
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={saveThemeAs.isPending || draftIsBlank || full}>
              {saveThemeAs.isPending ? <LoaderCircle className="animate-spin" /> : <BookmarkPlus />}
              Save theme
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {full
              ? `This club has ${clubThemeLimits.maxSaved} saved themes. Delete one to save another.`
              : draftIsBlank
                ? 'Pick at least one colour to save a theme.'
                : 'Saved themes sit beside the presets, ready to pick again.'}
          </p>
        </form>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" disabled={saveTheme.isPending || (!saved.accent && !saved.sidebar && !saved.page)} onClick={() => saveTheme.mutate(none)}>
            <RotateCcw />
            Use Matchpoynt colours
          </Button>
          <Button type="button" disabled={saveTheme.isPending || same(draft, saved)} onClick={() => saveTheme.mutate(draft)}>
            {saveTheme.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
            Save colours
          </Button>
        </div>
    </div>
  )
}
