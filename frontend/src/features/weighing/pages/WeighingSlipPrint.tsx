import { Fragment } from 'react'
import { useParams } from 'react-router-dom'
import { useCompanySettings } from '@/features/companySettings/hooks'
import { useWeighingRecord } from '../hooks'

/**
 * Printable weighing slip matching the physical "Material Inward Weight
 * Slip (PRE Cleaning Slip)" form (weighing slip #937). Standalone page — no
 * AppShell/sidebar — opened in a new tab from WeighingDetailPage.
 *
 * The physical form's 100-row tally grid is designed for hand-tallying
 * individual crates across up to 5 vehicle trips side by side. Since one
 * WeighingRecord covers exactly one trip (see types.ts), only the first two
 * column-blocks (S.No. 1-20 for the crate/tare figures, S.No. 21-40 for the
 * gross/net figures) are populated; the remaining three blocks print blank,
 * same as they would on the physical form for a single-trip harvest.
 */
export function WeighingSlipPrint() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useWeighingRecord(id ? Number(id) : undefined)
  const { data: settings } = useCompanySettings()

  if (isLoading) return <div className="p-8 text-sm text-gray-500">Loading…</div>
  if (error || !data) return <div className="p-8 text-sm text-red-700">Weighing record not found.</div>

  const { record, farmerName, vehicleNo } = data

  const crateCount = record.crateCountAtWeighing ?? record.numCrates
  const tareRate = record.crateTareWeightKg
  const tareWeight = record.tareWeightKg
  const grossWeight = record.grossWeightKg
  const netFruitWeight = record.netFruitWeightKg ?? record.totalWeightKg

  const blockA = Array.from({ length: 20 }, (_, i) => {
    const sNo = i + 1
    if (sNo === 7) return { sNo, value: crateCount !== undefined ? String(crateCount) : '' }
    if (sNo === 8) return { sNo, value: tareRate !== undefined ? `× ${tareRate}` : '' }
    if (sNo === 10) return { sNo, value: tareWeight !== undefined ? tareWeight : '' }
    return { sNo, value: '' }
  })

  const blockB = Array.from({ length: 20 }, (_, i) => {
    const sNo = i + 21
    if (sNo === 21) return { sNo, value: grossWeight !== undefined ? grossWeight : '' }
    if (sNo === 27) return { sNo, value: grossWeight !== undefined ? grossWeight : '' }
    if (sNo === 28) return { sNo, value: tareWeight !== undefined ? `− ${tareWeight}` : '' }
    if (sNo === 30) return { sNo, value: netFruitWeight !== undefined ? netFruitWeight : '' }
    return { sNo, value: '' }
  })

  const blockRange = (start: number) => Array.from({ length: 20 }, (_, i) => ({ sNo: start + i, value: '' }))
  const blockC = blockRange(41)
  const blockD = blockRange(61)
  const blockE = blockRange(81)

  return (
    <div className="mx-auto max-w-5xl p-8 text-gray-900 print:p-0">
      <div className="mb-4 flex items-start justify-between border-b-2 border-gray-900 pb-3">
        <div>
          <h1 className="text-xl font-bold">{settings?.companyName ?? 'Reliable Fresh Pune'}</h1>
          <p className="text-sm font-semibold">Material Inward Weight Slip (PRE Cleaning Slip) Provisional</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Slip Serial No.</p>
          <p className="text-lg font-bold">{record.slipSerialNo ?? '—'}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <p><span className="text-gray-500">Vehicle No.:</span> {vehicleNo ?? '—'}</p>
        <p><span className="text-gray-500">Date:</span> {record.date ?? '—'}</p>
        <p><span className="text-gray-500">Harvester No.:</span> {record.harvesterNo ?? '—'}</p>
        <p><span className="text-gray-500">Load Id:</span> {record.loadId ?? '—'}</p>
        <p><span className="text-gray-500">No. Crt Reci:</span> {record.noCrtReci ?? '—'}</p>
        <p><span className="text-gray-500">Knitting:</span> {record.knitting ?? '—'}</p>
        <p><span className="text-gray-500">Farmer Name:</span> {farmerName ?? '—'}</p>
        <p><span className="text-gray-500">GGN No.:</span> {settings?.ggnNumber ?? '—'}</p>
        <p><span className="text-gray-500">Village Name:</span> {record.villageName ?? '—'}</p>
        <p><span className="text-gray-500">Contact No.:</span> {record.contactNo ?? '—'}</p>
        <p><span className="text-gray-500">Produce:</span> {record.produceType ?? '—'}</p>
        <p><span className="text-gray-500">Avg Size:</span> {record.averageSize ?? '—'}</p>
        <p><span className="text-gray-500">Avg Sugar:</span> {record.averageSugar ?? '—'}</p>
        <p><span className="text-gray-500">Supervisor:</span> {record.supervisorName ?? '—'}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-gray-900">
              {[0, 1, 2, 3, 4].map((block) => (
                <Fragment key={block}>
                  <th className="border border-gray-300 px-1 py-1">S.No.</th>
                  <th className="border border-gray-300 px-1 py-1">Value</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 20 }, (_, row) => (
              <tr key={row}>
                {[blockA, blockB, blockC, blockD, blockE].map((block, blockIndex) => (
                  <Fragment key={blockIndex}>
                    <td className="border border-gray-200 px-1 py-0.5 text-center text-gray-400">{block[row].sNo}</td>
                    <td className="border border-gray-200 px-1 py-0.5 text-center font-medium">{block[row].value}</td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t-2 border-gray-900 pt-3 text-sm font-semibold">
        <p>Gross Weight (Kg): {netFruitWeight ?? '—'}</p>
        <p>Rejection Weight (Kg): {record.rejectionKg ?? '—'}</p>
        <p>Net Weight (Kg): {record.netWeightKg ?? '—'}</p>
      </div>

      <div className="mt-16 flex justify-between text-sm">
        <p className="border-t border-gray-900 px-8 pt-2">Farmer Name & Sign.</p>
        <p className="border-t border-gray-900 px-8 pt-2">Packhouse Incharge Signature</p>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="mt-8 min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 print:hidden"
      >
        Print
      </button>
    </div>
  )
}
