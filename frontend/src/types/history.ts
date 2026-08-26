/** Generic edit-history shape shared by every feature's [View History] panel. */
export interface FieldChange {
  field: string
  label: string
  from: string
  to: string
}

export interface HistoryEntry {
  id: string
  editedByName: string
  editedAt: string
  changes: FieldChange[]
}
