import { SearchableSelect } from '@/components/forms/SearchableSelect'
import type { EntityId } from '@/types/common'
import { useFarmers } from '../hooks'

interface FarmerSelectorProps {
  id: string
  value: EntityId | null
  onChange: (farmerId: EntityId) => void
  hasError?: boolean
}

/** Reference-data picker for forms that hang off an existing farmer (e.g. Plot registration). */
export function FarmerSelector({ id, value, onChange, hasError }: FarmerSelectorProps) {
  const { data: farmers } = useFarmers()

  const options = (farmers ?? [])
    .filter((f) => f.status === 'active')
    .map((f) => ({ value: f.id, label: f.name }))

  return (
    <SearchableSelect
      id={id}
      value={value}
      onChange={(v) => onChange(Number(v))}
      options={options}
      hasError={hasError}
      placeholder="Search farmer by name"
      emptyLabel="No active farmers match"
    />
  )
}
