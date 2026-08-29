import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { FileUpload } from '@/components/forms/FileUpload'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useBankDetails, useFarmer, useSaveBankDetails } from '../hooks'
import { bankDetailsSchema, type BankDetailsFormValues } from '../schema'

export function BankDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const farmerId = id ? Number(id) : undefined
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: farmer, isLoading: farmerLoading } = useFarmer(farmerId)
  const {
    data: existing,
    isLoading: bankLoading,
    isError: bankError,
    error: bankErrorObj,
    refetch: refetchBank,
  } = useBankDetails(farmerId)
  const saveBankDetails = useSaveBankDetails(farmerId ?? 0)
  const [passbookPhoto, setPassbookPhoto] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankDetailsFormValues>({ resolver: zodResolver(bankDetailsSchema) })

  useEffect(() => {
    if (existing) {
      reset({
        accountHolderName: existing.accountHolderName,
        bankName: existing.bankName,
        accountNumber: existing.accountNumber,
        ifscCode: existing.ifscCode,
        branchName: existing.branchName,
      })
    }
  }, [existing, reset])

  if (farmerLoading || bankLoading) return <LoadingState rows={4} />
  if (bankError) return <ErrorState error={bankErrorObj} onRetry={() => refetchBank()} />
  if (!farmer) return null

  const onSubmit = async (values: BankDetailsFormValues) => {
    try {
      await saveBankDetails.mutateAsync({ ...values, passbookPhoto })
      showToast('Bank details saved.', 'success')
      navigate(`/farmers/${farmer.id}`)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title={`Bank details — ${farmer.name}`} description="Required before a Contract can be created for this farmer." />
      <SectionCard>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Account holder name" htmlFor="accountHolderName" required error={errors.accountHolderName?.message}>
            <TextInput id="accountHolderName" hasError={!!errors.accountHolderName} {...register('accountHolderName')} />
          </FormField>
          <FormField label="Bank name" htmlFor="bankName" required error={errors.bankName?.message}>
            <TextInput id="bankName" hasError={!!errors.bankName} {...register('bankName')} />
          </FormField>
          <FormField label="Account number" htmlFor="accountNumber" required error={errors.accountNumber?.message}>
            <TextInput id="accountNumber" inputMode="numeric" hasError={!!errors.accountNumber} {...register('accountNumber')} />
          </FormField>
          <FormField label="IFSC" htmlFor="ifscCode" required hint="Uppercase, e.g. SBIN0001234" error={errors.ifscCode?.message}>
            <TextInput id="ifscCode" hasError={!!errors.ifscCode} {...register('ifscCode')} />
          </FormField>
          <FormField label="Branch" htmlFor="branchName">
            <TextInput id="branchName" {...register('branchName')} />
          </FormField>

          <FormField label="Passbook photo" htmlFor="passbookPhoto">
            <FileUpload
              id="passbookPhoto"
              label="passbook photo"
              accept="image/*,application/pdf"
              value={passbookPhoto}
              onChange={setPassbookPhoto}
            />
          </FormField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save bank details'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
