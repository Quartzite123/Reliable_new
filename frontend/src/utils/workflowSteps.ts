import type { WorkflowStep } from '@/components/workflow/WorkflowStepper'
import type { SeasonRegistrationStatus } from '@/types/season'

/** Linear order of the pipeline (CLAUDE.md §10). Failed states map onto the step they blocked. */
const PIPELINE: Array<{ key: string; label: string; statuses: SeasonRegistrationStatus[] }> = [
  { key: 'registered', label: 'Registered', statuses: ['Registered'] },
  { key: 'field_qc', label: 'Field QC', statuses: ['Field QC Passed', 'Field QC Failed'] },
  { key: 'lab', label: 'Lab', statuses: ['Lab Passed', 'Lab Failed'] },
  { key: 'contract', label: 'Contract', statuses: ['Under Contract'] },
  { key: 'harvest', label: 'Harvest', statuses: ['Harvested (partial)'] },
  { key: 'weighing', label: 'Weighing', statuses: ['Weighed'] },
  { key: 'arrival_qc', label: 'Arrival QC', statuses: ['Arrival QC Passed', 'Arrival QC Failed'] },
  { key: 'packaging', label: 'Packaging', statuses: ['Packed'] },
  { key: 'palletisation', label: 'Palletisation', statuses: ['Palletised'] },
  { key: 'pre_cooling', label: 'Pre-Cooling', statuses: ['Pre-Cooled'] },
]

/**
 * Every status value in `SeasonRegistrationStatus` represents a step that
 * just *finished* — either passed (bare status or `_passed`) or `_failed`.
 * There's no "in progress" status in the model, so a passed/bare status
 * marks its own step done and advances "current" to the step after it;
 * only `_failed` keeps the pointer on the step it blocked.
 */
export function buildWorkflowSteps(current: SeasonRegistrationStatus): WorkflowStep[] {
  const matchedIndex = PIPELINE.findIndex((step) => step.statuses.includes(current))
  const failed = current.endsWith('Failed')
  const currentIndex = failed ? matchedIndex : matchedIndex + 1

  return PIPELINE.map((step, index) => {
    let state: WorkflowStep['state'] = 'upcoming'
    if (failed && index === matchedIndex) state = 'failed'
    else if (index < currentIndex) state = 'done'
    else if (index === currentIndex) state = 'current'
    return { key: step.key, label: step.label, state }
  })
}
