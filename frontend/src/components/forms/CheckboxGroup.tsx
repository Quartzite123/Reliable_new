interface CheckboxGroupOption {
  value: string
  label: string
}

interface CheckboxGroupProps {
  name: string
  values: string[]
  onChange: (values: string[]) => void
  options: CheckboxGroupOption[]
}

export function CheckboxGroup({ name, values, onChange, options }: CheckboxGroupProps) {
  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value))
    } else {
      onChange([...values, value])
    }
  }

  return (
    <div role="group" aria-label={name} className="flex flex-col gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
        >
          <input
            type="checkbox"
            checked={values.includes(option.value)}
            onChange={() => toggle(option.value)}
            className="h-5 w-5"
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
