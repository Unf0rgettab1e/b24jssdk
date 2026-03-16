import type { BankCountry, ExchangeRate, IExchangeRateProvider } from './types'
import { FileRateCache } from './file-cache'

let sharedCache: FileRateCache | null = null

function getCache(): FileRateCache {
  if (!sharedCache) {
    sharedCache = new FileRateCache()
  }
  return sharedCache
}

export abstract class BaseExchangeRateProvider implements IExchangeRateProvider {
  abstract readonly country: BankCountry
  abstract readonly baseCurrency: string

  private readonly maxRetries = 3

  abstract fetchRates(date?: Date): Promise<ExchangeRate[]>

  protected formatDate(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  private cacheKey(date?: Date): string {
    const dateStr = date ? this.formatDate(date) : 'latest'
    return `${this.country}:${dateStr}`
  }

  async getRates(date?: Date): Promise<ExchangeRate[]> {
    const key = this.cacheKey(date)
    const cache = getCache()
    const cached = cache.get(key)

    if (cached) {
      return cached
    }

    const rates = await this.fetchWithRetry(date)
    cache.set(key, rates)
    return rates
  }

  async getRate(currency: string, date?: Date): Promise<ExchangeRate | null> {
    const code = currency.toUpperCase()

    if (code === this.baseCurrency) {
      return {
        fromCurrency: code,
        toCurrency: this.baseCurrency,
        rate: 1,
        scale: 1,
        date: date ?? new Date()
      }
    }

    const rates = await this.getRates(date)
    return rates.find(r => r.fromCurrency === code) ?? null
  }

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<number> {
    const from = fromCurrency.toUpperCase()
    const to = toCurrency.toUpperCase()

    if (from === to) return amount

    const fromRate = await this.getRate(from, date)
    const toRate = await this.getRate(to, date)

    if (!fromRate) throw new Error(`Rate 'from' not found for ${from}`)
    if (!toRate) throw new Error(`Rate 'to' not found for ${to}`)

    const amountInBase = (amount / fromRate.scale) * fromRate.rate
    return (amountInBase / toRate.rate) * toRate.scale
  }

  private async fetchWithRetry(date?: Date): Promise<ExchangeRate[]> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.fetchRates(date)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < this.maxRetries) {
          const delayMs = Math.pow(2, attempt) * 500
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      }
    }

    throw new Error(
      `Failed to fetch rates from ${this.country} after ${this.maxRetries} attempts: ${lastError?.message}`
    )
  }

  protected async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} (${url})`)
    }
    return response.json() as Promise<T>
  }
}
