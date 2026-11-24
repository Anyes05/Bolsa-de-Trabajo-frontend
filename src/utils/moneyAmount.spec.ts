import { describe, expect, it } from 'vitest'
import { isPositiveMoneyAmount, MONEY_AMOUNT_PATTERN } from './moneyAmount'

describe('montos de dinero', () => {
  it('acepta enteros y hasta 2 decimales, como texto o número', () => {
    for (const valor of ['1', '0.01', '1500', '1500.5', '1500.50', 2500, 99.99, '9999999999.99']) {
      expect(isPositiveMoneyAmount(valor)).toBe(true)
    }
  })

  it('rechaza cero, negativos, formatos inválidos y montos fuera de rango', () => {
    for (const valor of ['0', '0.00', 0, '-5', -5, '', ' 10', '10.', '.5', '10.123', '1,5', 'abc', '1e3', '10000000000', '1234567890123']) {
      expect(isPositiveMoneyAmount(valor)).toBe(false)
    }
  })

  it('limita la cantidad de dígitos del patrón', () => {
    expect(MONEY_AMOUNT_PATTERN.test('123456789012')).toBe(true)
    expect(MONEY_AMOUNT_PATTERN.test('1234567890123')).toBe(false)
    expect(MONEY_AMOUNT_PATTERN.test('1.123')).toBe(false)
  })
})
