import { describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'

async function loginAsFieldWorker() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/email/i), 'field@reliablefresh.test')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/hello, sanjay/i)).toBeInTheDocument())
  return user
}

describe('Farmer fuzzy search + seasonal re-registration', () => {
  it('finds an existing farmer despite a spelling mistake and shows their existing plot/season status', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = await loginAsFieldWorker()

    await user.click(screen.getByRole('link', { name: 'Farmers' }))
    await user.click(await screen.findByRole('button', { name: /register farmer/i }))
    await user.type(await screen.findByLabelText(/search for farmer/i), 'Ajey Vadje')

    const match = await screen.findByRole('button', { name: /use this farmer/i })
    expect(match).toBeInTheDocument()
    expect(screen.getByText(/Ajay Digambar Vadje/i)).toBeInTheDocument()

    await user.click(match)

    // Auto-fills from the permanent farmer record + shows the plot already registered this season.
    await waitFor(() => expect(screen.getByText(/MH-NSK-00123/i)).toBeInTheDocument())
    expect(screen.getByText(/Plot 1/i)).toBeInTheDocument()
    expect(screen.getAllByText(/^Passed$/i).length).toBeGreaterThan(0)
  })
})

describe('Plot + Field QC validation', () => {
  it('blocks submission and shows plain-language errors when required fields are missing', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = await loginAsFieldWorker()

    act(() => {
      window.history.pushState({}, '', '/plots/new?farmerId=farmer-1')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => expect(screen.getByRole('heading', { name: /register plot/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /save plot & field qc/i }))

    expect((await screen.findAllByText(/enter the plot number/i)).length).toBeGreaterThan(0)
  })
})
