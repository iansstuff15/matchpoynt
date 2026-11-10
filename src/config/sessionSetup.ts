import { Gavel, LandPlot, Shuffle, Trophy, Users } from 'lucide-react'
import type { SetupStep } from '@/interfaces/SetupStep'

export const setupSteps: SetupStep[] = [
  { id: 'courts', label: 'Courts', description: 'Pick the sport and name the courts in play.', icon: LandPlot },
  { id: 'members', label: 'Members', description: 'Add the players at this session and their skill tiers.', icon: Users },
  { id: 'scoring', label: 'Scoring', description: 'Choose how matches are scored and how many play per side.', icon: Trophy },
  { id: 'rules', label: 'Rules', description: 'Set court filling, time limits and late arrivals.', icon: Gavel },
  { id: 'matchmaking', label: 'Matchmaking', description: 'Choose how the next match is picked from the queue.', icon: Shuffle },
]
