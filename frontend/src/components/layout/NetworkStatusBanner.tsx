import { useNetworkStatus } from '@/hooks/useNetworkStatus'

/** prompt.md §6/§26 — clear "connection required" messaging, no fake offline sync. */
export function NetworkStatusBanner() {
  const isOnline = useNetworkStatus()
  if (isOnline) return null

  return (
    <div role="alert" className="bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white">
      No internet connection. You can keep looking at loaded pages, but saving needs a connection.
    </div>
  )
}
