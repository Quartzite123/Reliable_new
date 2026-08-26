import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { baseInputClass, errorInputClass } from './inputStyles'

export interface SelectOption {
  /** Native `<option>` values coerce to string regardless — numeric EntityIds are accepted directly so call sites don't need to String() every id. */
  value: string | number
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  hasError?: boolean
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { hasError, options, placeholder, className, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(baseInputClass, hasError && errorInputClass, className)} {...props}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
})
