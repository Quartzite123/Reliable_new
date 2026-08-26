import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { advanceSeedPlotToWeighed, byId, login, logout } from '@/test/flowHelpers'

describe('Arrival QC follow-up -> Packaging cascading dropdowns -> traceability', () => {
  it('fails Arrival QC, allows a follow-up re-attempt, then packs with customer-filtered pack sizes', async () => {
    render(<App />)
    const user = userEvent.setup()

    await advanceSeedPlotToWeighed(user)

    // --- Arrival QC: first attempt fails, follow-up passes ---
    await login(user, 'field@reliablefresh.test', /hello, sanjay/i)
    await user.click(screen.getByRole('link', { name: 'Arrival QC' }))
    await user.click(await screen.findByRole('button', { name: /new inspection/i }))
    const harvestCard = await screen.findByText(/ajay digambar vadje/i)
    await user.click(harvestCard.closest('button')!)

    await screen.findByLabelText(/inspection date/i)
    await user.type(byId('inspectionDate'), '2026-02-11')
    await user.type(byId('fruitColourGreenPct'), '80')
    await user.type(byId('fruitColourMilkyPct'), '20')
    await user.type(byId('fruitColourYellowPct'), '0')
    await user.type(byId('tssPercent'), '16')
    await user.type(byId('thripsPercent'), '5')
    await user.type(byId('bhuriPercent'), '5')
    // Black spot above the mock fail threshold (>10%) — this attempt should fail.
    await user.type(byId('blackSpotPercent'), '25')
    await user.type(byId('cercosporaPercent'), '2')
    await user.click(screen.getByLabelText('Good'))
    await user.click(screen.getByRole('button', { name: /save arrival qc/i }))

    await waitFor(() => expect(screen.getByText(/arrival qc failed/i)).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: /create follow-up/i }))
    await user.type(byId('fu-inspectionDate'), '2026-02-12')
    await user.type(byId('fu-fruitColourGreenPct'), '80')
    await user.type(byId('fu-fruitColourMilkyPct'), '20')
    await user.type(byId('fu-fruitColourYellowPct'), '0')
    await user.type(byId('fu-tssPercent'), '17')
    await user.type(byId('fu-thripsPercent'), '3')
    await user.type(byId('fu-bhuriPercent'), '3')
    await user.type(byId('fu-blackSpotPercent'), '2')
    await user.type(byId('fu-cercosporaPercent'), '1')
    await user.click(screen.getByLabelText('Very Good'))
    await user.click(screen.getByRole('button', { name: /submit follow-up inspection/i }))

    await waitFor(() => expect(screen.getAllByText(/^Passed$/i).length).toBeGreaterThan(0), { timeout: 5000 })

    await logout(user)

    // --- Packaging: cascading customer -> pack size, limited to Thompson Seedless combos ---
    await login(user, 'office@reliablefresh.test', /hello, rahul/i)
    await user.click(screen.getByRole('link', { name: 'Packaging' }))
    await user.click(await screen.findByRole('button', { name: /new packing run/i }))
    const packagingHarvestCard = await screen.findByText(/ajay digambar vadje/i)
    await user.click(packagingHarvestCard.closest('button')!)

    await screen.findByRole('heading', { name: /new packing run/i })

    // Before a customer is chosen, pack size has no options and is disabled.
    expect((byId('packSize') as HTMLSelectElement).disabled).toBe(true)

    await waitFor(() => expect((byId('customerId') as HTMLSelectElement).options.length).toBeGreaterThan(1), { timeout: 5000 })
    await user.selectOptions(byId('customerId'), 'MASCL')
    expect((byId('packSize') as HTMLSelectElement).disabled).toBe(false)
    const packSizeOptions = Array.from((byId('packSize') as HTMLSelectElement).options).map((o) => o.value)
    // Thompson Seedless + MASCL is valid for 4.5/5 Kg only, never the Sonaka-only 4 Kg tier.
    expect(packSizeOptions).toEqual(expect.arrayContaining(['4.5 Kg', '5 Kg']))
    expect(packSizeOptions).not.toContain('4 Kg')

    await user.selectOptions(byId('packSize'), '5 Kg')
    await user.selectOptions(byId('complianceType'), 'Non-Testing')
    await user.type(byId('date'), '2026-02-13')
    await user.type(byId('slipNo'), 'PACK-001')
    await user.type(byId('totalWeightKg'), '900')
    await user.type(byId('actualRejectionKg'), '90')
    await user.type(byId('numBoxes'), '150')
    await user.type(byId('numPallets'), '5')

    await user.click(screen.getByRole('button', { name: /save packing run/i }))

    // Lands on the Lot detail page with full traceability back to the farmer/plot/QC history.
    await waitFor(() => expect(screen.getByText(/^Lot /i)).toBeInTheDocument(), { timeout: 5000 })
    expect(screen.getByText(/MASCL/)).toBeInTheDocument()
    expect(screen.getByText(/ajay digambar vadje/i)).toBeInTheDocument()
    expect(screen.getByText(/MH-NSK-00123/)).toBeInTheDocument()
  }, 60000)
})
