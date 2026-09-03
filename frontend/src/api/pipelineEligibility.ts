import type { QueryClient } from '@tanstack/react-query'

/**
 * Shared tag for every "what's ready for the next stage" query across the
 * pipeline: eligible plots for lab sampling / contract / harvest, eligible
 * harvests for arrival QC / packaging, available lots for palletisation,
 * eligible pallets for pre-cooling — and whatever the next stage after
 * that turns out to be.
 *
 * Lives in `meta`, not the query key. `meta` doesn't participate in cache
 * identity, so tagging a query this way can never accidentally collide
 * with an unrelated query that happens to share a key segment.
 */
export const PIPELINE_ELIGIBILITY_META = { pipelineEligibility: true } as const

/**
 * Invalidates every query tagged with PIPELINE_ELIGIBILITY_META — every
 * "what's ready for the next stage" list, across every feature, in one
 * call.
 *
 * Call this from any mutation that advances season_registrations.status
 * (or otherwise changes what should appear in some later stage's eligible
 * list) instead of importing and invalidating that stage's specific query
 * key by hand. The alternative — each mutation enumerating exactly which
 * downstream feature(s) depend on it — is what let six of these go stale
 * silently: nobody updates a two-year-old mutation when a ninth pipeline
 * stage gets added elsewhere. This doesn't need updating then; stage
 * nine's own query tags itself and is covered automatically.
 *
 * Deliberately broad — invalidates ALL eligibility lists, not just the
 * one immediately downstream of whatever just changed. Over-invalidating
 * a query nothing is currently observing costs nothing (React Query only
 * refetches active/mounted queries on invalidation); picking the
 * "correct" narrower target on every call site is exactly the coupling
 * this exists to avoid.
 */
export function invalidatePipelineEligibility(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: (query) => query.meta?.pipelineEligibility === true,
  })
}
