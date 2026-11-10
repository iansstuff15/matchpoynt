import type { SessionSettings } from '@matchpoynt/shared'
import { Clock, Hand, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { matchmakingStrategies } from '@/config/matchmaking'
import type { Sport } from '@/interfaces/Sport'
import { describeMatchFormat } from '@/utils/scoring/describe'

interface SessionSummaryProps {
  settings: SessionSettings
  sport: Sport
}

/** One-line view of how the session is set up. */
export default function SessionSummary({ settings, sport }: SessionSummaryProps) {
  const Icon = sport.icon
  const format = sport.scoring.find((f) => f.id === settings.scoring.formatId)
  const strategy = matchmakingStrategies.find((s) => s.id === settings.matchmaking)
  const StrategyIcon = strategy?.icon

  return (
    <ul aria-label="Session settings" className="flex flex-wrap gap-2">
      <li className="flex">
        <Badge>
          <Icon aria-hidden />
          {sport.name}
        </Badge>
      </li>
      {format && (
        <li className="flex">
          <Badge variant="secondary">{format.label}</Badge>
        </li>
      )}
      <li className="flex">
        <Badge variant="secondary">{describeMatchFormat(settings.scoring.matchFormat, sport)}</Badge>
      </li>
      {settings.rules.queueing === 'manual' && (
        <li className="flex">
          <Badge variant="outline">
            <Hand aria-hidden />
            Manual queueing
          </Badge>
        </li>
      )}
      {settings.rules.queueing === 'automatic' && strategy && StrategyIcon && (
        <li className="flex">
          <Badge variant="outline">
            <StrategyIcon aria-hidden />
            {strategy.label}
          </Badge>
        </li>
      )}
      {settings.rules.queueing === 'automatic' && settings.rules.autoFill && (
        <li className="flex">
          <Badge variant="outline">
            <Zap aria-hidden />
            Auto-fill
          </Badge>
        </li>
      )}
      {settings.rules.timeLimitMinutes !== null && (
        <li className="flex">
          <Badge variant="outline">
            <Clock aria-hidden />
            {settings.rules.timeLimitMinutes} min limit
          </Badge>
        </li>
      )}
    </ul>
  )
}
