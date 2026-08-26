import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { Select } from '@/components/forms/Select'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { GRAPE_VARIETIES } from '@/features/plots'
import { PACK_SIZES, COMPLIANCE_TYPES } from '@/features/packaging'
import { useCustomers } from '@/features/customers/hooks'
import { useCreateProduct } from '../hooks'
import { productSchema, type ProductFormValues } from '../schema'

export function ProductCombinationNewPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: customers } = useCustomers()
  const createProduct = useCreateProduct()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: { isActive: true } })

  const onSubmit = async (values: ProductFormValues) => {
    try {
      await createProduct.mutateAsync(values)
      showToast('Product combination saved.', 'success')
      navigate('/inventory/products')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Add Product Combination" />
      <SectionCard title="Combination details">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Variety" htmlFor="variety" required error={errors.variety?.message}>
              <Select
                id="variety"
                hasError={!!errors.variety}
                placeholder="Select variety"
                options={GRAPE_VARIETIES.map((v) => ({ value: v, label: v }))}
                {...register('variety')}
              />
            </FormField>
            <FormField label="Customer" htmlFor="customerId" required error={errors.customerId?.message}>
              <Select
                id="customerId"
                hasError={!!errors.customerId}
                placeholder="Select customer"
                options={(customers ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))}
                {...register('customerId', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Pack size" htmlFor="packSize" required error={errors.packSize?.message}>
              <Select
                id="packSize"
                hasError={!!errors.packSize}
                placeholder="Select pack size"
                options={PACK_SIZES.map((s) => ({ value: s, label: s }))}
                {...register('packSize')}
              />
            </FormField>
            <FormField label="Compliance type" htmlFor="complianceType" required error={errors.complianceType?.message}>
              <Select
                id="complianceType"
                hasError={!!errors.complianceType}
                placeholder="Select compliance type"
                options={COMPLIANCE_TYPES.map((t) => ({ value: t, label: t }))}
                {...register('complianceType')}
              />
            </FormField>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save combination'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
