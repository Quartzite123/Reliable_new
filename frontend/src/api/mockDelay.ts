/** Shared artificial latency for mock adapters so loading states are visible during dev. */
export function mockDelay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
