import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { SearchBar } from '@/components/data/SearchBar'
import { LoadingState } from '@/components/data/LoadingState'
import { EmptyState } from '@/components/data/EmptyState'
import { Alert } from '@/components/feedback/Alert'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { useToast } from '@/app/ToastContext'
import { ApiError } from '@/api/httpClient'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useCreateFarmer, useFarmerSearch } from '../hooks'
import { FarmerMatchList } from '../components/FarmerMatchList'
import { farmerSchema, type FarmerFormValues } from '../schema'

/**
 * Search-first registration flow (prompt.md §9, Business_Rules R7b): the
 * worker always starts by searching, never by choosing "new vs existing"
 * up front. Only after seeing there's no match does the create form appear.
 */
export function FarmerRegistrationPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)

  const { data: matches, isLoading } = useFarmerSearch(query)
  const createFarmer = useCreateFarmer()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FarmerFormValues>({ resolver: zodResolver(farmerSchema) })

  const onSubmit = async (values: FarmerFormValues) => {
    try {
      const farmer = await createFarmer.mutateAsync(values)
      showToast('Farmer registered.', 'success')
      navigate(`/farmers/${farmer.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof FarmerFormValues, { message })
        }
      } else {
        showToast(toFriendlyMessage(error), 'error')
      }
    }
  }

  return (
    <>
      <PageHeader title="Register Farmer" description="Search first — most farmers have registered in a previous season." />

      <SectionCard title="Search for the farmer">
        <SearchBar
          value={query}
          onChange={(value) => {
            setQuery(value)
            setShowNewForm(false)
          }}
          placeholder="Search by name or mobile"
          label="Search for farmer"
        />

        <div className="mt-4">
          {isLoading && <LoadingState rows={2} />}
          {!isLoading && query.trim() && matches?.length === 0 && (
            <EmptyState title="No likely matches found" description="You can register this as a new farmer below." />
          )}
          {!isLoading && matches && matches.length > 0 && (
            <FarmerMatchList results={matches} onSelect={(farmer) => navigate(`/farmers/${farmer.id}`)} />
          )}
        </div>
      </SectionCard>

      {!showNewForm && (
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="min-h-12 self-start rounded-lg border-2 border-brand-700 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          None of these — register new farmer
        </button>
      )}

      {showNewForm && (
        <SectionCard title="New farmer details" description="These are permanent details — kept even after the season ends.">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormField label="Full name" htmlFor="name" required error={errors.name?.message}>
              <TextInput id="name" hasError={!!errors.name} {...register('name')} />
            </FormField>

            <FormField label="Address" htmlFor="address" required error={errors.address?.message}>
              <TextInput id="address" hasError={!!errors.address} {...register('address')} />
            </FormField>

            <FormField label="Mobile number" htmlFor="mobile" required error={errors.mobile?.message}>
              <TextInput id="mobile" inputMode="numeric" hasError={!!errors.mobile} {...register('mobile')} />
            </FormField>

            <Alert variant="info">
              Bank details are not required to register a farmer — you can add them later, but they're required
              before a Contract can be created.
            </Alert>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Register farmer'}
            </button>
          </form>
        </SectionCard>
      )}
    </>
  )
}
