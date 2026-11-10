import HotStreakIcon from '@/components/leaderboard/badgeIcons/HotStreakIcon'

interface HotStreakTagProps {
  /** Wins in a row, from the API. */
  streak: number
}

const embers = [
  { delay: '0s', drift: '-3px' },
  { delay: '0.6s', drift: '4px' },
  { delay: '1.2s', drift: '1px' },
]

/** "Hot streak" tag with a dancing flame and rising embers. The API decides who's on one (the `hot-streak` badge). */
export default function HotStreakTag({ streak }: HotStreakTagProps) {
  return (
    <span className="hot-streak-tag" title={`${streak} wins in a row`}>
      {embers.map((e) => (
        <span
          key={e.delay}
          aria-hidden
          className="hot-streak-ember"
          style={{ animationDelay: e.delay, ['--ember-drift' as string]: e.drift }}
        />
      ))}
      <HotStreakIcon className="hot-streak-flame" />
      Hot streak{' '}
      <span className="tabular-nums">· {streak}</span>
    </span>
  )
}
