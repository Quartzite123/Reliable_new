import { useCallback, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PRIMARY_NAV, type NavItem } from '@/routes/navConfig'
import { useVisibleNav } from '@/routes/useVisibleNav'
import { cn } from '@/utils/cn'
import { LogoMark } from '@/components/icons/Logo'
import { ChevronRightIcon } from '@/components/icons/Icon'

/**
 * Double chevron pointing left — mirrors the reopen tab in AppShell, so
 * the pair reads as one control: << pushes the rail away, >> brings it
 * back. Local to this file rather than added to the shared Icon set,
 * since nothing else uses it.
 */
function ChevronsLeftIcon(props: { className?: string }) {
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
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </svg>
  )
}

/**
 * Nav rows carry an active marker bar on the left as well as a tinted
 * background. Colour alone is a weak signal in sunlight on a cheap phone
 * screen, and the audience skews low tech-literacy — the bar gives the
 * active item a second, positional cue.
 */
const linkClass = (isActive: boolean) =>
  cn(
    'group relative flex min-h-11 items-center gap-3 rounded-lg py-2 pr-3 pl-4 text-sm font-medium',
    'before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-1 before:rounded-full before:transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-800 before:bg-lime-400'
      : 'text-gray-600 before:bg-transparent hover:bg-gray-100 hover:text-gray-900',
  )

function NavRow({ item, indent = false, exactEnd = false }: { item: NavItem; indent?: boolean; exactEnd?: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.href}
      end={exactEnd}
      className={({ isActive }) => cn(linkClass(isActive), indent && 'min-h-10 py-1.5 pl-11 text-[13px]')}
    >
      {({ isActive }) => (
        <>
          {Icon && (
            <Icon
              className={cn('h-5 w-5 shrink-0', isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600')}
            />
          )}
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

/** Remembers which nav groups the user left open, per group href. */
const GROUP_STORAGE_KEY = 'rf.sidebar.openGroups'

function readOpenGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(GROUP_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function writeOpenGroups(next: Record<string, boolean>) {
  try {
    localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode / quota — the nav still works, it just won't remember */
  }
}

/**
 * A nav entry that is itself a link and also has children — Inventory,
 * which has eight sub-items and on its own accounted for most of the
 * sidebar's scroll length. The children now collapse behind a chevron.
 *
 * Default state: open, so nothing becomes invisible to a worker who does
 * not know it is there. Once the user collapses it, that choice is
 * remembered. Navigating to a child route always forces it open, so a
 * deep link can never land you on a page whose nav entry is hidden.
 */
function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(() => readOpenGroups()[item.href] ?? true)
  const panelId = `nav-group-${item.href.replace(/\W+/g, '-')}`

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      writeOpenGroups({ ...readOpenGroups(), [item.href]: next })
      return next
    })
  }, [item.href])

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <NavRow item={item} exactEnd />
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? `Hide ${item.label} pages` : `Show ${item.label} pages`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <ChevronRightIcon className={cn('h-4 w-4 transition-transform duration-150', open && 'rotate-90')} />
        </button>
      </div>

      {open && (
        <div id={panelId} className="flex flex-col gap-1">
          {item.children?.map((child) => (
            <NavRow key={child.href} item={child} indent exactEnd={child.href === item.href} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Brand/logo header shared by the desktop sidebar and the mobile drawer. */
export function SidebarBrand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-2">
      <LogoMark className="h-9 w-9 shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold text-gray-900">Reliable Fresh</p>
        <p className="truncate text-xs text-gray-500">Export Management</p>
      </div>
    </div>
  )
}

/** The nav content shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav() {
  const { operational, admin } = useVisibleNav()

  return (
    <>
      {admin.length > 0 && (
        <nav aria-label="Administration" className="flex flex-col gap-1">
          <p className="mb-1 px-4 text-xs font-semibold tracking-wide text-gray-400 uppercase">Administration</p>
          {admin.map((item) => (
            <NavRow key={item.href} item={item} />
          ))}
        </nav>
      )}

      <nav aria-label="Primary" className="flex flex-col gap-1">
        {PRIMARY_NAV.map((item) => (
          <NavRow key={item.href} item={item} />
        ))}
      </nav>

      {operational.length > 0 && (
        <nav aria-label="Operations" className="flex flex-col gap-1">
          <p className="mb-1 px-4 text-xs font-semibold tracking-wide text-gray-400 uppercase">Operations</p>
          {operational.map((item) => (item.children ? <NavGroup key={item.href} item={item} /> : <NavRow key={item.href} item={item} />))}
        </nav>
      )}
    </>
  )
}

interface SidebarProps {
  /** Hides the whole rail so the main content can use the full width. */
  collapsed?: boolean
  onCollapse?: () => void
}

/**
 * Desktop/tablet sidebar. Hidden below `lg`, where MobileNav and the
 * drawer take over.
 *
 * Collapsing removes the rail entirely rather than shrinking it to an
 * icon rail. Icon-only nav was considered and rejected: a leaf and a
 * flask are not self-explanatory to this audience, and a rail that is
 * present but unreadable is worse than one that is honestly absent. The
 * reopen control lives in AppShell.
 */
export function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  if (collapsed) return null

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-gray-200 bg-white p-3 lg:flex">
      <div className="flex items-center justify-between gap-1 pt-1">
        <SidebarBrand />
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Hide menu"
            title="Hide menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      <SidebarNav />
    </aside>
  )
}
