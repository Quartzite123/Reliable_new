import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api/httpClient'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('shows a plain-language message for a 404, never raw HTTP/JSON details', () => {
    render(<ErrorState error={new ApiError(404, { message: 'not used' })} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be found/i)
    expect(screen.queryByText(/404/)).not.toBeInTheDocument()
  })

  it('shows a connection message for a network-level failure', () => {
    render(<ErrorState error={new TypeError('Failed to fetch')} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/could not reach the server/i)
  })

  it('calls onRetry when the Try again button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<ErrorState error={new ApiError(500, { message: 'boom' })} onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/server had a problem/i)
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
