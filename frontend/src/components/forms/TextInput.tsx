import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { baseInputClass, errorInputClass } from './inputStyles'

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { hasError, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="text"
      className={cn(baseInputClass, hasError && errorInputClass, className)}
      {...props}
    />
  )
})
