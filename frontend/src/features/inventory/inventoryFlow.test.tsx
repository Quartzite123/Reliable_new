import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { advanceSeedPlotToWeighed, byId, login } from '@/test/flowHelpers'

describe('Inventory: low-stock alerts and auto stock-out from Packaging', () => {
  it('shows Grape Guard as low stock on the dashboard and alerts page', async () => {
    render(<App />)
    const user = userEvent.setup()

    await login(user, 'inventory@reliablefresh.test', /hello, meera/i)
    await user.click(screen.getByRole('link', { name: 'Inventory' }))

    await waitFor(() => expect(screen.getByText(/below reorder threshold/i)).toBeInTheDocument(), { timeout: 5000 })
    expect(screen.getAllByText(/low stock/i).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('link', { name: /view low-stock alerts/i }))
    await waitFor(() => expect(screen.getAllByText(/Grape Guard/i).length).toBeGreaterThan(0), { timeout: 5000 })
  }, 30000)

  it('auto-deducts BOM materials when a packing run is saved, visible in movement history', async () => {
    render(<App />)
    const user = userEvent.setup()

    await advanceSeedPlotToWeighed(user)

    // Arrival QC pass (straight pass, no follow-up needed here).
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
    await user.type(byId('tssPercent'), '17')
    await user.type(byId('thripsPercent'), '3')
    await user.type(byId('bhuriPercent'), '3')
    await user.type(byId('blackSpotPercent'), '2')
    await user.type(byId('cercosporaPercent'), '1')
    await user.click(screen.getByLabelText('Very Good'))
    await user.click(screen.getByRole('button', { name: /save arrival qc/i }))
    await waitFor(() => expect(screen.getAllByText(/^Passed$/i).length).toBeGreaterThan(0), { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: /logout/i }))
    await screen.findByRole('heading', { name: /welcome back/i })

    // Pack with Thompson Seedless / MASCL / 4.5 Kg / EU — the exact combo the BOM seed targets.
    await login(user, 'office@reliablefresh.test', /hello, rahul/i)
    await user.click(screen.getByRole('link', { name: 'Packaging' }))
    await user.click(await screen.findByRole('button', { name: /new packing run/i }))
    const packagingHarvestCard = await screen.findByText(/ajay digambar vadje/i)
    await user.click(packagingHarvestCard.closest('button')!)
    await screen.findByRole('heading', { name: /new packing run/i })

    await waitFor(() => expect((byId('customerId') as HTMLSelectElement).options.length).toBeGreaterThan(1), { timeout: 5000 })
    await user.selectOptions(byId('customerId'), 'MASCL')
    await user.selectOptions(byId('packSize'), '4.5 Kg')
    await user.selectOptions(byId('complianceType'), 'EU')
    await user.type(byId('date'), '2026-02-13')
    await user.type(byId('slipNo'), 'PACK-100')
    await user.type(byId('totalWeightKg'), '900')
    await user.type(byId('actualRejectionKg'), '90')
    await user.type(byId('numBoxes'), '200')
    await user.type(byId('numPallets'), '5')
    await user.click(screen.getByRole('button', { name: /save packing run/i }))
    await waitFor(() => expect(screen.getByText(/^Lot /i)).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: /logout/i }))
    await screen.findByRole('heading', { name: /welcome back/i })

    // 200 boxes packed -> BOM seed (1 Liner Bag + 2 Grape Guard + 1 Box Sticker per box) should show as auto-deducted movements.
    await login(user, 'inventory@reliablefresh.test', /hello, meera/i)
    await user.click(screen.getByRole('link', { name: 'Inventory' }))
    await user.click(screen.getByRole('link', { name: 'Movement history' }))

    await waitFor(() => expect(screen.getAllByText(/Auto Deducted \(Packaging\)/i).length).toBeGreaterThanOrEqual(3), { timeout: 5000 })
    expect(screen.getAllByText('-400').length).toBeGreaterThan(0) // Grape Guard: 2 x 200 boxes
    // Liner Bag and Box Sticker are both 1 x 200 boxes.
    expect(screen.getAllByText('-200').length).toBeGreaterThan(0)
  }, 60000)
})
