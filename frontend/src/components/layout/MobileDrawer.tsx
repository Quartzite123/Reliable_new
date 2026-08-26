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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-gray-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-white p-4 shadow-card-hover">
        <div className="flex items-center justify-between">
          <SidebarBrand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div onClick={onClose} className="flex flex-col gap-6">
          <SidebarNav />
        </div>
      </div>
    </div>
  )
}
