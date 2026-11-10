import { RefreshCw, Scale, Layers } from 'lucide-react'
import type { MatchmakingStrategy } from '@/interfaces/MatchmakingStrategy'

export const matchmakingStrategies: MatchmakingStrategy[] = [
  {
    id: 'rotation',
    label: 'Fair rotation',
    description: 'Whoever has played least goes next, then whoever has waited longest. Sides alternate in queue order.',
    icon: RefreshCw,
  },
  {
    id: 'balanced',
    label: 'Balanced sides',
    description: 'Same players as fair rotation, but split into the two sides with the closest total skill.',
    icon: Scale,
  },
  {
    id: 'skill-grouped',
    label: 'Skill grouped',
    description: 'The next fair player is matched with waiting players of the nearest tier, then sides are balanced.',
    icon: Layers,
  },
]
