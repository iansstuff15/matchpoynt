import type { PlanStepId } from '@matchpoynt/shared'
import type { SetupStep } from '@/interfaces/SetupStep'

/** A step of the plan-a-session dialog: the session setup steps plus the plan's details. */
export interface PlanStep extends Omit<SetupStep, 'id'> {
  id: PlanStepId
}
