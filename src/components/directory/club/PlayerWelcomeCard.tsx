import type { WelcomeLink } from '@matchpoynt/shared'
import { ExternalLink, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** The club's welcome for members: its message and the links it shares (group chat, rules…). */
export default function PlayerWelcomeCard({ clubName, message, links }: { clubName: string; message: string | null; links: WelcomeLink[] }) {
  return (
    <Card aria-labelledby="welcome-title">
      <CardHeader>
        <CardTitle id="welcome-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <PartyPopper className="size-5" aria-hidden />
          Welcome to {clubName}
        </CardTitle>
        {!message && <CardDescription>You're a member. The club's sessions are below.</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4">
        {message && <p className="text-sm whitespace-pre-line">{message}</p>}
        {links.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label={`Links from ${clubName}`}>
            {links.map((l) => (
              <li key={l.url}>
                <Button asChild variant="outline" size="sm">
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                    {l.label}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
