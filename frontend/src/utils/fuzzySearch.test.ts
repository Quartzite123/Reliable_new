import { describe, expect, it } from 'vitest'
import { fuzzyScore } from './fuzzySearch'

describe('fuzzyScore', () => {
  it('scores an exact substring match as 1', () => {
    expect(fuzzyScore('ajay', 'Ajay Digambar Vadje')).toBe(1)
  })

  it('tolerates a small spelling mistake in a farmer name', () => {
    // Business_Rules R7b — search must tolerate spelling mistakes.
    const score = fuzzyScore('Ajey Vadje', 'Ajay Digambar Vadje')
    expect(score).toBeGreaterThan(0.4)
  })

  it('scores unrelated strings low', () => {
    const score = fuzzyScore('xyz123', 'Ajay Digambar Vadje')
    expect(score).toBeLessThan(0.4)
  })
})
