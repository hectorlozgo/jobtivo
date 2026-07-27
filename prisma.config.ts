import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: databaseUrl ?? 'postgresql://user:password@localhost:5432/hourlyjobtime?schema=public'
  }
})
