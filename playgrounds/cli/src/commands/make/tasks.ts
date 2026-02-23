import {
  B24Hook,
  Logger,
  LogLevel,
  ConsoleV2Handler,
  ParamsFactory,
  SdkError,
  Result,
  Text
} from '@bitrix24/b24jssdk'
import type { GetPayload } from '@bitrix24/b24jssdk'
import { defineCommand } from 'citty'
import dotenv from 'dotenv'

import type { Language, TaskTemplatesByLanguage, TaskFields, TaskAddResult } from '../../types'
import { LANGUAGES, PRIORITY_VALUES, STATUS_VALUES } from '../../constants'
import { pickRandom, randomInt, showProgress } from '../../utils'
/**
 * Command for generating random tasks in Bitrix24
 *
 * Usage:
 * pnpm --filter @bitrix24/b24jssdk-cli dev make tasks --total=10
 * pnpm --filter @bitrix24/b24jssdk-cli dev make tasks --total=50 --creatorId=1 --responsibleId=2
 */

dotenv.config({ path: '../../.env' })

const CHECKLIST_PROBABILITY = 0.4
const CHECKLIST_MIN_ITEMS = 2
const CHECKLIST_MAX_ITEMS = 6

const taskTemplates: Record<Language, TaskTemplatesByLanguage> = {
  english: {
    verbs: [
      'Prepare', 'Review', 'Update', 'Fix', 'Create', 'Analyze', 'Test', 'Deploy',
      'Optimize', 'Document', 'Design', 'Implement', 'Research', 'Verify', 'Configure',
      'Refactor', 'Migrate', 'Integrate', 'Monitor', 'Audit'
    ],
    objects: [
      'quarterly report', 'marketing strategy', 'project documentation', 'database schema',
      'API endpoints', 'user interface', 'deployment pipeline', 'security audit',
      'performance metrics', 'client presentation', 'budget forecast', 'test coverage',
      'backup system', 'notification service', 'search functionality', 'authentication module',
      'payment integration', 'analytics dashboard', 'email templates', 'landing page',
      'mobile layout', 'data export', 'access permissions', 'onboarding flow', 'release notes'
    ],
    numberPrefixes: ['#', 'Task ']
  },
  russian: {
    verbs: [
      'Подготовить', 'Проверить', 'Обновить', 'Исправить', 'Создать', 'Проанализировать',
      'Протестировать', 'Развернуть', 'Оптимизировать', 'Задокументировать', 'Спроектировать',
      'Реализовать', 'Исследовать', 'Согласовать', 'Настроить', 'Отладить', 'Перенести',
      'Интегрировать', 'Доработать', 'Провести аудит'
    ],
    objects: [
      'квартальный отчёт', 'маркетинговую стратегию', 'документацию проекта', 'схему базы данных',
      'API-эндпоинты', 'пользовательский интерфейс', 'пайплайн деплоя', 'аудит безопасности',
      'метрики производительности', 'презентацию для клиента', 'прогноз бюджета', 'покрытие тестами',
      'систему резервного копирования', 'сервис уведомлений', 'функционал поиска', 'модуль авторизации',
      'интеграцию с платёжной системой', 'дашборд аналитики', 'шаблоны писем', 'посадочную страницу',
      'мобильную вёрстку', 'экспорт данных', 'права доступа', 'флоу онбординга', 'заметки к релизу'
    ],
    numberPrefixes: ['№', 'Задача ']
  },
  spanish: {
    verbs: [
      'Preparar', 'Revisar', 'Actualizar', 'Corregir', 'Crear', 'Analizar',
      'Probar', 'Desplegar', 'Optimizar', 'Documentar', 'Diseñar', 'Implementar',
      'Investigar', 'Verificar', 'Configurar', 'Refactorizar', 'Migrar',
      'Integrar', 'Monitorear', 'Auditar'
    ],
    objects: [
      'informe trimestral', 'estrategia de marketing', 'documentación del proyecto',
      'esquema de base de datos', 'endpoints de API', 'interfaz de usuario',
      'pipeline de despliegue', 'auditoría de seguridad', 'métricas de rendimiento',
      'presentación al cliente', 'pronóstico presupuestario', 'cobertura de pruebas',
      'sistema de respaldo', 'servicio de notificaciones', 'funcionalidad de búsqueda',
      'módulo de autenticación', 'integración de pagos', 'panel de analítica',
      'plantillas de correo', 'página de destino', 'diseño móvil', 'exportación de datos',
      'permisos de acceso', 'flujo de incorporación', 'notas de versión'
    ],
    numberPrefixes: ['#', 'Tarea ']
  },
  chinese: {
    verbs: [
      '准备', '审查', '更新', '修复', '创建', '分析',
      '测试', '部署', '优化', '编写', '设计', '实现',
      '研究', '验证', '配置', '重构', '迁移',
      '集成', '监控', '审计'
    ],
    objects: [
      '季度报告', '营销策略', '项目文档', '数据库架构',
      'API接口', '用户界面', '部署流水线', '安全审计报告',
      '性能指标', '客户演示文稿', '预算预测', '测试覆盖率',
      '备份系统', '通知服务', '搜索功能', '认证模块',
      '支付集成', '分析仪表板', '邮件模板', '着陆页',
      '移动端布局', '数据导出功能', '访问权限', '用户引导流程', '版本说明'
    ],
    numberPrefixes: ['#', '任务']
  }
} as const

const taskTags: Record<Language, readonly string[]> = {
  english: ['Production', 'Sales'],
  russian: ['Производство', 'Продажи'],
  spanish: ['Producción', 'Ventas'],
  chinese: ['生产', '销售']
} as const

const checklistLabels: Record<Language, (i: number) => string> = {
  english: i => `Check ${i}`,
  russian: i => `Чек ${i}`,
  spanish: i => `Verificación ${i}`,
  chinese: i => `检查 ${i}`
}

export default defineCommand({
  meta: {
    name: 'tasks',
    description: 'Generate random tasks in Bitrix24'
  },
  args: {
    total: {
      description: 'Number of tasks to create',
      required: true
    },
    creatorId: {
      description: 'Creator user ID',
      default: '1'
    },
    responsibleId: {
      description: 'Responsible user ID',
      default: '1'
    }
  },
  async setup({ args }) {
    const params = {
      total: Number(args.total),
      creatorId: Number(args.creatorId),
      responsibleId: Number(args.responsibleId)
    }

    let createdCount = 0
    const errors: string[] = []

    const logger = Logger.create('loadTesting')
    const handler = new ConsoleV2Handler(LogLevel.DEBUG, { useStyles: false })
    logger.pushHandler(handler)

    const hookPath = process.env.B24_HOOK ?? ''
    if (!hookPath) {
      logger.emergency('🚨 B24_HOOK environment variable is not set! Please configure it in your .env file')
      process.exit(1)
    }

    const b24 = B24Hook.fromWebhookUrl(hookPath, { restrictionParams: ParamsFactory.getBatchProcessing() })
    logger.info('Connected to Bitrix24', { target: b24.getTargetOrigin() })

    const loggerForDebugB24 = Logger.create('b24')
    const handlerForDebugB24 = new ConsoleV2Handler(LogLevel.ERROR, { useStyles: false })
    loggerForDebugB24.pushHandler(handlerForDebugB24)

    b24.setLogger(loggerForDebugB24)

    function generateDeadline(): string {
      const offsetMs = randomInt(1, 36) * 60 * 60 * 1000
      return Text.toB24Format(new Date(Date.now() + offsetMs))
    }

    function generateTaskTitle(language: Language, taskNumber: number): string {
      const tpl = taskTemplates[language]
      const verb = pickRandom(tpl.verbs)
      const object = pickRandom(tpl.objects)

      let title = `${verb} ${object}`

      if (Math.random() < 0.4) {
        const prefix = pickRandom(tpl.numberPrefixes)
        title += ` ${prefix}${taskNumber}`
      }

      return title
    }

    function collectErrors(result: Result): void {
      const errs = result.getErrorMessages()
      for (const err of errs) {
        errors.push(err)
      }
    }

    /**
     * @memo: we use v2 API for checklist
     * @todo fix this
     */
    async function addChecklistItems(taskId: number, language: Language): Promise<void> {
      const count = randomInt(CHECKLIST_MIN_ITEMS, CHECKLIST_MAX_ITEMS)
      const labelFn = checklistLabels[language]

      for (let i = 1; i <= count; i++) {
        const response = await b24.actions.v2.call.make({
          method: 'task.checklistitem.add',
          params: {
            TASKID: taskId,
            FIELDS: { TITLE: labelFn(i) }
          }
        })

        if (!response.isSuccess) {
          errors.push(`Error adding checklist item to task ${taskId}: ${response.getErrorMessages().join('; ')}`)
        }
      }
    }

    async function createTask(taskNumber: number): Promise<Result> {
      const result = new Result()

      try {
        const language = pickRandom(LANGUAGES)
        const title = generateTaskTitle(language, taskNumber)
        const tag = pickRandom(taskTags[language])

        const taskFields: TaskFields = {
          title,
          description: `#${tag}`,
          creatorId: params.creatorId,
          responsibleId: params.responsibleId,
          deadline: generateDeadline(),
          priority: pickRandom(PRIORITY_VALUES),
          status: STATUS_VALUES[0]
        }

        const response = await b24.actions.v3.call.make<TaskAddResult>({
          method: 'tasks.task.add',
          params: {
            fields: taskFields
          }
        })

        if (!response.isSuccess) {
          return result.addError(new SdkError({
            code: 'PLAYGROUND_CLI_ERROR',
            description: response.getErrorMessages().join(';'),
            status: 404
          }))
        }

        const resultData = response.getData() as GetPayload<TaskAddResult> | undefined
        const taskId = resultData?.result?.item?.id ?? 0

        if (!taskId) {
          return result.addError(new SdkError({
            code: 'PLAYGROUND_CLI_ERROR',
            description: 'No task ID returned from API',
            status: 404
          }))
        }

        if (Math.random() < CHECKLIST_PROBABILITY) {
          await addChecklistItems(taskId, language)
        }

        createdCount++
        return result.setData({ taskId })
      } catch (error: unknown) {
        return result.addError(SdkError.fromException(
          `Error creating task ${taskNumber}: ${error instanceof Error ? error.message : String(error)}`,
          { code: 'PLAYGROUND_CLI_ERROR', status: 404 }
        ))
      }
    }

    async function createRandomTasks(): Promise<void> {
      logger.notice('🚀 Starting creation of random tasks in Bitrix24')
      logger.notice(`📊 Planned to create: ${params.total} tasks`)
      logger.notice(`👤 Creator: user ID ${params.creatorId}`)
      logger.notice(`👤 Responsible: user ID ${params.responsibleId}`)
      logger.notice('─'.repeat(50))

      const healthCheckData = await b24.tools.healthCheck.make({ requestId: 'healthCheck' })
      logger.notice(`Health check: ${healthCheckData ? 'success' : 'fail'}`)
      if (!healthCheckData) {
        return
      }
      logger.notice('\n')

      const startTime = Date.now()

      for (let i = 0; i < params.total; i++) {
        const taskResult = await createTask(i + 1)
        collectErrors(taskResult)
        showProgress(createdCount, params.total)
      }

      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)

      logger.notice('\n')
      logger.notice('─'.repeat(50))
      logger.notice('✅ Completed!')
      logger.notice(`📈 Successfully created: ${createdCount} tasks`)
      logger.notice(`⏱️ Total execution time: ${duration} seconds`)
      logger.notice(`📊 Average time per task: ${(Number(duration) / params.total).toFixed(2)} seconds`)

      if (errors.length > 0) {
        logger.notice(`❌ Errors encountered: ${errors.length}`)
        logger.notice('❌ Errors', {
          encountered: errors.length,
          first10: errors.slice(0, 10).map((error, index) => `${index + 1}. ${error}`)
        })
      } else {
        logger.notice('🎉 No errors encountered during creation process!')
      }
    }

    await createRandomTasks()
  }
})
