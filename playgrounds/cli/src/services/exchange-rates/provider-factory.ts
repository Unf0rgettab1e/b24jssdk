import type { BankCountry, IExchangeRateProvider } from './types'
import { NBRBProvider } from './nbrb-provider'
import { CBRProvider } from './cbr-provider'
import { OpenExchangeRateProvider } from './open-er-provider'

export function createExchangeRateProvider(country: BankCountry): IExchangeRateProvider {
  switch (country) {
    case 'BY':
      return new NBRBProvider()
    case 'RU':
      return new CBRProvider()
    case 'OPEN':
      return new OpenExchangeRateProvider()
    default:
      throw new Error(`Unsupported bank country: ${country}. Use one of: BY, RU, OPEN`)
  }
}
