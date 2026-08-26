import { useEffect } from 'react'

/** Warns before a browser-level navigation/close if a form is dirty. Route-level navigation should confirm separately via ConfirmationDialog. */
export function UnsavedChangesWarning({ when }: { when: boolean }) {
  useEffect(() => {
    if (!when) return

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [when])

  return null
}
