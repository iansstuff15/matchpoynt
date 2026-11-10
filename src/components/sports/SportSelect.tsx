import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sportList } from '@/config/sports'
import type { SportId } from '@matchpoynt/shared'

interface SportSelectProps {
  value: SportId
  onChange: (sportId: SportId) => void
  id?: string
  disabled?: boolean
}

export default function SportSelect({ value, onChange, id, disabled }: SportSelectProps) {
  return (
    <Select value={value} disabled={disabled} onValueChange={(next) => onChange(next as SportId)}>
      <SelectTrigger id={id} className="w-48" aria-label="Sport">
        <SelectValue placeholder="Choose a sport" />
      </SelectTrigger>
      <SelectContent>
        {sportList.map(({ id: sportId, name, icon: Icon }) => (
          <SelectItem key={sportId} value={sportId}>
            <Icon aria-hidden />
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
