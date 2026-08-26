import { useEffect, useState } from 'react'
import { useCompanySettings } from '@/features/companySettings/hooks'

interface OrderSheetLine {
  material: { materialType: string; variantName: string; unitOfMeasure: string }
  toOrder: number
}

/**
 * Print-friendly HTML the manager opens in a new tab and print-to-PDFs.
 * Not a GST invoice — a simple shopping list with RF letterhead. Full
 * server-side PDF generation is future work (prompt.md §6 note).
 */
export function OrderSheetPrintPage() {
  const { data: settings } = useCompanySettings()
  const [lines, setLines] = useState<OrderSheetLine[]>([])

  useEffect(() => {
    const raw = sessionStorage.getItem('orderSheetLines')
    if (raw) {
      try {
        setLines(JSON.parse(raw))
      } catch {
        setLines([])
      }
    }
  }, [])

  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="mx-auto max-w-3xl p-8 text-gray-900 print:p-0">
      <div className="mb-6 flex items-center justify-between border-b-2 border-gray-900 pb-4">
        <div>
          <h1 className="text-2xl font-bold">{settings?.companyName ?? 'RELIABLE FRESH'}</h1>
          <p className="text-sm text-gray-600">{settings?.companyAddress ?? 'Pune, Maharashtra, India'}</p>
          {settings?.companyPhone && <p className="text-sm text-gray-600">Phone: {settings.companyPhone}</p>}
          {settings?.companyGstNumber && <p className="text-sm text-gray-600">GST: {settings.companyGstNumber}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">Material Order</p>
          <p className="text-sm text-gray-600">Date: {today}</p>
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        This is a material ordering sheet, not a GST invoice — a shopping list for the supplier. Price and Amount are filled in by hand or by the supplier.
      </p>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-900 text-left">
            <th className="py-2 pr-2">Sr. No</th>
            <th className="py-2 pr-2">Material</th>
            <th className="py-2 pr-2">Variant</th>
            <th className="py-2 pr-2">Unit</th>
            <th className="py-2 pr-2">Qty Required</th>
            <th className="py-2 pr-2">Price</th>
            <th className="py-2 pr-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="py-2 pr-2">{index + 1}</td>
              <td className="py-2 pr-2">{line.material.materialType}</td>
              <td className="py-2 pr-2">{line.material.variantName}</td>
              <td className="py-2 pr-2">{line.material.unitOfMeasure}</td>
              <td className="py-2 pr-2">{line.toOrder}</td>
              <td className="py-2 pr-2">&nbsp;</td>
              <td className="py-2 pr-2">&nbsp;</td>
            </tr>
          ))}
          {lines.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-gray-400">
                No materials to order.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-900 font-semibold">
            <td colSpan={6} className="py-2 pr-2 text-right">
              Total
            </td>
            <td className="py-2 pr-2">&nbsp;</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-16 flex justify-end">
        <div className="text-center">
          <p className="border-t border-gray-900 px-8 pt-2 text-sm">Authorized by: _______________</p>
        </div>
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
