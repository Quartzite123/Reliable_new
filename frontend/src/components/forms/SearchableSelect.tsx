import { useMemo, useState } from 'react'
import { cn } from '@/utils/cn'
import { baseInputClass, errorInputClass } from './inputStyles'
import type { SelectOption } from './Select'

interface SearchableSelectProps {
  id: string
  value: string | number | null
  onChange: (value: string | number) => void
  options: SelectOption[]
  placeholder?: string
  hasError?: boolean
  emptyLabel?: string
}

/**
 * Client-side filtered combobox for small-to-medium reference lists
 * (customers, materials, etc). For the farmer fuzzy-search flow itself,
 * see the domain-specific FarmerSelector, which calls the search API
 * server-side instead of filtering a fixed option list.
 */
export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Search...',
  hasError,
  emptyLabel = 'No matches',
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!query) return options
    const lower = query.toLowerCase()
    return options.filter((option) => option.label.toLowerCase().includes(lower))
  }, [query, options])

  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        className={cn(baseInputClass, hasError && errorInputClass)}
        placeholder={placeholder}
        value={open ? query : selectedLabel}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">{emptyLabel}</li>}
          {filtered.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(option.value)
                  setQuery('')
                  setOpen(false)
                }}
                className={cn(
                  'block min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-brand-50',
                  option.value === value && 'bg-brand-50 font-medium',
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
