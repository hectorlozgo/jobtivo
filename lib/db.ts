import 'server-only'

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

import { DEFAULT_DATA, type DayEntry, type Settings } from '@/lib/types'
import { sanitizeSettings } from '@/lib/validation'

declare global {
  var __prisma: PrismaClient | undefined
  var __jobtimeMemoryState: { entries: Record<string, DayEntry>; settings: Settings } | undefined
}

type MemoryEntryRecord = {
  date: string
  category: DayEntry['category']
  normal: number
  extra: number
  festiva: number
  nocturna: number
}

type MemoryEntryInput = {
  date?: string | number | null
  category?: string | null
  normal?: number | string | null
  extra?: number | string | null
  festiva?: number | string | null
  nocturna?: number | string | null
}

type MemoryDb = {
  entry: {
    findMany: (args?: { select?: unknown }) => Promise<MemoryEntryRecord[]>
    upsert: (args: {
      where: { date: string }
      create: Record<string, unknown>
      update: Record<string, unknown>
    }) => Promise<MemoryEntryRecord>
    deleteMany: (args?: { where?: { date?: string } }) => Promise<{ count: number }>
    createMany: (args: { data: MemoryEntryInput[] }) => Promise<{ count: number }>
  }
  settings: {
    findUnique: (args: { where: { id: number } }) => Promise<{ id: number; json: Settings } | null>
    upsert: (args: {
      where: { id: number }
      create: { id: number; json: Settings }
      update: { json: Settings }
    }) => Promise<{ id: number; json: Settings }>
  }
  $transaction: <T>(fn: (tx: MemoryDb) => Promise<T>) => Promise<T>
}

function createMemoryDb(): MemoryDb {
  const state: { entries: Record<string, DayEntry>; settings: Settings } = (globalThis.__jobtimeMemoryState ??= {
    entries: {} as Record<string, DayEntry>,
    settings: sanitizeSettings(DEFAULT_DATA.settings)
  })

  const db: MemoryDb = {
    entry: {
      async findMany() {
        return Object.entries(state.entries).map(([date, entry]) => ({
          date,
          category: entry.category,
          normal: entry.hours.normal,
          extra: entry.hours.extra,
          festiva: entry.hours.festiva,
          nocturna: entry.hours.nocturna
        }))
      },
      async upsert(args: {
        where: { date: string }
        create: Record<string, unknown>
        update: Record<string, unknown>
      }) {
        const date: string = args.where.date
        const source: Record<string, unknown> = {
          ...(args.create ?? {}),
          ...(args.update ?? {})
        } as Record<string, unknown>

        const entry: DayEntry = {
          date,
          category: String(source.category ?? state.settings.defaultCategory) as DayEntry['category'],
          hours: {
            normal: Number(source.normal ?? 0),
            extra: Number(source.extra ?? 0),
            festiva: Number(source.festiva ?? 0),
            nocturna: Number(source.nocturna ?? 0)
          }
        }

        state.entries[date] = entry
        return {
          date,
          category: entry.category,
          normal: entry.hours.normal,
          extra: entry.hours.extra,
          festiva: entry.hours.festiva,
          nocturna: entry.hours.nocturna
        }
      },
      async deleteMany(args?: { where?: { date?: string } }) {
        const whereDate: string | undefined = args?.where?.date
        if (whereDate) {
          const existed = state.entries[whereDate] !== undefined
          delete state.entries[whereDate]
          return { count: existed ? 1 : 0 }
        }

        const count = Object.keys(state.entries).length
        Object.keys(state.entries).forEach((key) => delete state.entries[key])
        return { count }
      },
      async createMany(args: { data: Array<Record<string, unknown>> }) {
        for (const item of args.data) {
          const date: string = String(item.date ?? '')
          if (!date) continue
          state.entries[date] = {
            date,
            category: String(item.category ?? state.settings.defaultCategory) as DayEntry['category'],
            hours: {
              normal: Number(item.normal ?? 0),
              extra: Number(item.extra ?? 0),
              festiva: Number(item.festiva ?? 0),
              nocturna: Number(item.nocturna ?? 0)
            }
          }
        }
        return { count: args.data.length }
      }
    },
    settings: {
      async findUnique(args: { where: { id: number } }) {
        if (args.where.id !== 1) return null
        return { id: 1, json: state.settings }
      },
      async upsert(args: {
        where: { id: number }
        create: { id: number; json: Settings }
        update: { json: Settings }
      }) {
        state.settings = sanitizeSettings(args.update.json)
        return { id: 1, json: state.settings }
      }
    },
    $transaction: async (fn) => fn(db)
  }

  return db
}

export function getDb(): PrismaClient | MemoryDb {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL ?? ''

  if (!databaseUrl) {
    return createMemoryDb()
  }

  try {
    const adapter = new PrismaPg({ connectionString: databaseUrl })
    const client: PrismaClient = globalThis.__prisma ?? new PrismaClient({ adapter })
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__prisma = client
    }
    return client
  } catch {
    return createMemoryDb()
  }
}
