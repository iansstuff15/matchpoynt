import type { FeedbackQuestionResult, FeedbackSessionResult } from '@matchpoynt/shared'
import { MessageSquareQuote, Star } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { sports } from '@/config/sports'
import { formatWhen } from '@/utils/time/formatWhen'

/** How one question was answered: the average and spread of scores, the picks, or what people wrote. */
function QuestionResult({ result }: { result: FeedbackQuestionResult }) {
  const most = Math.max(1, ...result.counts.map((c) => c.count))
  return (
    <li className="grid gap-2">
      <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium">
        {result.prompt}
        <span className="text-xs font-normal text-muted-foreground">
          {result.answered} {result.answered === 1 ? 'answer' : 'answers'}
          {result.average !== null && (
            <span className="ml-2 inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="size-3.5" aria-hidden />
              {result.average.toFixed(1)} average
            </span>
          )}
        </span>
      </p>
      {result.counts.length > 0 && (
        <dl className="grid gap-1">
          {result.counts.map((c) => (
            <div key={c.label} className="grid grid-cols-[minmax(0,8rem)_1fr_2rem] items-center gap-2 text-xs">
              <dt className="truncate text-muted-foreground" title={c.label}>
                {c.label}
              </dt>
              <Progress value={(c.count / most) * 100} aria-label={`${c.label}: ${c.count}`} />
              <dd className="text-right tabular-nums">{c.count}</dd>
            </div>
          ))}
        </dl>
      )}
      {result.kind === 'text' &&
        (result.texts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No written answers.</p>
        ) : (
          <ul className="grid gap-1.5">
            {result.texts.map((t, i) => (
              <li key={i} className="rounded-lg bg-muted/50 p-2 text-sm">
                <span className="block whitespace-pre-line">{t.text}</span>
                <span className="text-xs text-muted-foreground">{t.name}</span>
              </li>
            ))}
          </ul>
        ))}
    </li>
  )
}

/** One finished session's feedback: how many answered, then each question's results. */
export default function FeedbackSessionCard({ session }: { session: FeedbackSessionResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={3} className="flex items-center gap-2 font-display">
          <MessageSquareQuote className="size-5" aria-hidden />
          {session.label}
        </CardTitle>
        <CardDescription>
          {[sports[session.sportId].name, `ended ${formatWhen(session.endedAt)}`, `${session.responses} of ${session.players} players answered`].join(' · ')}
        </CardDescription>
      </CardHeader>
      {session.responses > 0 && (
        <CardContent>
          <ul className="grid gap-5" aria-label={`Feedback on ${session.label}`}>
            {session.questions.map((q) => (
              <QuestionResult key={q.questionId} result={q} />
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}
