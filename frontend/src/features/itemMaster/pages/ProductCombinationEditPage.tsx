import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { Select } from '@/components/forms/Select'
import { CheckboxGroup } from '@/components/forms/CheckboxGroup'
import { LoadingState } from '@/components/data/LoadingState'
import { EmptyState } from '@/components/data/EmptyState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { GRAPE_VARIETIES } from '@/features/plots'
import { PACK_SIZES, COMPLIANCE_TYPES } from '@/features/packaging'
import { useCustomers } from '@/features/customers/hooks'
import { useProducts, useUpdateProduct } from '../hooks'
import { productSchema, type ProductFormValues } from '../schema'

export function ProductCombinationEditPage() {
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : undefined
  const { data, isLoading } = useProducts()
  const product = data?.find((p) => p.id === numericId)

  if (isLoading) return <LoadingState rows={4} />
  if (!product) return <EmptyState title="Product combination not found" />

  return <ProductCombinationForm id={product.id} />
}

function ProductCombinationForm({ id }: { id: number }) {
  const { showToast } = useToast()
  const { data } = useProducts()
  const { data: customers } = useCustomers()
  const updateProduct = useUpdateProduct(id)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({ resolver: zodResolver(productSchema) })

  useEffect(() => {
    const product = data?.find((p) => p.id === id)
    if (product) {
      reset({
        variety: product.variety,
        customerId: product.customerId,
        packSize: product.packSize,
        complianceType: product.complianceType,
        isActive: product.isActive,
      })
    }
  }, [id, data, reset])

  const isActive = watch('isActive')

  const onSubmit = async (values: ProductFormValues) => {
    try {
      await updateProduct.mutateAsync(values)
      showToast('Product combination updated.', 'success')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Edit Product Combination" />
      <SectionCard>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Variety" htmlFor="variety" required error={errors.variety?.message}>
              <Select
                id="variety"
                hasError={!!errors.variety}
                options={GRAPE_VARIETIES.map((v) => ({ value: v, label: v }))}
                {...register('variety')}
              />
            </FormField>
            <FormField label="Customer" htmlFor="customerId" required error={errors.customerId?.message}>
              <Select
                id="customerId"
                hasError={!!errors.customerId}
                options={(customers ?? []).map((c) => ({ value: c.id, label: c.name }))}
                {...register('customerId', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Pack size" htmlFor="packSize" required error={errors.packSize?.message}>
              <Select id="packSize" hasError={!!errors.packSize} options={PACK_SIZES.map((s) => ({ value: s, label: s }))} {...register('packSize')} />
            </FormField>
            <FormField label="Compliance type" htmlFor="complianceType" required error={errors.complianceType?.message}>
              <Select
                id="complianceType"
                hasError={!!errors.complianceType}
                options={COMPLIANCE_TYPES.map((t) => ({ value: t, label: t }))}
                {...register('complianceType')}
              />
            </FormField>
          </div>

          <FormField label="Status" htmlFor="isActive">
            <CheckboxGroup
              name="isActive"
              values={isActive ? ['active'] : []}
              onChange={(values) => setValue('isActive', values.includes('active'))}
              options={[{ value: 'active', label: 'Active (uncheck to deactivate — no hard deletes)' }]}
            />
          </FormField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
