import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { baseInputClass, errorInputClass } from './inputStyles'

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { hasError, className, ...props },
  ref,
) {
  return (
    <input ref={ref} type="date" className={cn(baseInputClass, hasError && errorInputClass, className)} {...props} />
  )
})
