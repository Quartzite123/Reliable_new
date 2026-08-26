import { expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'

type User = ReturnType<typeof userEvent.setup>

export function byId(id: string) {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Expected element #${id} to exist`)
  return el as HTMLInputElement | HTMLSelectElement
}

export async function login(user: User, email: string, greetingRegex: RegExp) {
  await screen.findByRole('heading', { name: /welcome back/i })
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(greetingRegex)).toBeInTheDocument(), { timeout: 5000 })
}

export async function logout(user: User) {
  await user.click(screen.getByRole('button', { name: /logout/i }))
  await screen.findByRole('heading', { name: /welcome back/i })
}

export const tinyFile = (name: string) => new File(['x'], name, { type: 'image/png' })

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Drives a plot that already passed Field QC in the seed data all the way
 * through to a Weighed vehicle trip, exactly like
 * features/weighing/weighingFlow.test.tsx — extracted here so later-phase
 * tests (Arrival QC, Packaging, ...) don't have to re-derive the setup.
 * Rejection % is fixed at 10% throughout so downstream tests can assert on it.
 *
 * Picks whichever plot the (deterministic, seeded) mock data surfaces as
 * eligible rather than a hardcoded farmer name — farmer names are
 * generated, not a stable contract (each is unique within the farmer
 * roster — see features/farmers/mockStore.ts).
 */
export async function advanceSeedPlotToWeighed(user: User): Promise<string> {
  await login(user, 'priya.lab@reliablefresh.test', /hello, priya/i)
  await user.click(screen.getByRole('link', { name: 'Lab Sampling' }))
  await user.click(await screen.findByRole('button', { name: /new sample/i }))
  await waitFor(() => expect(document.querySelector('li button p.font-semibold')).toBeTruthy(), { timeout: 5000 })
  // advanceSeedPlotToPacked's Packaging step depends on the seeded BOM combo
  // (Thompson Seedless / MASCL / 4.5 Kg / EU) — pick a candidate with that
  // variety so both this function and advanceSeedPlotToPacked stay valid.
  const candidateNameEl = (Array.from(document.querySelectorAll('li button p.font-semibold')).find((el) =>
    el.nextElementSibling?.textContent?.includes('Thompson Seedless'),
  ) ?? document.querySelector('li button p.font-semibold')) as HTMLElement
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

  await login(user, 'rahul.fieldworker@reliablefresh.test', /hello, rahul/i)
  await user.click(screen.getByRole('link', { name: 'Farmers' }))
  // Responsive layouts render both a desktop row and a mobile card for the
  // same farmer, so this can match twice — either is fine to click.
  const farmerRows = await screen.findAllByText(farmerRegex)
  await user.click(farmerRows[0])
  // ~60 of the 100 seeded farmers already have bank details on file
  // (farmers/mockStore.ts) — the link reads "Update" instead of "Add" then.
  await user.click(await screen.findByRole('link', { name: /add bank details|update bank details/i }))
  await screen.findByLabelText(/account holder name/i)
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
  await user.type(byId('contractDate'), '2026-02-01')
  await user.type(byId('ratePerKg'), '45')
  await user.clear(byId('rejectionPercent'))
  await user.type(byId('rejectionPercent'), '10')
  await user.click(screen.getByRole('button', { name: /create contract/i }))
  await waitFor(() => expect(screen.getByText(/10%/)).toBeInTheDocument(), { timeout: 5000 })

  await logout(user)

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
  await user.clear(byId('date'))
  await user.type(byId('date'), '2026-02-10')
  await user.type(byId('supervisorName'), 'Ganesh Supervisor')
  await user.type(byId('crateCountAtWeighing'), '50')
  await user.type(byId('grossWeightKg'), '1080')
  await user.upload(byId('slipPhoto') as HTMLInputElement, tinyFile('slip.png'))
  await user.click(screen.getByRole('button', { name: /calculate & review/i }))
  await screen.findByText(/rejection calculation/i)
  await user.click(screen.getByRole('button', { name: /confirm & save/i }))
  await screen.findByRole('link', { name: /print slip/i }, { timeout: 5000 })

  await logout(user)

  return farmerName
}

/**
 * Continues past advanceSeedPlotToWeighed through a passing Arrival QC and
 * one Packaging run (Thompson Seedless / MASCL / 4.5 Kg / EU — the combo the
 * BOM seed targets), leaving `numBoxes` boxes sitting in a lot ready for
 * Palletisation.
 */
export async function advanceSeedPlotToPacked(user: User, numBoxes: number) {
  const farmerName = await advanceSeedPlotToWeighed(user)
  const farmerRegex = new RegExp(escapeRegExp(farmerName), 'i')

  await login(user, 'rahul.fieldworker@reliablefresh.test', /hello, rahul/i)
  await user.click(screen.getByRole('link', { name: 'Arrival QC' }))
  await user.click(await screen.findByRole('button', { name: /new inspection/i }))
  const harvestCard = await screen.findByText(farmerRegex)
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
  await user.click(screen.getByRole('radio', { name: /^pass$/i }))
  await user.click(screen.getByRole('button', { name: /save arrival qc/i }))
  await waitFor(() => expect(screen.getAllByText(/^Passed$/i).length).toBeGreaterThan(0), { timeout: 5000 })

  await logout(user)

  await login(user, 'meera.office@reliablefresh.test', /hello, meera/i)
  await user.click(screen.getByRole('link', { name: 'Packaging' }))
  await user.click(await screen.findByRole('button', { name: /new packing run/i }))
  const packagingHarvestCard = await screen.findByText(farmerRegex)
  await user.click(packagingHarvestCard.closest('button')!)
  await screen.findByRole('heading', { name: /new packing run/i })

  await waitFor(() => expect((byId('customerId') as HTMLSelectElement).options.length).toBeGreaterThan(1), { timeout: 5000 })
  await user.selectOptions(byId('customerId'), 'MASCL')
  await user.selectOptions(byId('packSize'), '4.5 Kg')
  await user.selectOptions(byId('complianceType'), 'EU')
  await user.type(byId('date'), '2026-02-13')
  await user.type(byId('slipNo'), 'PACK-200')
  await user.type(byId('totalWeightKg'), '900')
  await user.type(byId('actualRejectionKg'), '90')
  await user.type(byId('numBoxes'), String(numBoxes))
  await user.type(byId('numPallets'), '5')
  await user.click(screen.getByRole('button', { name: /save packing run/i }))
  await waitFor(() => expect(screen.getByText(/^Lot /i)).toBeInTheDocument(), { timeout: 5000 })

  await logout(user)
}
