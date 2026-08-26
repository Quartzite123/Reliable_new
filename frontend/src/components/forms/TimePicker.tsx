import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { baseInputClass, errorInputClass } from './inputStyles'

interface TimePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean
}

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { hasError, className, ...props },
  ref,
) {
  return (
    <input ref={ref} type="time" className={cn(baseInputClass, hasError && errorInputClass, className)} {...props} />
  )
})
