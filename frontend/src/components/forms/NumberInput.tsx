import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { baseInputClass, errorInputClass } from './inputStyles'

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean
  /** Adds a trailing unit label inside the field, e.g. "%", "kg". */
  unit?: string
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { hasError, unit, className, ...props },
  ref,
) {
  if (!unit) {
    return (
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        className={cn(baseInputClass, hasError && errorInputClass, className)}
        {...props}
      />
    )
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        className={cn(baseInputClass, 'pr-12', hasError && errorInputClass, className)}
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
        {unit}
      </span>
    </div>
  )
})
