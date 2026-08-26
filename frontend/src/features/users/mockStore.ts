import type { User } from '@/types/common'
import { ALL_PHASES } from './phaseLabels'

/**
 * Shared mock user directory — the single source both Auth (login) and User
 * Management (Admin's account list) read from, so creating a user here is
 * consistent everywhere. Passwords only exist because there's no backend
 * yet; a real API would never return this field to the frontend at all.
 *
 * 12 users seeded for CEO demo purposes (2026-08-11) — varied phase
 * assignments to exercise the phase-based nav/route gating end to end.
 * `role` is a display label only; every access decision is driven by
 * `phases`.
 */
export const usersStore: Array<User & { password: string }> = [
  { id: 1, name: 'Aditi Kulkarni', email: 'admin@reliablefresh.test', role: 'admin', active: true, phases: ALL_PHASES, password: 'password123' },
  {
    id: 2,
    name: 'Rahul Patil',
    email: 'rahul.fieldworker@reliablefresh.test',
    role: 'field_worker',
    active: true,
    phases: ['farmer_registration', 'plot_registration', 'field_qc', 'harvesting', 'weighing', 'arrival_qc'],
    password: 'password123',
  },
  {
    id: 3,
    name: 'Sanjay More',
    email: 'sanjay.field@reliablefresh.test',
    role: 'field_worker',
    active: true,
    phases: ['farmer_registration', 'plot_registration', 'field_qc'],
    password: 'password123',
  },
  { id: 4, name: 'Priya Deshmukh', email: 'priya.lab@reliablefresh.test', role: 'lab_worker', active: true, phases: ['lab_sampling'], password: 'password123' },
  {
    id: 5,
    name: 'Meera Joshi',
    email: 'meera.office@reliablefresh.test',
    role: 'office_worker',
    active: true,
    phases: ['farmer_contract', 'packaging'],
    password: 'password123',
  },
  {
    id: 6,
    name: 'Suresh Kulkarni',
    email: 'suresh.office@reliablefresh.test',
    role: 'office_worker',
    active: true,
    phases: ['farmer_contract', 'packaging', 'palletisation', 'pre_cooling'],
    password: 'password123',
  },
  {
    id: 7,
    name: 'Amit Shah',
    email: 'amit.packaging@reliablefresh.test',
    role: 'packaging_supervisor',
    active: true,
    phases: ['palletisation'],
    password: 'password123',
  },
  {
    id: 8,
    name: 'Deepa Nair',
    email: 'deepa.inventory@reliablefresh.test',
    role: 'stock_manager',
    active: true,
    phases: ['inventory_management'],
    password: 'password123',
  },
  {
    id: 9,
    name: 'Vijay Waghmare',
    email: 'vijay.field@reliablefresh.test',
    role: 'field_worker',
    active: true,
    phases: ['harvesting', 'weighing', 'arrival_qc'],
    password: 'password123',
  },
  {
    id: 10,
    name: 'Sunita Bhosale',
    email: 'sunita.lab@reliablefresh.test',
    role: 'lab_worker',
    active: true,
    phases: ['lab_sampling', 'farmer_contract'],
    password: 'password123',
  },
  {
    id: 11,
    name: 'Prakash Deshpande',
    email: 'prakash.admin@reliablefresh.test',
    role: 'admin',
    active: true,
    phases: ['admin', 'farmer_registration', 'plot_registration', 'field_qc', 'lab_sampling'],
    password: 'password123',
  },
  {
    id: 12,
    name: 'Kavita Jadhav',
    email: 'kavita.office@reliablefresh.test',
    role: 'office_worker',
    active: true,
    phases: ['farmer_contract', 'packaging', 'pre_cooling', 'finished_goods_qc'],
    password: 'password123',
  },
]

let nextUserId = usersStore.length + 1
export function allocateUserId() {
  return nextUserId++
}
