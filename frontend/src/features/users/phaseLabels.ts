import type { PhaseKey } from '@/types/common'

export const PHASE_LABELS: Record<PhaseKey, string> = {
  farmer_registration: 'Farmer Registration',
  plot_registration: 'Plot Registration',
  field_qc: 'Field QC',
  lab_sampling: 'Lab Sampling',
  farmer_contract: 'Farmer Contract',
  harvesting: 'Harvesting',
  weighing: 'Weighing',
  arrival_qc: 'Arrival QC',
  packaging: 'Packaging',
  inventory_management: 'Inventory Management',
  palletisation: 'Palletisation',
  pre_cooling: 'Pre-Cooling',
  finished_goods_qc: 'Finished Goods QC',
  admin: 'Admin (Season, Settings)',
  users: 'Users',
  reports_documents: 'Reports & Documents',
}

export const ALL_PHASES: PhaseKey[] = Object.keys(PHASE_LABELS) as PhaseKey[]
