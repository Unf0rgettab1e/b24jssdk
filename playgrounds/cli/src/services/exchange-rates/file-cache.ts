import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { ExchangeRate } from './types'

interface CacheEntry {
  rates: SerializedRate[]
  fetchedAt: number
}

interface SerializedRate {
  fromCurrency: string
  toCurrency: string
  rate: number
  scale: number
  date: string
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

export class FileRateCache {
  private readonly filePath: string
  private readonly ttlMs: number
  private data: Record<string, CacheEntry> = {}

  constructor(cacheDir?: string, ttlMs?: number) {
    const dir = cacheDir ?? resolve(process.cwd(), '.cache')
    this.filePath = resolve(dir, 'exchange-rates.json')
    this.ttlMs = ttlMs ?? DEFAULT_TTL_MS
    this.load()
  }

  get(key: string): ExchangeRate[] | null {
    const entry = this.data[key]
    if (!entry) return null

    if (Date.now() - entry.fetchedAt > this.ttlMs) {
      delete this.data[key] // eslint-disable-line @typescript-eslint/no-dynamic-delete
      this.persist()
      return null
    }

    return entry.rates.map(r => ({
      ...r,
      date: new Date(r.date)
    }))
  }

  set(key: string, rates: ExchangeRate[]): void {
    this.data[key] = {
      rates: rates.map(r => ({
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        rate: r.rate,
        scale: r.scale,
        date: r.date.toISOString()
      })),
      fetchedAt: Date.now()
    }
    this.persist()
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8')
        this.data = JSON.parse(raw)
      }
    } catch {
      this.data = {}
    }
  }

  private persist(): void {
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch {
      console.error('Error writing cache file', this.filePath)
    }
  }
}
