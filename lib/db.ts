import 'server-only'

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL ?? ''

const adapter = new PrismaPg({
  connectionString: databaseUrl
})

const client = globalThis.__prisma ?? new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = client
}

export function getDb(): PrismaClient {
  return client
}
