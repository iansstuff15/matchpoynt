import type { RivalView } from '@matchpoynt/shared'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatWhen } from '@/utils/time/formatWhen'

interface RivalsCardProps {
  id: string
  title: string
  description: string
  icon: LucideIcon
  people: RivalView[]
  /** What the record means here: "vs" (their wins against them) or "with" (wins together). */
  empty: string
}

/** Rivals or partners: who, how many matches, and their wins and losses in them, most played first. */
export default function RivalsCard({ id, title, description, icon: Icon, people, empty }: RivalsCardProps) {
  return (
    <Card aria-labelledby={id}>
      <CardHeader>
        <CardTitle className="font-display">
          <h2 id={id} className="flex items-center gap-2">
            <Icon className="size-5" aria-hidden />
            {title}
          </h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table aria-label={title}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Player</TableHead>
                <TableHead className="w-20 text-right">Played</TableHead>
                <TableHead className="w-20 text-right">W–L</TableHead>
                <TableHead className="hidden w-40 text-right sm:table-cell">Last played</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.played}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.wins}–{p.losses}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">{formatWhen(p.lastPlayedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
