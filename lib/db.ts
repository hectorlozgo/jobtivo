import 'server-only'

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? ''
})

const client = globalThis.__prisma ?? new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = client
}

export function getDb(): PrismaClient {
  return client
}
