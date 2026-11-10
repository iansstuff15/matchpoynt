import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Sport } from '@/interfaces/Sport'

interface SportCardProps {
  sport: Sport
}

/** Summary of one sport: scoring formats and fee label, all from config. */
export default function SportCard({ sport }: SportCardProps) {
  const Icon = sport.icon
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
          <CardTitle className="font-display text-lg">{sport.name}</CardTitle>
        </div>
        <CardDescription>{sport.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {sport.scoring.map((format) => (
          <Badge key={format.id} variant="secondary">
            {format.label}
          </Badge>
        ))}
        <Badge variant="outline">{sport.terminology.equipmentFee}</Badge>
      </CardContent>
    </Card>
  )
}
