import type { Language } from '../types'
import { COUNTRY_CODES } from '../constants'

export function generatePhoneNumber(language: Language): string {
  const code = COUNTRY_CODES[language]
  const number = Math.floor(1000000000 + Math.random() * 9000000000)
  return `${code}${number}`
}
