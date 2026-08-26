import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { login } from '@/test/flowHelpers'

describe('Users — multi-role, active/inactive, soft delete', () => {
  it('requires at least one role and shows multiple roles joined in the list', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = userEvent.setup()
    await login(user, 'admin@reliablefresh.test', /hello, aditi/i)

    await user.click(screen.getByRole('link', { name: 'Users' }))
    await user.click(await screen.findByRole('button', { name: /new user/i }))

    await user.type(screen.getByLabelText(/full name/i), 'Test Multi Role')
    await user.type(screen.getByLabelText(/email/i), 'multirole@reliablefresh.test')
    await user.type(screen.getByLabelText(/temporary password/i), 'password123')

    // No role selected yet — submitting should show the "select at least one role" error.
    await user.click(screen.getByRole('button', { name: /create user/i }))
    expect(await screen.findByText(/select at least one role/i)).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Field Worker' }))
    await user.click(screen.getByRole('checkbox', { name: 'Office Worker' }))
    await user.click(screen.getByRole('button', { name: /create user/i }))

    const rows = await screen.findAllByText('Test Multi Role')
    const tableRow = rows[0].closest('tr') ?? rows[0].closest('div')
    expect(tableRow).toBeTruthy()
    expect(within(tableRow as HTMLElement).getByText(/field worker, office worker/i)).toBeInTheDocument()
  }, 15000)

  it('toggles active/inactive with a confirmation dialog', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = userEvent.setup()
    await login(user, 'admin@reliablefresh.test', /hello, aditi/i)

    await user.click(screen.getByRole('link', { name: 'Users' }))
    const toggles = await screen.findAllByRole('switch', { name: /toggle active status for sanjay more/i })
    const toggle = toggles[0]
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.click(toggle)
    expect(await screen.findByText(/change status to inactive/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^confirm$/i }))

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'))
  }, 15000)

  it('soft-deletes a user, removing the toggle and showing a Deleted badge', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = userEvent.setup()
    await login(user, 'admin@reliablefresh.test', /hello, aditi/i)

    await user.click(screen.getByRole('link', { name: 'Users' }))
    const nameCells = await screen.findAllByText('Priya Deshmukh')
    const row = nameCells[0].closest('tr') ?? (nameCells[0].closest('div') as HTMLElement)
    await user.click(within(row as HTMLElement).getByRole('button', { name: /^delete$/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/this will disable login but keep their history/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Deleted users are hidden by default and only reappear with "Show deleted" checked.
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText(/show deleted/i))
    await waitFor(() => expect(screen.getAllByText('Deleted').length).toBeGreaterThan(0))
  }, 15000)
})
