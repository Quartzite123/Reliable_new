import { NavLink } from 'react-router-dom'
import { PRIMARY_NAV, type NavItem } from '@/routes/navConfig'
import { useVisibleNav } from '@/routes/useVisibleNav'
import { cn } from '@/utils/cn'
import { LogoMark } from '@/components/icons/Logo'

const linkClass = (isActive: boolean) =>
  cn(
    'group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
    isActive ? 'bg-brand-100 text-brand-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  )

function NavRow({ item, indent = false, exactEnd = false }: { item: NavItem; indent?: boolean; exactEnd?: boolean }) {
  const Icon = item.icon
  return (
    <NavLink to={item.href} end={exactEnd} className={({ isActive }) => cn(linkClass(isActive), indent && 'py-1.5 pl-11 text-[13px]')}>
      {({ isActive }) =>
        (
          <>
            {Icon && <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-brand-700' : 'text-gray-400 group-hover:text-gray-600')} />}
            <span className="truncate">{item.label}</span>
          </>
        )
      }
    </NavLink>
  )
}

/**
 * Renders as a clickable link (its own `href`) plus an indented sub-list —
 * e.g. Inventory (added 2026-08-11). `exactEnd` on the group header keeps it
 * from staying highlighted on every sub-route (React Router's default
 * `NavLink` match is a path-prefix match, not exact).
 */
function NavGroup({ item }: { item: NavItem }) {
  return (
    <div className="flex flex-col gap-1">
      <NavRow item={item} exactEnd />
      {item.children?.map((child) => (
        <NavRow key={child.href} item={child} indent exactEnd={child.href === item.href} />
      ))}
    </div>
  )
}

/** Brand/logo header shared by the desktop sidebar and the mobile drawer. */
export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <LogoMark className="h-9 w-9 shrink-0" />
      <div className="leading-tight">
        <p className="text-sm font-bold text-gray-900">Reliable Fresh</p>
        <p className="text-xs text-gray-500">Export Management</p>
      </div>
    </div>
  )
}

/** The nav content shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav() {
  const { operational, admin } = useVisibleNav()

  return (
    <>
      {/* Administration (ADMIN_NAV) shown above the other nav sections, added 2026-08-11. */}
      {admin.length > 0 && (
        <nav aria-label="Administration" className="flex flex-col gap-1">
          <p className="px-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">Administration</p>
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
          <p className="px-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">Operations</p>
          {operational.map((item) => (item.children ? <NavGroup key={item.href} item={item} /> : <NavRow key={item.href} item={item} />))}
        </nav>
      )}
    </>
  )
}

/** Desktop/tablet sidebar. Hidden below `lg`, where MobileNav + the drawer take over. */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-gray-200 bg-white p-4 lg:flex">
      <SidebarBrand />
      <SidebarNav />
    </aside>
  )
}
