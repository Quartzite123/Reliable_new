interface RadioGroupOption {
  value: string
  label: string
}

interface RadioGroupProps {
  name: string
  value: string | undefined
  onChange: (value: string) => void
  options: RadioGroupOption[]
}

/** Large touch-target radio buttons — used for pass/fail and similar single-choice checklist fields. */
export function RadioGroup({ name, value, onChange, options }: RadioGroupProps) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((option) => {
        const checked = value === option.value
        return (
          <label
            key={option.value}
            className={
              checked
                ? 'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-2 border-brand-600 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-900'
                : 'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
            }
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="h-4 w-4"
            />
            {option.label}
          </label>
        )
      })}
    </div>
  )
}
