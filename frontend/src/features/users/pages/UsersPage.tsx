import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { Select } from '@/components/forms/Select'
import { Switch } from '@/components/forms/Switch'
import { CheckboxGroup } from '@/components/forms/CheckboxGroup'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { cn } from '@/utils/cn'
import { ROLE_LABELS } from '@/permissions/permissions'
import type { PhaseKey, Role, User } from '@/types/common'
import { useCreateUser, useResetLockout, useSetUserStatus, useSoftDeleteUser, useUpdateUser, useUsers } from '../hooks'
import { createUserSchema, updateUserSchema, type CreateUserFormValues, type UpdateUserFormValues } from '../schema'
import { ALL_PHASES, PHASE_LABELS } from '../phaseLabels'

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = (
  Object.entries(ROLE_LABELS) as Array<[Role, string]>
).map(([value, label]) => ({ value, label }))

/** Visual grouping only — every phase still lives in the same flat `phases: PhaseKey[]` array. */
const PHASE_GROUPS: Array<{ label: string; phases: PhaseKey[] }> = [
  { label: 'Field Operations', phases: ['farmer_registration', 'plot_registration', 'field_qc', 'harvesting', 'weighing', 'arrival_qc'] },
  { label: 'Packhouse', phases: ['lab_sampling', 'farmer_contract', 'packaging', 'palletisation', 'pre_cooling', 'finished_goods_qc'] },
  { label: 'Inventory', phases: ['inventory_management'] },
  { label: 'Administration', phases: ['admin', 'users', 'reports_documents'] },
]

/**
 * Our `User` type only has `active: boolean` — no separate "deleted" state
 * exists to distinguish a soft-deactivated account from a merely inactive
 * one, so the status badge is two-state (Active/Inactive). "Deactivate"
 * (renamed from "Delete" 2026-09-01 — it only ever disabled login, never
 * removed the record) is mechanically identical to toggling the Active
 * switch off; the audit log is what records which affordance was used.
 */
const ACTIVE_STYLES: Record<'true' | 'false', string> = {
  true: 'bg-brand-100 text-brand-800',
  false: 'bg-gray-200 text-gray-700',
}

function UserStatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', ACTIVE_STYLES[active ? 'true' : 'false'])}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

/** Locked-out is a login-time state derived from failedLoginCount/lockedUntil (login lockout fix, 2026-09-01) — distinct from active/inactive. */
function isLockedOut(user: User): boolean {
  return !!user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()
}

/** Count with a native tooltip listing every phase label — cheap, accessible, no extra UI dependency. */
function PhasesCell({ phases }: { phases: PhaseKey[] }) {
  const labels = phases.map((p) => PHASE_LABELS[p]).join(', ')
  return (
    <span title={labels} className="text-sm text-gray-700">
      {phases.length} {phases.length === 1 ? 'phase' : 'phases'}
    </span>
  )
}

/** Grouped checkboxes reused by both the create and edit forms — reads/writes one flat `PhaseKey[]`. */
function PhaseCheckboxes({ value, onChange, error }: { value: PhaseKey[]; onChange: (phases: PhaseKey[]) => void; error?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <button type="button" onClick={() => onChange(ALL_PHASES)} className="text-sm font-medium text-brand-700 underline">
          Select all
        </button>
        <button type="button" onClick={() => onChange([])} className="text-sm font-medium text-gray-600 underline">
          Clear all
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {PHASE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">{group.label}</p>
          <CheckboxGroup
            name={group.label}
            values={value.filter((p) => group.phases.includes(p))}
            onChange={(selected) => {
              const outsideGroup = value.filter((p) => !group.phases.includes(p))
              onChange([...outsideGroup, ...(selected as PhaseKey[])])
            }}
            options={group.phases.map((p) => ({ value: p, label: PHASE_LABELS[p] }))}
          />
        </div>
      ))}
    </div>
  )
}

function formatLastLogin(value: string | undefined): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

export function UsersPage() {
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ user: User; nextActive: boolean } | null>(null)
  const [pendingDeactivate, setPendingDeactivate] = useState<User | null>(null)
  const { data: users, isLoading, error, refetch } = useUsers()
  const { showToast } = useToast()
  const setStatus = useSetUserStatus()
  const softDelete = useSoftDeleteUser()
  const resetLockout = useResetLockout()

  const handleClearLockout = async (user: User) => {
    try {
      await resetLockout.mutateAsync({ id: user.id })
      showToast('Lockout cleared.', 'success')
    } catch (err) {
      showToast(toFriendlyMessage(err), 'error')
    }
  }

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return
    const { user, nextActive } = pendingStatusChange
    setPendingStatusChange(null)
    try {
      await setStatus.mutateAsync({ id: user.id, active: nextActive })
      showToast(nextActive ? 'User activated.' : 'User deactivated.', 'success')
    } catch (err) {
      showToast(toFriendlyMessage(err), 'error')
    }
  }

  const confirmDeactivate = async () => {
    if (!pendingDeactivate) return
    const user = pendingDeactivate
    setPendingDeactivate(null)
    try {
      await softDelete.mutateAsync({ id: user.id })
      showToast('User deactivated.', 'success')
    } catch (err) {
      showToast(toFriendlyMessage(err), 'error')
    }
  }

  const columns: DataTableColumn<User>[] = [
    { key: 'name', header: 'Name', render: (u) => u.name ?? '—', isPrimary: true },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'mobile', header: 'Mobile', render: (u) => u.mobile ?? '—' },
    { key: 'role', header: 'Role', render: (u) => ROLE_LABELS[u.role] },
    { key: 'phases', header: 'Phases', render: (u) => <PhasesCell phases={u.phases} /> },
    { key: 'lastLogin', header: 'Last login', render: (u) => <span className="text-sm text-gray-600">{formatLastLogin(u.lastLoginAt)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <div className="flex items-center gap-2">
          <UserStatusBadge active={u.active} />
          {isLockedOut(u) && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800" title={`Locked until ${new Date(u.lockedUntil!).toLocaleString()}`}>
              Locked
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setEditingUser(u)} className="text-sm font-medium text-brand-700 underline">
            Edit
          </button>
          <Switch
            checked={u.active}
            onChange={(nextActive) => setPendingStatusChange({ user: u, nextActive })}
            label={`Toggle active status for ${u.name ?? u.email}`}
          />
          {isLockedOut(u) && (
            <button type="button" onClick={() => handleClearLockout(u)} className="text-sm font-medium text-brand-700 underline">
              Clear lockout
            </button>
          )}
          <button type="button" onClick={() => setPendingDeactivate(u)} className="text-sm font-medium text-red-700 underline">
            Deactivate
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts are created by an Admin or a Users-phase holder — there is no self-signup. Roles are display labels; screen access is controlled by assigned phases."
        actions={
          <button
            type="button"
            onClick={() => setShowNewForm((v) => !v)}
            className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {showNewForm ? 'Cancel' : 'New user'}
          </button>
        }
      />

      {showNewForm && <NewUserForm onDone={() => setShowNewForm(false)} />}
      {editingUser && <EditUserForm user={editingUser} onDone={() => setEditingUser(null)} />}

      <SectionCard title="All users">
        {isLoading && <LoadingState rows={4} />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {!isLoading && !error && (
          <DataTable columns={columns} rows={users ?? []} getRowId={(u) => u.id} emptyTitle="No users yet" />
        )}
      </SectionCard>

      <ConfirmationDialog
        open={!!pendingStatusChange}
        title={pendingStatusChange?.nextActive ? 'Change status to Active?' : 'Change status to Inactive?'}
        description={
          pendingStatusChange?.nextActive
            ? 'This user will be able to log in again.'
            : 'This user will not be able to log in.'
        }
        confirmLabel="Confirm"
        onConfirm={confirmStatusChange}
        onCancel={() => setPendingStatusChange(null)}
      />

      <ConfirmationDialog
        open={!!pendingDeactivate}
        title="Deactivate this user?"
        description="This will disable login but keep their history — no account is ever deleted."
        confirmLabel="Deactivate"
        destructive
        onConfirm={confirmDeactivate}
        onCancel={() => setPendingDeactivate(null)}
      />
    </>
  )
}

function NewUserForm({ onDone }: { onDone: () => void }) {
  const { showToast } = useToast()
  const createUser = useCreateUser()

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({ resolver: zodResolver(createUserSchema), defaultValues: { phases: [] } })

  register('phases')
  const phases = watch('phases')

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      await createUser.mutateAsync(values)
      showToast('User created.', 'success')
      onDone()
    } catch (error) {
      if (error && typeof error === 'object' && 'fieldErrors' in error) {
        const fieldErrors = (error as { fieldErrors?: Record<string, string> }).fieldErrors
        if (fieldErrors?.email) setError('email', { message: fieldErrors.email })
      }
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <SectionCard title="New user">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="name" required error={errors.name?.message}>
            <TextInput id="name" hasError={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Mobile number" htmlFor="mobile" required error={errors.mobile?.message}>
            <TextInput id="mobile" hasError={!!errors.mobile} {...register('mobile')} />
          </FormField>
          <FormField label="Email (used as username)" htmlFor="email" required error={errors.email?.message}>
            <TextInput id="email" hasError={!!errors.email} {...register('email')} />
          </FormField>
          <FormField label="Temporary password" htmlFor="temporaryPassword" required error={errors.temporaryPassword?.message} hint="At least 12 characters. Permanent until an admin changes it — the user is never forced to change it at next login.">
            <TextInput id="temporaryPassword" type="password" hasError={!!errors.temporaryPassword} {...register('temporaryPassword')} />
          </FormField>
          <FormField label="Role" htmlFor="role" required error={errors.role?.message}>
            <Select id="role" hasError={!!errors.role} placeholder="Select role" options={ROLE_OPTIONS} {...register('role')} />
          </FormField>
        </div>

        <FormField label="Phases" htmlFor="phases" required error={errors.phases?.message}>
          <PhaseCheckboxes value={phases ?? []} onChange={(next) => setValue('phases', next, { shouldValidate: true })} />
        </FormField>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 self-start rounded-lg bg-brand-700 px-6 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Create user'}
        </button>
      </form>
    </SectionCard>
  )
}

/**
 * Full edit — name, mobile, email, password, and phases, replacing the
 * former phases-only form (2026-09-01). Role is shown read-only: it's
 * still editable server-side (UserUpdate.role exists), but this screen
 * doesn't expose changing it — promoting someone to Admin is deliberately
 * not a checkbox next to their name.
 *
 * Backend enforcement (app/services/user_admin_guard.py) is the real
 * boundary — a Users-phase holder who isn't an Admin will get a 404 for
 * an Admin target (never reaches this form, since Admin rows aren't in
 * the list) or a 403 if they submit phases changes on themselves. This
 * form doesn't try to replicate that logic; it just surfaces whatever
 * the API says went wrong.
 */
function EditUserForm({ user, onDone }: { user: User; onDone: () => void }) {
  const { showToast } = useToast()
  const updateUser = useUpdateUser()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: user.name ?? '', mobile: user.mobile ?? '', email: user.email, password: '', phases: user.phases },
  })

  const phases = watch('phases')

  const onSubmit = async (values: UpdateUserFormValues) => {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        name: values.name,
        mobile: values.mobile,
        email: values.email,
        phases: values.phases,
        // Blank password field means "leave unchanged" — never send an
        // empty string, the backend would reject it against the 12-char
        // minimum, and it isn't the caller's intent anyway.
        password: values.password === '' ? undefined : values.password,
      })
      showToast('User updated.', 'success')
      onDone()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <SectionCard title={`Edit user — ${user.name ?? user.email}`}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="editName" required error={errors.name?.message}>
            <TextInput id="editName" hasError={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Mobile number" htmlFor="editMobile" required error={errors.mobile?.message}>
            <TextInput id="editMobile" hasError={!!errors.mobile} {...register('mobile')} />
          </FormField>
          <FormField label="Email (used as username)" htmlFor="editEmail" required error={errors.email?.message}>
            <TextInput id="editEmail" hasError={!!errors.email} {...register('email')} />
          </FormField>
          <FormField label="Role" htmlFor="editRole" hint="Role is a display label only and isn't changed here — screen access comes from phases below.">
            <TextInput id="editRole" value={ROLE_LABELS[user.role]} disabled readOnly />
          </FormField>
          <FormField label="New password" htmlFor="editPassword" error={errors.password?.message} hint="Leave blank to keep the current password. Setting a new one signs the user out everywhere immediately.">
            <TextInput id="editPassword" type="password" hasError={!!errors.password} placeholder="Unchanged" {...register('password')} />
          </FormField>
        </div>

        <FormField label="Phases" htmlFor="editPhases" required error={errors.phases?.message}>
          <PhaseCheckboxes value={phases ?? []} onChange={(next) => setValue('phases', next, { shouldValidate: true })} />
        </FormField>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </SectionCard>
  )
}
