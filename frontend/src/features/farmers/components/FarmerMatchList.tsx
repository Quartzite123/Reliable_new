import type { FarmerSearchResult } from '../types'

interface FarmerMatchListProps {
  results: FarmerSearchResult[]
  onSelect: (farmer: FarmerSearchResult) => void
}

/** Likely-match list for the fuzzy search-first flow (Business_Rules R7b). */
export function FarmerMatchList({ results, onSelect }: FarmerMatchListProps) {
  if (results.length === 0) return null

  return (
    <ul className="flex flex-col gap-2">
      {results.map((farmer) => (
        <li key={farmer.id}>
          <button
            type="button"
            onClick={() => onSelect(farmer)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-brand-400 hover:bg-brand-50"
          >
            <div>
              <p className="font-semibold text-gray-900">{farmer.name}</p>
              <p className="text-sm text-gray-500">Mobile: {farmer.mobile}</p>
              {farmer.status === 'inactive' && (
                <p className="mt-1 text-xs font-semibold text-amber-700">Inactive — reactivating on selection</p>
              )}
            </div>
            <span className="shrink-0 text-sm font-semibold text-brand-700">Use this farmer</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
