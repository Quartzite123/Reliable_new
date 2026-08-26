import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('redirects an unauthenticated visitor to the login screen', async () => {
    window.history.pushState({}, '', '/home')
    render(<App />)
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('logs a Field Worker in and shows role-appropriate navigation', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'field@reliablefresh.test')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText(/hello, sanjay/i)).toBeInTheDocument())

    // Field Worker should see Plots (their own module) but not Inventory (not their role).
    expect(screen.getByRole('link', { name: 'Plots' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Inventory' })).not.toBeInTheDocument()
  })

  it('gives Admin access to Users/Settings and every operational module', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'admin@reliablefresh.test')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText(/hello, aditi/i)).toBeInTheDocument())

    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inventory' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Farmers' })).toBeInTheDocument()
  })

  it('restricts Lab Worker to Lab Sampling, hiding Contracts/Inventory/Users', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'lab@reliablefresh.test')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText(/hello, priya/i)).toBeInTheDocument())

    expect(screen.getByRole('link', { name: 'Lab Sampling' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Contracts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Inventory' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('blocks a role from reaching a route it lacks permission for by URL', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'lab@reliablefresh.test')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText(/hello, priya/i)).toBeInTheDocument())

    window.history.pushState({}, '', '/inventory')
    window.dispatchEvent(new PopStateEvent('popstate'))

    // RequirePermission redirects back to /home rather than rendering the Inventory dashboard.
    await waitFor(() => expect(screen.getByText(/hello, priya/i)).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: /^inventory$/i })).not.toBeInTheDocument()
  })
})
