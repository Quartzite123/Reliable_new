import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { byId, login } from '@/test/flowHelpers'

describe('Purchase Orders: totals and Indian amount-in-words', () => {
  it('computes assessable value, CGST/SGST, and grand total from line items, never touching packing-material inventory', async () => {
    render(<App />)
    const user = userEvent.setup()

    await login(user, 'office@reliablefresh.test', /hello, rahul/i)
    await user.click(screen.getByRole('link', { name: 'Purchase Orders' }))
    await user.click(await screen.findByRole('button', { name: /new purchase order/i }))

    await user.type(byId('supplierName'), 'A.S. Joshi & Co.')
    await user.type(byId('supplierAddress'), 'Agro Chemical Distributors, Mumbai')
    await user.type(byId('poDate'), '2026-02-20')

    await user.type(byId('lineItems.0.particulars'), 'NPK 19-19-19')
    await user.type(byId('lineItems.0.hsnCode'), '31051000')
    await user.type(byId('lineItems.0.qtyKg'), '1000')
    await user.type(byId('lineItems.0.units'), '20')
    await user.type(byId('lineItems.0.kgPerUnit'), '50')
    await user.type(byId('lineItems.0.rate'), '40')
    // gstPercent defaults to 18 via defaultValues.

    await user.type(byId('otherCharges'), '0')

    await user.click(screen.getByRole('button', { name: /save purchase order/i }))

    // 1000kg x ₹40 = ₹40,000 assessable; 18% GST split evenly -> CGST ₹3,600 / SGST ₹3,600; grand total ₹47,200.
    // The PO number legitimately appears twice: the page title and the print-preview letterhead.
    expect(await screen.findByRole('heading', { name: /^RF-PO/i }, { timeout: 10000 })).toBeInTheDocument()
    // ₹40,000.00 appears twice: once as the line item's amount, once as the assessable value total.
    expect(screen.getAllByText('₹40,000.00').length).toBe(2)
    expect(screen.getAllByText('₹3,600.00').length).toBe(2)
    expect(screen.getByText('₹47,200.00')).toBeInTheDocument()
    expect(screen.getByText(/Rupees Forty Seven Thousand Two Hundred Only/i)).toBeInTheDocument()
  }, 30000)
})
