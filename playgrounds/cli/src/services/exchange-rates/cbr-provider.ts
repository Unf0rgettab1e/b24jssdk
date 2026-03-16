import { BaseExchangeRateProvider } from './base-provider'
import type { BankCountry, ExchangeRate } from './types'

interface CbrValute {
  ID: string
  NumCode: string
  CharCode: string
  Nominal: number
  Name: string
  Value: number
  Previous: number
}

interface CbrDailyResponse {
  Date: string
  PreviousDate: string
  PreviousURL: string
  Timestamp: string
  Valute: Record<string, CbrValute>
}

/**
 * Central Bank of Russia (via cbr-xml-daily.ru mirror)
 * API docs: https://www.cbr-xml-daily.ru/
 */
export class CBRProvider extends BaseExchangeRateProvider {
  readonly country: BankCountry = 'RU'
  readonly baseCurrency = 'RUB'

  private readonly currentUrl = 'https://www.cbr-xml-daily.ru/daily_json.js'

  private archiveUrl(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `https://www.cbr-xml-daily.ru/archive/${y}/${m}/${d}/daily_json.js`
  }

  async fetchRates(date?: Date): Promise<ExchangeRate[]> {
    const url = date ? this.archiveUrl(date) : this.currentUrl
    const data = await this.fetchJson<CbrDailyResponse>(url)

    return Object.values(data.Valute).map(v => ({
      fromCurrency: v.CharCode,
      toCurrency: this.baseCurrency,
      rate: v.Value,
      scale: v.Nominal,
      date: date ?? new Date(data.Date)
    }))
  }
}
