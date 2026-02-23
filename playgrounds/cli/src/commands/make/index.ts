import { defineCommand } from 'citty'
import contacts from './contacts'
import companies from './companies'
import tasks from './tasks'

export default defineCommand({
  meta: {
    name: 'make',
    description: 'Commands to create new Bitrix24 entities.'
  },
  subCommands: {
    contacts,
    companies,
    tasks
  }
})
