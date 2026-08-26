import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { NumberInput } from '@/components/forms/NumberInput'
import { DatePicker } from '@/components/forms/DatePicker'
import { ValidationSummary } from '@/components/feedback/ValidationSummary'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useCreatePurchaseOrder, useSuppliers } from '../hooks'
import { purchaseOrderSchema, type PurchaseOrderFormValues } from '../schema'

const emptyLineItem = { particulars: '', hsnCode: '', qtyKg: 0, units: 0, kgPerUnit: 0, make: '', rate: 0, gstPercent: 18 }

export function PurchaseOrderNewPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: suppliers } = useSuppliers()
  const createPo = useCreatePurchaseOrder()

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: { dispatchThrough: 'Road Transport', otherCharges: 0, freight: 'At Actual', lineItems: [emptyLineItem] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })
  const lineItems = watch('lineItems')

  const errorMessages = [
    ...Object.values(errors)
      .filter((e) => e && 'message' in e)
      .map((e) => (e as { message?: string }).message)
      .filter((m): m is string => !!m),
    ...(errors.lineItems?.root?.message ? [errors.lineItems.root.message] : []),
  ]

  const onSubmit = async (values: PurchaseOrderFormValues) => {
    try {
      const po = await createPo.mutateAsync(values)
      showToast('Purchase order saved as draft.', 'success')
      navigate(`/purchase-orders/${po.id}`)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="New Purchase Order" description="Farm inputs (fertilizer/agro-chemical) only — not packing materials." />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <ValidationSummary errors={errorMessages} />

        <SectionCard title="Supplier">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Supplier name" htmlFor="supplierName" required error={errors.supplierName?.message}>
              <TextInput id="supplierName" list="supplier-suggestions" hasError={!!errors.supplierName} {...register('supplierName')} />
              <datalist id="supplier-suggestions">
                {(suppliers ?? []).map((s) => (
                  <option key={s.name} value={s.name} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Supplier GST" htmlFor="supplierGst">
              <TextInput id="supplierGst" {...register('supplierGst')} />
            </FormField>
            <FormField label="Supplier address" htmlFor="supplierAddress" required error={errors.supplierAddress?.message}>
              <TextInput id="supplierAddress" hasError={!!errors.supplierAddress} {...register('supplierAddress')} />
            </FormField>
            <FormField label="Supplier email" htmlFor="supplierEmail" error={errors.supplierEmail?.message}>
              <TextInput id="supplierEmail" hasError={!!errors.supplierEmail} {...register('supplierEmail')} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Order details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="PO date" htmlFor="poDate" required error={errors.poDate?.message}>
              <DatePicker id="poDate" hasError={!!errors.poDate} {...register('poDate')} />
            </FormField>
            <FormField label="Payment terms" htmlFor="paymentTerms">
              <TextInput id="paymentTerms" {...register('paymentTerms')} />
            </FormField>
            <FormField label="Dispatch through" htmlFor="dispatchThrough" required error={errors.dispatchThrough?.message}>
              <TextInput id="dispatchThrough" hasError={!!errors.dispatchThrough} {...register('dispatchThrough')} />
            </FormField>
            <FormField label="Destination" htmlFor="destination">
              <TextInput id="destination" {...register('destination')} />
            </FormField>
            <FormField label="Supplier ref." htmlFor="supplierRef">
              <TextInput id="supplierRef" {...register('supplierRef')} />
            </FormField>
            <FormField label="Other refs." htmlFor="otherRefs">
              <TextInput id="otherRefs" {...register('otherRefs')} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Line items">
          <div className="flex flex-col gap-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Item {index + 1}</p>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-sm font-medium text-red-700 underline">
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <FormField label="Particulars" htmlFor={`lineItems.${index}.particulars`} required>
                    <TextInput id={`lineItems.${index}.particulars`} {...register(`lineItems.${index}.particulars`)} />
                  </FormField>
                  <FormField label="HSN code" htmlFor={`lineItems.${index}.hsnCode`} required>
                    <TextInput id={`lineItems.${index}.hsnCode`} {...register(`lineItems.${index}.hsnCode`)} />
                  </FormField>
                  <FormField label="Make" htmlFor={`lineItems.${index}.make`}>
                    <TextInput id={`lineItems.${index}.make`} {...register(`lineItems.${index}.make`)} />
                  </FormField>
                  <FormField label="Quantity" htmlFor={`lineItems.${index}.qtyKg`} required>
                    <NumberInput id={`lineItems.${index}.qtyKg`} unit="kg" {...register(`lineItems.${index}.qtyKg`, { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Units" htmlFor={`lineItems.${index}.units`} required>
                    <NumberInput id={`lineItems.${index}.units`} {...register(`lineItems.${index}.units`, { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Kg per unit" htmlFor={`lineItems.${index}.kgPerUnit`} required>
                    <NumberInput id={`lineItems.${index}.kgPerUnit`} {...register(`lineItems.${index}.kgPerUnit`, { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Rate" htmlFor={`lineItems.${index}.rate`} required>
                    <NumberInput id={`lineItems.${index}.rate`} unit="₹/kg" {...register(`lineItems.${index}.rate`, { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="GST %" htmlFor={`lineItems.${index}.gstPercent`} required>
                    <NumberInput id={`lineItems.${index}.gstPercent`} unit="%" {...register(`lineItems.${index}.gstPercent`, { valueAsNumber: true })} />
                  </FormField>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Amount</p>
                    <p className="mt-1.5 text-base font-medium text-gray-900">
                      ₹{((lineItems?.[index]?.qtyKg || 0) * (lineItems?.[index]?.rate || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => append(emptyLineItem)}
              className="min-h-11 self-start rounded-lg border-2 border-brand-700 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
            >
              Add line item
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Charges">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Freight" htmlFor="freight" required hint='"At Actual" or a number' error={errors.freight?.message}>
              <TextInput id="freight" hasError={!!errors.freight} {...register('freight')} />
            </FormField>
            <FormField label="Other charges" htmlFor="otherCharges" required error={errors.otherCharges?.message}>
              <NumberInput id="otherCharges" unit="₹" hasError={!!errors.otherCharges} {...register('otherCharges', { valueAsNumber: true })} />
            </FormField>
          </div>
        </SectionCard>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save purchase order (Draft)'}
        </button>
      </form>
    </>
  )
}
