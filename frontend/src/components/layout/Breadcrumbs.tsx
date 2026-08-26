import { Link } from 'react-router-dom'

export interface Breadcrumb {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.href ? (
              <Link to={item.href} className="hover:text-brand-700 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-gray-700">{item.label}</span>
            )}
            {index < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
