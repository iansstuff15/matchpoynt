import { CalendarDays } from 'lucide-react'
import { setupSteps } from '@/config/sessionSetup'
import type { PlanStep } from '@/interfaces/PlanStep'

/** The plan-a-session dialog: its own details step, then the session setup steps. Members are picked from the club. */
export const planSteps: PlanStep[] = [
  { id: 'details', label: 'Details', description: 'Name the session and say when it is.', icon: CalendarDays },
  ...setupSteps.map((step) =>
    step.id === 'members' ? { ...step, description: 'Pick the club members on the roster. They check in when they arrive.' } : step,
  ),
]
