import { BaseExchangeRateProvider } from './base-provider'
import type { BankCountry, ExchangeRate } from './types'

interface NbrbRate {
  Cur_ID: number
  Cur_Abbreviation: string
  Cur_Scale: number
  Cur_Name: string
  Cur_OfficialRate: number | null
  Date: string
}

/**
 * National Bank of the Republic of Belarus
 * API docs: https://www.nb-rb.by/apihelp/exrates.htm
 */
export class NBRBProvider extends BaseExchangeRateProvider {
  readonly country: BankCountry = 'BY'
  readonly baseCurrency = 'BYN'

  private readonly baseUrl = 'https://api.nbrb.by/exrates/rates'

  async fetchRates(date?: Date): Promise<ExchangeRate[]> {
    let url = `${this.baseUrl}?periodicity=0`
    if (date) {
      url += `&ondate=${this.formatDate(date)}`
    }

    const data = await this.fetchJson<NbrbRate[]>(url)

    return data
      .filter(r => r.Cur_OfficialRate !== null)
      .map(r => ({
        fromCurrency: r.Cur_Abbreviation,
        toCurrency: this.baseCurrency,
        rate: r.Cur_OfficialRate!,
        scale: r.Cur_Scale,
        date: date ?? new Date()
      }))
  }
}
