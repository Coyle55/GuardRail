import { calculateGuardrailAmount } from './transfer'

describe('calculateGuardrailAmount', () => {
  it('calculates 20% of $5.00 as $1.00', () => {
    expect(calculateGuardrailAmount(5, 20)).toBe(1)
  })
  it('calculates 20% of $7.00 as $1.40', () => {
    expect(calculateGuardrailAmount(7, 20)).toBe(1.4)
  })
  it('rounds to 2 decimal places', () => {
    expect(calculateGuardrailAmount(10, 33)).toBe(3.3)
  })
  it('handles 0%', () => {
    expect(calculateGuardrailAmount(10, 0)).toBe(0)
  })
  it('handles 50%', () => {
    expect(calculateGuardrailAmount(100, 50)).toBe(50)
  })
})
