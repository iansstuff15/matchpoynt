import { feedbackLimits, type FeedbackAnswer, type FeedbackQuestion } from '@matchpoynt/shared'
import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

interface FeedbackQuestionFieldProps {
  question: FeedbackQuestion
  value: FeedbackAnswer['value'] | undefined
  onChange: (value: FeedbackAnswer['value']) => void
  /** Number shown before the question. */
  index: number
}

const yesNo = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

/** One question of a club's feedback form, answered: a score, a choice, yes or no, or written. */
export default function FeedbackQuestionField({ question, value, onChange, index }: FeedbackQuestionFieldProps) {
  const id = useId()
  const legend = (
    <legend className="mb-2 text-sm font-medium">
      {index}. {question.prompt}
      {question.required ? <span className="text-destructive"> *</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}
    </legend>
  )

  if (question.kind === 'text') {
    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>
          {index}. {question.prompt}
          {question.required ? <span className="text-destructive"> *</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}
        </Label>
        <Textarea id={id} value={typeof value === 'string' ? value : ''} maxLength={feedbackLimits.textAnswerMaxLength} rows={3} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }

  const options =
    question.kind === 'rating'
      ? Array.from({ length: feedbackLimits.ratingMax }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))
      : question.kind === 'yes_no'
        ? yesNo
        : question.options.map((o) => ({ value: o, label: o }))
  const current = value === undefined ? '' : question.kind === 'yes_no' ? (value ? 'yes' : 'no') : String(value)
  const pick = (v: string) => onChange(question.kind === 'rating' ? Number(v) : question.kind === 'yes_no' ? v === 'yes' : v)

  return (
    <fieldset>
      {legend}
      <RadioGroup value={current} onValueChange={pick} className={question.kind === 'choice' ? 'grid gap-2' : 'flex flex-wrap gap-2'} aria-required={question.required}>
        {options.map((o) => (
          <Label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10">
            <RadioGroupItem value={o.value} aria-label={question.kind === 'rating' ? `${o.label} out of ${feedbackLimits.ratingMax}` : o.label} />
            {o.label}
          </Label>
        ))}
      </RadioGroup>
      {question.kind === 'rating' && <p className="mt-1 text-xs text-muted-foreground">1 is poor, {feedbackLimits.ratingMax} is great.</p>}
    </fieldset>
  )
}
