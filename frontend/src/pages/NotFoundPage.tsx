import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-lg font-semibold text-gray-900">Page not found</p>
      <Link to="/home" className="text-sm font-medium text-brand-700 underline">
        Go back home
      </Link>
    </div>
  )
}
