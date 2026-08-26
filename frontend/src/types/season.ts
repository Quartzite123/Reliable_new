/**
 * The central state machine driving the whole pipeline (PHASE_MAP.md §4).
 * Lives on `season_registrations`, which is the plot+season join — NOT a
 * per-farmer record (Business_Rules R12, PHASE_MAP.md §7). A farmer's name
 * travels as read-only reference info on top of this.
 *
 * Values match backend/app/core/enums.py::RegistrationStatus exactly (verified
 * via generated openapi.json) — the backend sends these strings verbatim in
 * JSON, they are not snake_case identifiers translated by the camelCase
 * transform.
 */
export type SeasonRegistrationStatus =
  | 'Registered'
  | 'Field QC Passed'
  | 'Field QC Failed'
  | 'Lab Passed'
  | 'Lab Failed'
  | 'Under Contract'
  | 'Harvested (partial)'
  | 'Weighed'
  | 'Arrival QC Passed'
  | 'Arrival QC Failed'
  | 'Packed'
  | 'Palletised'
  | 'Finished Goods QC Passed'
  | 'Finished Goods QC Failed'
  | 'Pre-Cooled'

export const SEASON_STATUS_LABELS: Record<SeasonRegistrationStatus, string> = {
  'Registered': 'Registered',
  'Field QC Passed': 'Field QC Passed',
  'Field QC Failed': 'Field QC Failed',
  'Lab Passed': 'Lab Passed',
  'Lab Failed': 'Lab Failed',
  'Under Contract': 'Under Contract',
  'Harvested (partial)': 'Harvested',
  'Weighed': 'Weighed',
  'Arrival QC Passed': 'Arrival QC Passed',
  'Arrival QC Failed': 'Arrival QC Failed',
  'Packed': 'Packed',
  'Palletised': 'Palletised',
  'Finished Goods QC Passed': 'FG QC Passed',
  'Finished Goods QC Failed': 'FG QC Failed',
  'Pre-Cooled': 'Pre-Cooled',
}

/** For StatusBadge, which uses the app-wide generic status vocabulary. */
export function seasonStatusToBadgeStatus(status: SeasonRegistrationStatus) {
  if (status.endsWith('Failed')) return 'failed' as const
  if (status.endsWith('Passed')) return 'passed' as const
  if (status === 'Registered') return 'not_started' as const
  return 'in_progress' as const
}
