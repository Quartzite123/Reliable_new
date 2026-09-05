import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { MobileDrawer } from './MobileDrawer'
import { Header } from './Header'
import { NetworkStatusBanner } from './NetworkStatusBanner'

/** Double chevron pointing out of the left edge — the "push me back open" affordance. */
function ChevronsRightIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden
    >
      <path d="m6 17 5-5-5-5" />
      <path d="m13 17 5-5-5-5" />
    </svg>
  )
}

const COLLAPSE_STORAGE_KEY = 'rf.sidebar.collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* private mode / quota — collapsing still works for this session */
  }
}

/** Protected-area shell: sidebar (desktop/tablet) + bottom nav (mobile) + header, wrapping every authenticated route. */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Read once on mount so the rail does not flash open before the stored
  // preference is applied.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(readCollapsed)

  const setCollapsed = useCallback((value: boolean) => {
    setSidebarCollapsed(value)
    writeCollapsed(value)
  }, [])

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
        <Sidebar collapsed={sidebarCollapsed} onCollapse={() => setCollapsed(true)} />

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto p-4 pb-20 sm:p-6 lg:pb-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            <Outlet />
          </div>
        </main>
      </div>

      {/*
        Reopen control for the hidden rail.

        Fixed to the viewport rather than placed in the page flow, so it
        stays reachable at any scroll depth — on long lists the previous
        in-flow button scrolled away and left no way back to the nav
        without scrolling to the top.

        Only at `lg` and up, where the rail exists at all; below that the
        Header's menu button opens the drawer instead. Sits at z-30, under
        the drawer (z-50) and the bottom nav (z-40), so it can never cover
        an open menu.
      */}
      {sidebarCollapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Show menu"
          title="Show menu"
          className="fixed top-1/2 left-0 z-30 hidden h-20 w-6 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-gray-200 bg-white text-gray-400 shadow-card hover:w-7 hover:bg-gray-50 hover:text-brand-700 lg:flex"
        >
          <ChevronsRightIcon className="h-4 w-4" />
        </button>
      )}

      <MobileNav />
    </div>
  )
}
