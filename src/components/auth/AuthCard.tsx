import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthCardProps {
  title: string
  description?: ReactNode
  children: ReactNode
}

/** The white form card on auth pages and on the landing page. */
export default function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <Card className="gap-6 rounded-2xl border-0 py-8 shadow-2xl sm:px-2">
      <CardHeader className="gap-2">
        <CardTitle>
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        </CardTitle>
        {description && <CardDescription className="text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  )
}
