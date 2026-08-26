import { useCallback, useState } from 'react'

export interface GeolocationResult {
  latitude: number
  longitude: number
  accuracy: number
}

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'error'

/**
 * Wraps `navigator.geolocation.getCurrentPosition` — free browser API, no
 * paid map service (CLAUDE.md §5/§9). Used for Plot GPS capture.
 */
export function useGeolocation() {
  const [state, setState] = useState<PermissionState>('idle')
  const [position, setPosition] = useState<GeolocationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const capture = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('unsupported')
      setError('GPS is not available on this device/browser.')
      return
    }

    setState('requesting')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy: result.coords.accuracy,
        })
        setState('granted')
      },
      (err) => {
        setState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error')
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Enable it in your browser settings and try again.'
            : 'Could not get your location. Try again.',
        )
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }, [])

  return { state, position, error, capture }
}
