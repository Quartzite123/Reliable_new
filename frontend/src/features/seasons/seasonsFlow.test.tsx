import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { login, byId } from '@/test/flowHelpers'

describe('Seasons — calendar-based start/end dates', () => {
  it('auto-fills dates, enforces end >= start, and rejects an overlapping season', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = userEvent.setup()
    await login(user, 'admin@reliablefresh.test', /hello, aditi/i)

    await user.click(screen.getByRole('link', { name: 'Seasons' }))
    await user.click(await screen.findByRole('button', { name: /start new season/i }))

    await user.clear(byId('year'))
    await user.type(byId('year'), '2027')
    await user.type(byId('startDate'), '2027-02-01')

    // End date picker disables days before the chosen start date.
    expect(byId('endDate')).toHaveAttribute('min', '2027-02-01')

    await user.type(byId('endDate'), '2027-01-15')
    await user.click(screen.getByRole('button', { name: /^create season$/i }))
    expect(await screen.findByText(/end date must be after start date/i)).toBeInTheDocument()
  }, 15000)

  it('rejects a season that overlaps an existing one', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    const user = userEvent.setup()
    await login(user, 'admin@reliablefresh.test', /hello, aditi/i)

    await user.click(screen.getByRole('link', { name: 'Seasons' }))
    await user.click(await screen.findByRole('button', { name: /start new season/i }))

    const currentYear = new Date().getFullYear()
    await user.clear(byId('year'))
    await user.type(byId('year'), String(currentYear))
    await user.type(byId('startDate'), `${currentYear}-03-01`)
    await user.type(byId('endDate'), `${currentYear}-03-15`)
    await user.click(screen.getByRole('button', { name: /^create season$/i }))

    await waitFor(() => expect(screen.getByText(/a season already exists that overlaps this period/i)).toBeInTheDocument())
  }, 15000)
})
