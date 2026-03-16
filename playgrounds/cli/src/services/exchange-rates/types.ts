export type BankCountry = 'BY' | 'RU' | 'OPEN'

export interface ExchangeRate {
  fromCurrency: string
  toCurrency: string
  rate: number
  scale: number
  date: Date
}

export interface IExchangeRateProvider {
  readonly country: BankCountry
  readonly baseCurrency: string

  getRate(currency: string, date?: Date): Promise<ExchangeRate | null>
  getRates(date?: Date): Promise<ExchangeRate[]>
  convert(amount: number, fromCurrency: string, toCurrency: string, date?: Date): Promise<number>
}
