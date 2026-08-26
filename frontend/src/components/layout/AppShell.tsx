import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { MobileDrawer } from './MobileDrawer'
import { Header } from './Header'
import { NetworkStatusBanner } from './NetworkStatusBanner'

/** Protected-area shell: sidebar (desktop/tablet) + bottom nav (mobile) + header, wrapping every authenticated route. */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <NetworkStatusBanner />
      <Header onMenuClick={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 lg:pb-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
