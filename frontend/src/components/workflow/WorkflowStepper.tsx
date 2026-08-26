import { cn } from '@/utils/cn'

export interface WorkflowStep {
  key: string
  label: string
  state: 'done' | 'current' | 'upcoming' | 'failed'
}

/**
 * The pipeline-wide progress strip from CLAUDE.md §10:
 * Registered → Field QC → Lab → Contract → Harvest → Weighing → Arrival QC
 * → Packaging → Palletisation → Pre-Cooling → (future).
 */
export function WorkflowStepper({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="flex gap-2 overflow-x-auto pb-2" aria-label="Workflow progress">
      {steps.map((step, index) => (
        <li key={step.key} className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
              step.state === 'done' && 'bg-brand-600 text-white',
              step.state === 'current' && 'bg-blue-600 text-white',
              step.state === 'failed' && 'bg-red-600 text-white',
              step.state === 'upcoming' && 'bg-gray-200 text-gray-500',
            )}
          >
            {step.state === 'done' ? '✓' : index + 1}
          </span>
          <span
            className={cn(
              'text-sm whitespace-nowrap',
              step.state === 'upcoming' ? 'text-gray-400' : 'font-medium text-gray-800',
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && <span className="mx-1 h-px w-4 bg-gray-300" aria-hidden />}
        </li>
      ))}
    </ol>
  )
}
