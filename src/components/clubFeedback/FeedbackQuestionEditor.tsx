import { feedbackLimits, feedbackQuestionKinds, type FeedbackQuestion, type FeedbackQuestionKind } from '@matchpoynt/shared'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface FeedbackQuestionEditorProps {
  question: FeedbackQuestion
  index: number
  count: number
  onChange: (question: FeedbackQuestion) => void
  onMove: (by: -1 | 1) => void
  onRemove: () => void
}

const kindEntries = Object.entries(feedbackQuestionKinds) as [FeedbackQuestionKind, (typeof feedbackQuestionKinds)[FeedbackQuestionKind]][]

/** One question in the form builder: its kind, wording, whether it's required and, for choices, its answers. */
export default function FeedbackQuestionEditor({ question, index, count, onChange, onMove, onRemove }: FeedbackQuestionEditorProps) {
  const promptId = useId()
  const kindId = useId()
  const requiredId = useId()
  const n = index + 1
  const setOption = (i: number, value: string) => onChange({ ...question, options: question.options.map((o, j) => (j === i ? value : o)) })

  return (
    <li className="grid gap-3 rounded-xl border bg-card p-4" aria-label={`Question ${n}`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-0 flex-1 basis-64 gap-1.5">
          <Label htmlFor={promptId}>Question {n}</Label>
          <Input id={promptId} value={question.prompt} maxLength={feedbackLimits.promptMaxLength} onChange={(e) => onChange({ ...question, prompt: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={kindId}>Answer with</Label>
          <Select
            value={question.kind}
            onValueChange={(kind) =>
              onChange({ ...question, kind: kind as FeedbackQuestionKind, options: kind === 'choice' && question.options.length < feedbackLimits.minOptions ? ['', ''] : question.options })
            }
          >
            <SelectTrigger id={kindId} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kindEntries.map(([id, kind]) => (
                <SelectItem key={id} value={id}>
                  {kind.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{feedbackQuestionKinds[question.kind].description}</p>
      {question.kind === 'choice' && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Answers to choose from</legend>
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={option}
                maxLength={feedbackLimits.optionMaxLength}
                aria-label={`Question ${n}, answer ${i + 1}`}
                onChange={(e) => setOption(i, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={question.options.length <= feedbackLimits.minOptions}
                aria-label={`Remove answer ${i + 1} from question ${n}`}
                title="Remove this answer"
                onClick={() => onChange({ ...question, options: question.options.filter((_, j) => j !== i) })}
              >
                <X />
              </Button>
            </div>
          ))}
          {question.options.length < feedbackLimits.maxOptions && (
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => onChange({ ...question, options: [...question.options, ''] })}>
              <Plus />
              Add an answer
            </Button>
          )}
        </fieldset>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Switch id={requiredId} checked={question.required} onCheckedChange={(required) => onChange({ ...question, required })} />
          <Label htmlFor={requiredId} className="font-normal">
            Required
          </Label>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move question ${n} up`} title="Move up">
            <ArrowUp />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move question ${n} down`} title="Move down">
            <ArrowDown />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" disabled={count <= 1} onClick={onRemove} aria-label={`Remove question ${n}`} title="Remove question">
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  )
}
