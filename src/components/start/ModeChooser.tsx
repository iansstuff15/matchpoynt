import { Building2, Volleyball } from 'lucide-react'
import { useRef } from 'react'
import { clubPickerEntrance, pickTile } from '@/animations/clubPicker'
import { useMotion } from '@/animations/useMotion'
import type { AppMode } from '@/utils/hooks/useAppMode'

const choices: { mode: AppMode; label: string; description: string; icon: typeof Volleyball }[] = [
  { mode: 'player', label: 'Player', description: 'Pick a club, follow your sessions and your record.', icon: Volleyball },
  { mode: 'host', label: 'Club owner', description: 'Run the session board and manage your clubs.', icon: Building2 },
]

/** "How are you using Matchpoynt today?": player or club owner, animated like the club picker; picking fades it out before `onChoose`. */
export default function ModeChooser({ onChoose }: { onChoose: (mode: AppMode) => void }) {
  const root = useRef<HTMLElement>(null)
  useMotion(root, clubPickerEntrance)
  const go = async (mode: AppMode) => {
    if (root.current) await pickTile(root.current)
    onChoose(mode)
  }
  return (
    <section ref={root} aria-labelledby="start-title" className="full-screen-page club-picker">
      <h1 id="start-title" data-picker-title className="club-picker-title">
        How are you using Matchpoynt today?
      </h1>
      <ul className="club-picker-grid" aria-label="Ways to use Matchpoynt">
        {choices.map(({ mode, label, description, icon: Icon }) => (
          <li key={mode}>
            <button type="button" data-picker-tile className="club-tile" onClick={() => void go(mode)} aria-label={`${label}: ${description}`}>
              <span className="club-tile-avatar bg-glass">
                <Icon className="size-12" aria-hidden />
              </span>
              <span className="club-tile-name">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
