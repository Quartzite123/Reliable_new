import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { advanceSeedPlotToPacked, byId, login, logout } from '@/test/flowHelpers'

describe('Palletisation (multi-lot) -> Pre-Cooling (partial save + complete)', () => {
  it('creates a pallet from a packed lot, then logs and completes its pre-cooling reading', async () => {
    render(<App />)
    const user = userEvent.setup()

    await advanceSeedPlotToPacked(user, 120)

    // --- Palletisation: select the available lot, confirm box count shown, save ---
    await login(user, 'office@reliablefresh.test', /hello, rahul/i)
    await user.click(screen.getByRole('link', { name: 'Palletisation' }))
    await user.click(await screen.findByRole('button', { name: /new pallet/i }))

    expect(await screen.findByText(/120 boxes available/i)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox'))
    expect(screen.getByText(/total boxes selected: 120/i)).toBeInTheDocument()

    await user.type(byId('date'), '2026-02-14')
    await user.selectOptions(byId('palletType'), 'Big')
    await user.click(screen.getByRole('button', { name: /create pallet/i }))

    await waitFor(() => expect(screen.getByRole('heading', { name: /^Pallet 2026-P/i })).toBeInTheDocument(), { timeout: 5000 })
    expect(screen.getAllByText(/120 boxes/i).length).toBeGreaterThan(0)

    await logout(user)

    // --- Pre-Cooling: batch in-time entry (partial save), then complete out-time later ---
    await login(user, 'office@reliablefresh.test', /hello, rahul/i)
    await user.click(screen.getByRole('link', { name: 'Pre-Cooling' }))
    await user.click(await screen.findByRole('button', { name: /log in-time/i }))

    const palletCheckbox = await screen.findByRole('checkbox')
    await user.click(palletCheckbox)
    await user.type(byId('date'), '2026-02-15')
    await user.type(byId('inTime'), '08:00')
    await user.type(byId('inBerryTemp'), '4')
    await user.click(screen.getByRole('button', { name: /save in-time entry/i }))

    // Lands back on the Pre-Cooling list; the new record shows In Progress with no out-time yet.
    await waitFor(() => expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThan(0), { timeout: 5000 })
    expect(screen.getAllByText('—').length).toBeGreaterThan(0) // "Out" column, not yet recorded

    // Click the row (matched by pallet label text) to open the detail/complete screen.
    await user.click(screen.getAllByText(/Big/i)[0])
    await screen.findByRole('heading', { name: /complete this entry/i })
    await user.type(byId('outTime'), '20:00')
    await user.type(byId('outBerryTemp'), '1')
    await user.click(screen.getByRole('button', { name: /complete entry/i }))

    await waitFor(() => expect(screen.queryByText(/not recorded yet/i)).not.toBeInTheDocument(), { timeout: 10000 })
    expect(screen.getAllByText(/^Completed$/i).length).toBeGreaterThan(0)
  }, 60000)
})
