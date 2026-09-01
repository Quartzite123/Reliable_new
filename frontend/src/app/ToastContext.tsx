import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (message: string, variant?: ToastVariant) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      // An empty message is a deliberate no-op (2026-09-02) — lets
      // errorMessages.ts's toFriendlyMessage suppress a second toast for
      // an error the 401 interceptor already announced globally, without
      // every `showToast(toFriendlyMessage(error), 'error')` call site
      // needing its own `if (msg)` guard.
      if (!message) return
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, message, variant }])
      setTimeout(() => dismissToast(id), 5000)
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ toasts, showToast, dismissToast }), [toasts, showToast, dismissToast])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
