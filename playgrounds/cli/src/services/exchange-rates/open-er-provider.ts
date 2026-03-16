import { BaseExchangeRateProvider } from './base-provider'
import type { BankCountry, ExchangeRate } from './types'

interface OpenErResponse {
  result: string
  base_code: string
  rates: Record<string, number>
  time_last_update_utc: string
}

/**
 * Universal exchange rate provider via open.er-api.com
 * Aggregates data from 30+ central banks and commercial sources.
 * Supports 161 currencies including RUB, BYN, UAH, etc.
 * Free tier: 1500 requests/month, updates once per day.
 *
 * @see https://www.exchangerate-api.com/docs/free
 */
export class OpenExchangeRateProvider extends BaseExchangeRateProvider {
  readonly country: BankCountry = 'OPEN'
  readonly baseCurrency = 'USD'

  private readonly baseUrl = 'https://open.er-api.com/v6/latest'

  async fetchRates(date?: Date): Promise<ExchangeRate[]> {
    if (date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const target = new Date(date)
      target.setHours(0, 0, 0, 0)

      if (target.getTime() !== today.getTime()) {
        console.warn(
          `open.er-api.com (free) does not support historical rates. Using latest rates instead of ${this.formatDate(date)}.`
        )
      }
    }

    const url = `${this.baseUrl}/${this.baseCurrency}`
    const data = await this.fetchJson<OpenErResponse>(url)

    if (data.result !== 'success') {
      throw new Error(`open.er-api.com returned error: ${JSON.stringify(data)}`)
    }

    const rateDate = date ?? new Date()

    return Object.entries(data.rates)
      .filter(([code, val]) => code !== this.baseCurrency && val !== 0)
      .map(([code, value]) => ({
        fromCurrency: code,
        toCurrency: this.baseCurrency,
        rate: 1 / value,
        scale: 1,
        date: rateDate
      }))
  }
}
