import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { DatePicker } from '@/components/forms/DatePicker'
import { RadioGroup } from '@/components/forms/RadioGroup'
import { Textarea } from '@/components/forms/Textarea'
import type { ArrivalQcFormValues } from '../schema'

interface ArrivalQcFormProps {
  register: UseFormRegister<ArrivalQcFormValues>
  errors: FieldErrors<ArrivalQcFormValues>
  watch: UseFormWatch<ArrivalQcFormValues>
  setValue: UseFormSetValue<ArrivalQcFormValues>
  /** Distinguishes element ids between the new-inspection form and an inline follow-up form on the same page. */
  idPrefix: string
}

/** Shared fieldset — same shape for the first inspection and any follow-up after a fail. */
export function ArrivalQcForm({ register, errors, watch, setValue, idPrefix }: ArrivalQcFormProps) {
  const id = (name: string) => `${idPrefix}${name}`
  const overallObservation = watch('overallObservation')

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Inspection date" htmlFor={id('inspectionDate')} required error={errors.inspectionDate?.message}>
        <DatePicker id={id('inspectionDate')} hasError={!!errors.inspectionDate} {...register('inspectionDate')} />
      </FormField>

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-800">Fruit colour (%)</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Green" htmlFor={id('fruitColourGreenPct')} required error={errors.fruitColourGreenPct?.message}>
            <NumberInput id={id('fruitColourGreenPct')} unit="%" hasError={!!errors.fruitColourGreenPct} {...register('fruitColourGreenPct', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Milky Green" htmlFor={id('fruitColourMilkyPct')} required error={errors.fruitColourMilkyPct?.message}>
            <NumberInput id={id('fruitColourMilkyPct')} unit="%" hasError={!!errors.fruitColourMilkyPct} {...register('fruitColourMilkyPct', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Yellow" htmlFor={id('fruitColourYellowPct')} required error={errors.fruitColourYellowPct?.message}>
            <NumberInput id={id('fruitColourYellowPct')} unit="%" hasError={!!errors.fruitColourYellowPct} {...register('fruitColourYellowPct', { valueAsNumber: true })} />
          </FormField>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="TSS percentage" htmlFor={id('tssPercent')} required error={errors.tssPercent?.message}>
          <NumberInput id={id('tssPercent')} unit="%" hasError={!!errors.tssPercent} {...register('tssPercent', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Thrips mark percentage" htmlFor={id('thripsPercent')} required error={errors.thripsPercent?.message}>
          <NumberInput id={id('thripsPercent')} unit="%" hasError={!!errors.thripsPercent} {...register('thripsPercent', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Bhuri percentage" htmlFor={id('bhuriPercent')} required error={errors.bhuriPercent?.message}>
          <NumberInput id={id('bhuriPercent')} unit="%" hasError={!!errors.bhuriPercent} {...register('bhuriPercent', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Black spot percentage" htmlFor={id('blackSpotPercent')} required error={errors.blackSpotPercent?.message}>
          <NumberInput id={id('blackSpotPercent')} unit="%" hasError={!!errors.blackSpotPercent} {...register('blackSpotPercent', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Cercospora/Kharda percentage" htmlFor={id('cercosporaPercent')} required error={errors.cercosporaPercent?.message}>
          <NumberInput id={id('cercosporaPercent')} unit="%" hasError={!!errors.cercosporaPercent} {...register('cercosporaPercent', { valueAsNumber: true })} />
        </FormField>
      </div>

      <FormField label="Overall material observation" htmlFor={id('overallObservation')} required error={errors.overallObservation?.message}>
        <RadioGroup
          name={id('overallObservation')}
          value={overallObservation}
          onChange={(v) => setValue('overallObservation', v as ArrivalQcFormValues['overallObservation'])}
          options={[
            { value: 'Good', label: 'Good' },
            { value: 'Very Good', label: 'Very Good' },
            { value: 'Excellent', label: 'Excellent' },
          ]}
        />
      </FormField>

      <FormField label="Remarks" htmlFor={id('notes')}>
        <Textarea id={id('notes')} {...register('notes')} />
      </FormField>

      <FormField label="Result" htmlFor={id('result')} required error={errors.result?.message}>
        <RadioGroup
          name={id('result')}
          value={watch('result')}
          onChange={(v) => setValue('result', v as ArrivalQcFormValues['result'])}
          options={[
            { value: 'Pass', label: 'Pass' },
            { value: 'Fail', label: 'Fail' },
          ]}
        />
      </FormField>
    </div>
  )
}
