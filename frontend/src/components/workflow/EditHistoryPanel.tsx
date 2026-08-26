import type { HistoryEntry } from '@/types/history'

/** Chronological field-level diff list — fed the same shape by every feature (plots/labSamples/contracts/etc). */
export function EditHistoryPanel({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">No edits recorded yet.</p>
  }

  return (
    <ol className="flex flex-col gap-3">
      {[...entries].reverse().map((entry, index) => (
        <li key={entry.id} className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-800">Version {entries.length - index}</span>
            <span className="text-gray-500">{new Date(entry.editedAt).toLocaleString()}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">Edited by {entry.editedByName}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {entry.changes.map((change) => (
              <li key={change.field} className="text-sm text-gray-700">
                <span className="font-medium">{change.label}:</span> {change.from} → {change.to}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
