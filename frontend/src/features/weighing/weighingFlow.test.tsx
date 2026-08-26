import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'

function byId(id: string) {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Expected element #${id} to exist`)
  return el as HTMLInputElement | HTMLSelectElement
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function login(user: ReturnType<typeof userEvent.setup>, email: string, greetingRegex: RegExp) {
  await screen.findByRole('heading', { name: /welcome back/i })
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(greetingRegex)).toBeInTheDocument(), { timeout: 5000 })
}

async function logout(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /logout/i }))
  await screen.findByRole('heading', { name: /welcome back/i })
}

const tinyFile = (name: string) => new File(['x'], name, { type: 'image/png' })

describe('Field QC -> Lab -> Contract -> Harvest -> Weighing', () => {
  it('carries the full chain, enforcing gates and never hardcoding the rejection percentage', async () => {
    render(<App />)
    const user = userEvent.setup()

    // Lab Sampling is only visible for plots that passed Field QC (Business_Rules R18).
    await login(user, 'priya.lab@reliablefresh.test', /hello, priya/i)
    await user.click(screen.getByRole('link', { name: 'Lab Sampling' }))
    await user.click(await screen.findByRole('button', { name: /new sample/i }))
    // Pick whichever plot the (deterministic, seeded) mock data surfaces as
    // eligible, rather than a hardcoded farmer name — farmer names in the
    // mock dataset are generated, not a stable contract (each is
    // guaranteed unique within the farmer roster — see farmers/mockStore.ts).
    await waitFor(() => expect(document.querySelector('li button p.font-semibold')).toBeTruthy(), { timeout: 5000 })
    const candidateNameEl = document.querySelector('li button p.font-semibold') as HTMLElement | null
    if (!candidateNameEl) throw new Error('No eligible plot found for lab sampling in mock data')
    const farmerName = candidateNameEl.textContent!.trim()
    const farmerRegex = new RegExp(escapeRegExp(farmerName), 'i')
    await user.click(candidateNameEl.closest('button')!)

    await screen.findByText(/plot reference/i)
    await user.selectOptions(byId('labName'), 'TUV India Ltd')
    await user.type(byId('samplingDate'), '2026-01-25')
    await user.type(byId('sealNo'), 'SEAL-001')
    await user.type(byId('areaHa2a'), '2.5')
    await user.type(byId('yield4bMt'), '1.8')
    await user.type(byId('tssValue'), '18')
    await user.click(screen.getByRole('radio', { name: /^pass$/i }))

    await user.click(screen.getByRole('button', { name: /save lab sample/i }))
    await waitFor(() => expect(screen.getByText(/^Passed$/i)).toBeInTheDocument(), { timeout: 5000 })

    await logout(user)

    // Field Worker adds bank details so the office worker isn't blocked later.
    await login(user, 'rahul.fieldworker@reliablefresh.test', /hello, rahul/i)
    await user.click(screen.getByRole('link', { name: 'Farmers' }))
    // Responsive layouts render both a desktop table row and a mobile card
    // for the same farmer, so this can match twice — either is fine to click.
    const farmerRows = await screen.findAllByText(farmerRegex)
    await user.click(farmerRows[0])
    // ~60 of the 100 seeded farmers already have bank details on file
    // (farmers/mockStore.ts) — the link reads "Update" instead of "Add" for
    // those, but the form and required fields are identical either way.
    await user.click(await screen.findByRole('link', { name: /add bank details|update bank details/i }))

    await screen.findByLabelText(/account holder name/i)
    // Editing existing bank details pre-fills these fields — clear first so
    // typing doesn't append onto (and invalidate) the existing values.
    await user.clear(byId('accountHolderName'))
    await user.type(byId('accountHolderName'), farmerName)
    await user.clear(byId('bankName'))
    await user.type(byId('bankName'), 'Bank of Maharashtra')
    await user.clear(byId('accountNumber'))
    await user.type(byId('accountNumber'), '123456789012')
    await user.clear(byId('ifscCode'))
    await user.type(byId('ifscCode'), 'MAHB0001234')
    await user.click(screen.getByRole('button', { name: /save bank details/i }))
    await waitFor(() => expect(screen.getByText(/farmer details/i)).toBeInTheDocument(), { timeout: 5000 })

    await logout(user)

    // Contract creation is blocked until Field QC + Lab + Bank Details are all in place, and rejection % is editable, not hardcoded.
    await login(user, 'meera.office@reliablefresh.test', /hello, meera/i)
    await user.click(screen.getByRole('link', { name: 'Contracts' }))
    await user.click(await screen.findByRole('button', { name: /new contract/i }))
    const contractCard = await screen.findByText(farmerRegex)
    await user.click(contractCard.closest('button')!)

    await waitFor(
      () => {
        expect(screen.getByText('Field QC Passed')).toBeInTheDocument()
        expect(screen.getByText('Lab Passed')).toBeInTheDocument()
        expect(screen.getByText('Bank Details Available')).toBeInTheDocument()
      },
      { timeout: 5000 },
    )
    expect(screen.getByRole('heading', { name: /contract terms/i })).toBeInTheDocument()

    await user.type(byId('contractDate'), '2026-02-01')
    await user.type(byId('ratePerKg'), '45')
    await user.clear(byId('rejectionPercent'))
    await user.type(byId('rejectionPercent'), '10')

    await user.click(screen.getByRole('button', { name: /create contract/i }))
    await waitFor(() => expect(screen.getByText(/10%/)).toBeInTheDocument(), { timeout: 5000 })

    await logout(user)

    // Harvest + Weighing: the rejection % shown must come from the contract (10%), never a hardcoded 7%.
    await login(user, 'rahul.fieldworker@reliablefresh.test', /hello, rahul/i)
    await user.click(screen.getByRole('link', { name: 'Harvests' }))
    await user.click(await screen.findByRole('button', { name: /record harvest/i }))
    const harvestCard = await screen.findByText(farmerRegex)
    await user.click(harvestCard.closest('button')!)

    await screen.findByRole('heading', { name: /vehicle trips/i })
    await user.type(byId('harvestDate'), '2026-02-10')
    await user.type(byId('supervisorName'), 'Ganesh Supervisor')
    await user.type(byId('trips.0.vehicleNo'), 'MH15AB1234')
    await user.type(byId('trips.0.driverName'), 'Ramesh Driver')
    await user.type(byId('trips.0.numCrates'), '50')
    await user.type(byId('trips.0.approxWeightKg'), '500')

    await user.click(screen.getByRole('button', { name: /save harvest/i }))
    await waitFor(() => expect(screen.getByText(/vehicle trips \(1\)/i)).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByRole('link', { name: 'Vehicle Trips' }))
    const tripRows = await screen.findAllByText('MH15AB1234')
    await user.click(tripRows[0])

    await screen.findByRole('heading', { level: 1, name: /weighing/i })
    // The date field defaults to today — clear it before typing the test date.
    await user.clear(byId('date'))
    await user.type(byId('date'), '2026-02-10')
    await user.type(byId('supervisorName'), 'Ganesh Supervisor')
    await user.type(byId('crateCountAtWeighing'), '45')
    await user.type(byId('grossWeightKg'), '1080')

    // Crate mismatch: harvest recorded 50, weighing entered 45 (>5% difference).
    expect(await screen.findByText(/differs from harvest estimate/i)).toBeInTheDocument()

    await user.upload(byId('slipPhoto') as HTMLInputElement, tinyFile('slip.png'))

    await user.click(screen.getByRole('button', { name: /calculate & review/i }))

    // Rejection dialog: contract % (10, from the contract created above) is
    // locked; actual % defaults to it but stays editable — never hardcoded 7%.
    await screen.findByText(/rejection calculation/i)
    expect(screen.getByDisplayValue('10.00%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm & save/i }))

    // "Print Slip" only exists on the detail page — waiting for it (rather
    // than the "Contract rejection %" label, which the dialog itself also
    // shows) confirms the save actually completed and navigated away.
    await screen.findByRole('link', { name: /print slip/i }, { timeout: 5000 })

    // Net fruit weight = 1080 − (45 × 1.6) = 1008; rejection at the contract's
    // 10% = 100.80 kg; net payable = 907.20 kg.
    // Both Contract % and Actual % read "10.00%" here since the operator
    // didn't override the default — two matches is the expected shape.
    expect(screen.getAllByText('10.00%')).toHaveLength(2)
    expect(screen.getByText('100.80 kg')).toBeInTheDocument()
    expect(screen.getByText('907.20 kg')).toBeInTheDocument()
  }, 45000)
})
