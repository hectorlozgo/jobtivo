import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const databaseUrl = process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL ?? ''

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: databaseUrl
  }
})
