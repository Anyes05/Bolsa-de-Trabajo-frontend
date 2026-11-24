/** Montos con hasta 12 enteros y 2 decimales. Longitudes acotadas: no hay ReDoS. */
export const MONEY_AMOUNT_PATTERN = /^\d{1,12}(?:\.\d{1,2})?$/

export function isPositiveMoneyAmount(value: string | number) {
  const text = String(value)
  return MONEY_AMOUNT_PATTERN.test(text) && Number(text) > 0 && Number(text) < 10000000000
}
