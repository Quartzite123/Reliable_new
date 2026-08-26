import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUpload } from './FileUpload'

function makeFile(name: string, sizeBytes: number, type = 'application/pdf') {
  const file = new File([new Uint8Array(sizeBytes)], name, { type })
  return file
}

describe('FileUpload', () => {
  it('accepts a file within the size limit', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FileUpload label="2A document" value={null} onChange={onChange} maxSizeMb={1} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const smallFile = makeFile('doc.pdf', 500 * 1024)
    await user.upload(input, smallFile)

    expect(onChange).toHaveBeenCalledWith(smallFile)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('rejects a file over the size limit with a plain-language message, and clears any selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FileUpload label="2A document" value={null} onChange={onChange} maxSizeMb={1} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = makeFile('big.pdf', 2 * 1024 * 1024)
    await user.upload(input, bigFile)

    expect(onChange).toHaveBeenCalledWith(null)
    expect(screen.getByRole('alert')).toHaveTextContent(/too large/i)
  })
})
