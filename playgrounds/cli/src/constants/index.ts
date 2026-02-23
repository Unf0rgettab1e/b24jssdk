import type { Language } from '../types'

export const LANGUAGES: readonly Language[] = ['english', 'russian', 'spanish', 'chinese'] as const

export const COUNTRY_CODES: Record<Language, string> = {
  english: '+1',
  russian: '+7',
  spanish: '+34',
  chinese: '+86'
} as const

export const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'company.com'] as const

export const PRIORITY_VALUES = ['low', 'average', 'high'] as const
export const STATUS_VALUES = ['pending', 'in_progress', 'supposedly_completed,', 'completed', 'deferred', 'declined'] as const

export const SOURCES = ['WEBFORM', 'CALL', 'OTHER', 'RC_GENERATOR'] as const
export const POSTS = ['Manager', 'Developer', 'Director', 'Analyst', 'Specialist'] as const
