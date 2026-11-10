import { Progress } from '@/components/ui/progress'
import type { SignUpStep } from '@/interfaces/SignUpStep'
import { cn } from '@/utils/cn'

interface StepProgressProps {
  steps: SignUpStep[]
  current: number
  flagged: Set<string>
}

/** "Step 2 of 4" with a bar and the step names; steps the server flagged are marked. */
export default function StepProgress({ steps, current, flagged }: StepProgressProps) {
  const step = steps[current]
  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium text-muted-foreground">
        Step {current + 1} of {steps.length} · {step?.label}
      </p>
      <Progress value={((current + 1) / steps.length) * 100} aria-label={`Step ${current + 1} of ${steps.length}`} />
      <ol className="flex justify-between text-xs">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={cn('text-muted-foreground', i === current && 'font-semibold text-foreground', flagged.has(s.id) && 'text-destructive')}
          >
            {s.label}
          </li>
        ))}
      </ol>
    </div>
  )
}
