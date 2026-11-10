import { Separator } from '@/components/ui/separator'

export default function AuthDivider({ label = 'Or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <Separator className="flex-1" />
      {label}
      <Separator className="flex-1" />
    </div>
  )
}
