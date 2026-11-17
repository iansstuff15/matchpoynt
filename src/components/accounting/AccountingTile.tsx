import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AccountingTileProps {
  label: string
  value: string
  note: string
  icon: LucideIcon
}

/** One headline figure on the accounting dashboard. */
export default function AccountingTile({ label, value, note, icon: Icon }: AccountingTileProps) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-4" aria-hidden />
          {label}
        </CardDescription>
        <CardTitle className="accounting-tile-value">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{note}</CardContent>
    </Card>
  )
}
