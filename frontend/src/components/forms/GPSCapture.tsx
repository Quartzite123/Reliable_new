import { useGeolocation } from '@/hooks/useGeolocation'

interface GPSCaptureProps {
  value: { latitude: number; longitude: number } | null
  onCapture: (position: { latitude: number; longitude: number }) => void
}

/** Plot GPS capture — free browser Geolocation API only, no paid map service (CLAUDE.md §9/§10). */
export function GPSCapture({ value, onCapture }: GPSCaptureProps) {
  const { state, position, error, capture } = useGeolocation()

  const displayed = position ?? value

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Plot location</p>
          {displayed ? (
            <p className="text-sm text-gray-600">
              Lat {displayed.latitude.toFixed(6)}, Lng {displayed.longitude.toFixed(6)}
            </p>
          ) : (
            <p className="text-sm text-gray-500">Not captured yet</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            capture()
          }}
          className="min-h-11 rounded-lg border-2 border-brand-700 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          {displayed ? 'Retry' : 'Capture location'}
        </button>
      </div>
      {state === 'requesting' && <p className="mt-2 text-sm text-blue-700">Getting your location...</p>}
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      {position && (
        <button
          type="button"
          onClick={() => onCapture(position)}
          className="mt-3 min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Use this location
        </button>
      )}
    </div>
  )
}
