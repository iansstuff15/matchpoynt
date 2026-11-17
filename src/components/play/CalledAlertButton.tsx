import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CalledAlertButtonProps {
  on: boolean
  onToggle: () => void
}

/** "Alert me when I'm called": buzz and notify when they're up next or on court, so the phone can go in a pocket. */
export default function CalledAlertButton({ on, onToggle }: CalledAlertButtonProps) {
  return (
    <Button variant={on ? 'default' : 'outline'} size="sm" onClick={onToggle} aria-pressed={on} title="Buzz and notify you when you're up next or on court">
      {on ? <Bell /> : <BellOff />}
      {on ? 'Alerts on' : "Alert me when I'm called"}
    </Button>
  )
}
