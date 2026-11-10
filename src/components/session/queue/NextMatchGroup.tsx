import type { NextMatchView } from '@matchpoynt/shared'
import { Fragment } from 'react'
import DraggablePlayer from '@/components/session/dnd/DraggablePlayer'
import PlayerChip from '@/components/session/dnd/PlayerChip'
import WaitTime from '@/components/session/queue/WaitTime'
import { sideNames } from '@/utils/feedback/sessionMessages'

interface NextMatchGroupProps {
  match: NextMatchView
  /** 0 for the very next match. */
  index: number
  /** The queue panel's clock (API time), for wait times. */
  now: number
}

/** A group the matchmaking will call, already split into sides. Players can still be dragged onto a court by hand. */
export default function NextMatchGroup({ match, index, now }: NextMatchGroupProps) {
  const title = index === 0 ? 'Next match' : `Match ${index + 1}`
  return (
    <li className="queue-group" aria-label={`${title}: ${sideNames(match.sides[0])} vs ${sideNames(match.sides[1])}`}>
      <p className="queue-group-label">{title}</p>
      <div className="queue-group-sides">
        {match.sides.map((side, s) => (
          <Fragment key={s}>
            {s === 1 && (
              <span className="court-vs" aria-hidden>
                vs
              </span>
            )}
            <ul className="player-name-list gap-1">
              {side.map((p) => (
                <li key={p.id}>
                  <DraggablePlayer player={{ playerId: p.id, name: p.name, from: 'queue' }}>
                    <PlayerChip name={p.name} trailing={<WaitTime waitingSince={p.waitingSince} now={now} />} />
                  </DraggablePlayer>
                </li>
              ))}
            </ul>
          </Fragment>
        ))}
      </div>
    </li>
  )
}
