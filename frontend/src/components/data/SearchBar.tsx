interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search...', label = 'Search' }: SearchBarProps) {
  return (
    <div>
      <label htmlFor="search-bar" className="sr-only">
        {label}
      </label>
      <input
        id="search-bar"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-lg border border-gray-300 px-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-brand-600"
      />
    </div>
  )
}
