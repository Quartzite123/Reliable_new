import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { login } from '@/test/flowHelpers'

describe('Audit Trail — records real actions', () => {
  it('shows a login event after signing in, and a farmer-created event after registering a farmer', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = userEvent.setup()
    await login(user, 'admin@reliablefresh.test', /hello, aditi/i)

    await user.click(screen.getByRole('link', { name: 'Farmers' }))
    await user.click(await screen.findByRole('button', { name: /^register farmer$/i }))
    await user.click(await screen.findByRole('button', { name: /register new farmer/i }))

    await user.type(screen.getByLabelText(/full name/i), 'Audit Test Farmer')
    await user.type(screen.getByLabelText(/mh number/i), 'MH-NSK-99999')
    await user.type(screen.getByLabelText(/mobile/i), '9999999999')
    await user.type(screen.getByLabelText(/address/i), 'Test address')
    await user.click(screen.getByRole('button', { name: /register farmer/i }))

    await waitFor(() => expect(screen.getAllByText(/audit test farmer/i).length).toBeGreaterThan(0), { timeout: 8000 })

    await user.click(screen.getByRole('link', { name: 'Audit Trail' }))
    await waitFor(() => expect(screen.getAllByText(/login succeeded/i).length).toBeGreaterThan(0), { timeout: 8000 })
    await waitFor(() => expect(screen.getAllByText(/farmer created/i).length).toBeGreaterThan(0), { timeout: 8000 })
  }, 20000)
})
