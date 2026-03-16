import type { BankCountry } from '../services/exchange-rates'

const CURRENCY_TO_BANK: Record<string, BankCountry> = {
  BYN: 'BY',
  RUB: 'RU'
}

/**
 * Determines the exchange rate provider by target currency.
 * BYN → NBRB, RUB → CBR, everything else → open.er-api.com (universal aggregator).
 */
export function detectBankByCurrency(targetCurrency: string): BankCountry {
  return CURRENCY_TO_BANK[targetCurrency.toUpperCase()] ?? 'OPEN'
}
