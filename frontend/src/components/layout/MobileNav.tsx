import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { HelpIcon, HomeIcon, RecordsIcon, TasksIcon } from '@/components/icons/Icon'

// "New Entry" has no single dedicated route in the route map (prompt.md §7) —
// it points at /tasks, where every role's pending/startable entries live.
const ITEMS = [
  { label: 'Home', href: '/home', icon: HomeIcon },
  { label: 'Tasks', href: '/tasks', icon: TasksIcon },
  { label: 'New Entry', href: '/tasks', icon: TasksIcon },
  { label: 'Records', href: '/records', icon: RecordsIcon },
  { label: 'Help', href: '/help', icon: HelpIcon },
]

/** Compact bottom navigation for phones (prompt.md §6/§25). Hidden at `lg` and above. */
export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white lg:hidden"
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.label}
          to={item.href}
          className={({ isActive }) =>
            cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium',
              isActive ? 'text-brand-700' : 'text-gray-500',
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={cn('h-5 w-5', isActive ? 'text-brand-700' : 'text-gray-400')} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
