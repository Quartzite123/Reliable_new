import { useEffect } from 'react'
import { CloseIcon } from '@/components/icons/Icon'
import { SidebarBrand, SidebarNav } from './Sidebar'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

/** Full nav drawer for phones/tablets — opened from the Header's menu button, closes on backdrop click, link click, or Escape. */
export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Lock the page behind the drawer so a scroll gesture over the backdrop
  // does not move the list underneath — a common source of "I tapped the
  // wrong thing" on phones.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[86vw] flex-col gap-5 overflow-y-auto bg-white p-3 shadow-card-hover">
        <div className="flex items-center justify-between gap-2 pt-1">
          <SidebarBrand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div onClick={onClose} className="flex flex-col gap-5 pb-4">
          <SidebarNav />
        </div>
      </div>
    </div>
  )
}
