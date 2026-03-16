import { B24Hook, Logger, LogLevel, ConsoleV2Handler, ParamsFactory } from '@bitrix24/b24jssdk'
import { defineCommand } from 'citty'
import 'dotenv/config'
import { showProgress, detectBankByCurrency } from '../../utils'
import { createExchangeRateProvider, type BankCountry, type IExchangeRateProvider } from '../../services/exchange-rates'

type RateDateSource = 'current' | 'closedate' | 'begindate'

const VALID_BANKS: BankCountry[] = ['BY', 'RU', 'OPEN']
const VALID_RATE_DATES: RateDateSource[] = ['current', 'closedate', 'begindate']

// Bitrix24 adds UF_CRM_ prefix; FIELD_NAME in add must be ≤13 chars
const UF_CRM_PREFIX = 'UF_CRM_'

function fieldNameForAdd(currency: string, isDate: boolean): string {
  const c = currency.toUpperCase()
  return isDate ? `CNV_${c}_DT` : `CNV_${c}`
}

const ufAmountFieldName = (currency: string): string => UF_CRM_PREFIX + fieldNameForAdd(currency, false)

const ufDateFieldName = (currency: string): string => UF_CRM_PREFIX + fieldNameForAdd(currency, true)

/**
 * CLI command to recalculate deal amounts into a target currency
 * using exchange rates from NBRB (BY), CBR (RU), or open.er-api.com (OPEN).
 *
 * Bank is auto-detected by target currency:
 *   BYN → BY (NBRB), RUB → RU (CBR), everything else → OPEN (aggregator).
 *
 * Creates userfields per target currency for the converted amount and
 * the last conversion date. On subsequent runs, only open deals are
 * recalculated (unless --forceRecalculate is set).
 *
 * @usage pnpm --filter @bitrix24/b24jssdk-cli dev make recalculate-deals --targetCurrency=USD
 */
export default defineCommand({
  meta: {
    name: 'recalculate-deals',
    description: 'Recalculate deal amounts into a target currency using exchange rates'
  },
  args: {
    bank: {
      description: `Exchange rate source (${VALID_BANKS.join(', ')}). Auto-detected from targetCurrency if omitted.`,
      default: ''
    },
    targetCurrency: {
      description: 'Target currency code (USD, EUR, RUB, BYN...)',
      required: true
    },
    rateDate: {
      description: 'Date source for exchange rate: current, closedate, begindate',
      default: 'current'
    },
    categoryId: {
      description: 'Sales funnel ID (0 = all funnels)',
      default: '0'
    },
    forceRecalculate: {
      description: 'Recalculate all deals including closed ones (true/false)',
      default: 'false'
    }
  },
  async setup({ args }) {
    const targetCurrency = String(args.targetCurrency).toUpperCase()
    const bankArg = String(args.bank || '').toUpperCase()
    const resolvedBank: BankCountry = bankArg
      ? bankArg as BankCountry
      : detectBankByCurrency(targetCurrency)

    const params = {
      bank: resolvedBank,
      targetCurrency,
      rateDate: args.rateDate as RateDateSource,
      categoryId: Number.parseInt(args.categoryId),
      forceRecalculate: args.forceRecalculate === 'true'
    }

    if (!VALID_BANKS.includes(params.bank)) {
      console.error(`Invalid bank: ${params.bank}. Use one of: ${VALID_BANKS.join(', ')}`)
      process.exit(1)
    }

    if (!VALID_RATE_DATES.includes(params.rateDate)) {
      console.error(`Invalid rateDate: ${params.rateDate}. Use one of: ${VALID_RATE_DATES.join(', ')}`)
      process.exit(1)
    }

    // region Logger ////
    const logger = Logger.create('recalculate-deals')
    const handler = new ConsoleV2Handler(LogLevel.DEBUG, { useStyles: false })
    logger.pushHandler(handler)
    // endregion Logger ////

    const hookPath = process.env.B24_HOOK ?? ''
    if (!hookPath) {
      logger.emergency('B24_HOOK environment variable is not set! Please configure it in your .env file')
      process.exit(1)
    }

    const b24 = B24Hook.fromWebhookUrl(hookPath, { restrictionParams: ParamsFactory.getBatchProcessing() })
    logger.info('Connected to Bitrix24', { target: b24.getTargetOrigin() })

    const loggerForDebugB24 = Logger.create('b24')
    const handlerForDebugB24 = new ConsoleV2Handler(LogLevel.ERROR, { useStyles: false })
    loggerForDebugB24.pushHandler(handlerForDebugB24)
    b24.setLogger(loggerForDebugB24)

    // region Exchange rate provider ////
    let rateProvider: IExchangeRateProvider
    try {
      rateProvider = createExchangeRateProvider(params.bank)
    } catch (err) {
      logger.emergency(`Failed to create exchange rate provider: ${err}`)
      process.exit(1)
    }
    // endregion Exchange rate provider ////

    const amountField = ufAmountFieldName(params.targetCurrency)
    const dateField = ufDateFieldName(params.targetCurrency)

    // region Ensure userfields exist ////
    async function ensureUserFields(): Promise<{ amountFieldId: number, dateFieldId: number }> {
      logger.info('Checking userfields for target currency...')

      let existingFields: any[] = []
      try {
        const ufListResponse = await b24.actions.v2.call.make({
          method: 'crm.deal.userfield.list',
          params: {}
        })
        existingFields = (ufListResponse.getData() as any)?.result || []
      } catch (err) {
        logger.error(`Failed to get userfields: ${err}`, { existingFields })
        process.exit(1)
      }

      let amountFieldId = 0
      let dateFieldId = 0

      for (const field of existingFields) {
        if (field.FIELD_NAME === amountField) {
          amountFieldId = Number(field.ID)
        }
        if (field.FIELD_NAME === dateField) {
          dateFieldId = Number(field.ID)
        }
      }

      const amountFieldCode = fieldNameForAdd(params.targetCurrency, false)
      const dateFieldCode = fieldNameForAdd(params.targetCurrency, true)

      logger.info('Creating userfields...', { amountField, dateField })

      try {
        if (!amountFieldId) {
          const resp = await b24.actions.v2.call.make({
            method: 'crm.deal.userfield.add',
            params: {
              fields: {
                FIELD_NAME: amountFieldCode,
                USER_TYPE_ID: 'double',
                LABEL: `Amount in ${params.targetCurrency}`,
                EDIT_FORM_LABEL: { ru: `Сумма в ${params.targetCurrency}`, en: `Amount in ${params.targetCurrency}` },
                LIST_COLUMN_LABEL: { ru: `Сумма в ${params.targetCurrency}`, en: `Amount in ${params.targetCurrency}` },
                SETTINGS: { PRECISION: 2 },
                SHOW_IN_LIST: 'Y',
                IS_SEARCHABLE: 'N'
              }
            }
          })
          amountFieldId = Number((resp.getData() as any)?.result) || 0
          if (!amountFieldId) {
            throw new Error(`Failed to create userfield ${amountField}`)
          }
        }

        if (!dateFieldId) {
          const resp = await b24.actions.v2.call.make({
            method: 'crm.deal.userfield.add',
            params: {
              fields: {
                FIELD_NAME: dateFieldCode,
                USER_TYPE_ID: 'date',
                LABEL: `${params.targetCurrency} conversion date`,
                EDIT_FORM_LABEL: { ru: `Дата пересчёта ${params.targetCurrency}`, en: `${params.targetCurrency} conversion date` },
                LIST_COLUMN_LABEL: { ru: `Дата пересчёта ${params.targetCurrency}`, en: `${params.targetCurrency} conversion date` },
                SHOW_IN_LIST: 'Y',
                IS_SEARCHABLE: 'N'
              }
            }
          })
          dateFieldId = Number((resp.getData() as any)?.result) || 0
          if (!dateFieldId) {
            throw new Error(`Failed to create userfield ${dateField}`)
          }
        }
      } catch (err) {
        logger.error(String(err), { amountField, dateField })
        process.exit(1)
      }

      logger.info('Userfields ready')
      return { amountFieldId, dateFieldId }
    }
    // endregion Ensure userfields exist ////

    // region Fetch all deals ////
    async function fetchAllDeals(): Promise<any[]> {
      logger.info('Fetching deals...')

      const select = [
        'ID', 'TITLE', 'OPPORTUNITY', 'CURRENCY_ID',
        'BEGINDATE', 'CLOSEDATE', 'CLOSED', 'STAGE_ID',
        amountField, dateField
      ]

      const allDeals: any[] = []
      let start = 0

      while (true) {
        const response = await b24.actions.v2.call.make({
          method: 'crm.deal.list',
          params: {
            select,
            order: { ID: 'ASC' },
            start,
            ...(params.categoryId > 0 ? { filter: { CATEGORY_ID: params.categoryId } } : {})
          }
        })

        const items: any[] = (response.getData() as any)?.result || []
        allDeals.push(...items)

        start += items.length
        if (!response.isMore()) break
      }

      logger.info(`Fetched ${allDeals.length} deals total`)
      return allDeals
    }
    // endregion Fetch all deals ////

    // region Filter deals for recalculation ////
    function filterDeals(deals: any[]): any[] {
      if (params.forceRecalculate) {
        return deals
      }

      return deals.filter((deal) => {
        const hasConversion = deal[amountField] && Number(deal[amountField]) > 0
        const isClosed = deal.CLOSED === 'Y' && deal.CLOSEDATE

        if (hasConversion && isClosed) {
          return false
        }

        return true
      })
    }
    // endregion Filter deals for recalculation ////

    // region Recalculate and update ////
    async function recalculateDeals() {
      logger.notice('Starting deal amount recalculation')
      logger.notice(`Bank: ${params.bank} (${rateProvider.baseCurrency})`)
      logger.notice(`Target currency: ${params.targetCurrency}`)
      logger.notice(`Rate date source: ${params.rateDate}`)
      logger.notice(`Force recalculate: ${params.forceRecalculate}`)
      logger.notice('─'.repeat(50))

      const healthCheckData = await b24.tools.healthCheck.make({ requestId: 'healthCheck' })
      logger.notice(`Health check: ${healthCheckData ? 'success' : 'fail'}`)
      if (!healthCheckData) return

      logger.notice('\n')

      const startTime = Date.now()
      const errors: string[] = []
      let convertedCount = 0
      let skippedCount = 0

      await ensureUserFields()

      const allDeals = await fetchAllDeals()
      const dealsToProcess = filterDeals(allDeals)

      if (dealsToProcess.length === 0) {
        logger.notice('No deals to recalculate. Done!')
        return
      }

      logger.notice(`Deals to process: ${dealsToProcess.length} / ${allDeals.length} total`)
      logger.notice('─'.repeat(50))

      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      const MAX_BATCH_SIZE = 50
      let batchCommands: Record<string, any> = {}
      let commandsCount = 0

      async function flushBatch(): Promise<void> {
        if (commandsCount === 0) return

        try {
          const response = await b24.actions.v2.batch.make({
            calls: batchCommands,
            options: { isHaltOnError: false, returnAjaxResult: false }
          })
          if (!response.isSuccess) {
            errors.push(...response.getErrorMessages())
          }
        } catch (e) {
          errors.push(`Batch execution error: ${e}`)
        }

        batchCommands = {}
        commandsCount = 0
      }

      for (let i = 0; i < dealsToProcess.length; i++) {
        const deal = dealsToProcess[i]
        const dealId = Number(deal.ID)
        const dealCurrency = (deal.CURRENCY_ID || '').toUpperCase()
        const dealAmount = Number(deal.OPPORTUNITY) || 0

        if (!dealCurrency || dealAmount === 0) {
          skippedCount++
          showProgress(i + 1, dealsToProcess.length)
          continue
        }

        let rateDate: Date | undefined
        if (params.rateDate === 'current') {
          rateDate = undefined
        } else if (params.rateDate === 'closedate' && deal.CLOSEDATE) {
          rateDate = new Date(deal.CLOSEDATE)
        } else if (params.rateDate === 'begindate' && deal.BEGINDATE) {
          rateDate = new Date(deal.BEGINDATE)
        }

        let convertedAmount: number
        try {
          if (dealCurrency === params.targetCurrency) {
            convertedAmount = dealAmount
          } else {
            convertedAmount = await rateProvider.convert(
              dealAmount,
              dealCurrency,
              params.targetCurrency,
              rateDate
            )
          }
        } catch (err) {
          errors.push(`Deal #${dealId} (${dealCurrency}): ${err}`)
          skippedCount++
          showProgress(i + 1, dealsToProcess.length)
          continue
        }

        convertedAmount = Math.round(convertedAmount * 100) / 100

        const cmdId = `upd_${dealId}`
        batchCommands[cmdId] = {
          method: 'crm.deal.update',
          params: {
            id: dealId,
            fields: {
              [amountField]: convertedAmount,
              [dateField]: todayStr
            }
          }
        }
        commandsCount++
        convertedCount++

        showProgress(i + 1, dealsToProcess.length)

        if (commandsCount >= MAX_BATCH_SIZE) {
          await flushBatch()
        }
      }

      await flushBatch()

      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)

      logger.notice('\n')
      logger.notice('─'.repeat(50))
      logger.notice('Completed!')
      logger.notice(`Deals processed: ${dealsToProcess.length}`)
      logger.notice(`Converted: ${convertedCount}`)
      logger.notice(`Skipped: ${skippedCount}`)
      logger.notice(`Total execution time: ${duration} seconds`)

      if (errors.length > 0) {
        logger.notice(`Errors encountered: ${errors.length}`)
        logger.warning('Errors', {
          total: errors.length,
          first10: errors.slice(0, 10)
        })
      } else {
        logger.notice('No errors encountered during recalculation!')
      }
    }
    // endregion Recalculate and update ////

    await recalculateDeals()
  }
})
