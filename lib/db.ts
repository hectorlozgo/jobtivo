import 'server-only'

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

import { DEFAULT_DATA, type DayEntry, type Settings } from '@/lib/types'
import { sanitizeHours, sanitizeSettings } from '@/lib/validation'

declare global {
  var __prisma: PrismaClient | undefined
  var __jobtimeMemoryByUser:
    | Map<string, { entries: Record<string, DayEntry>; settings: Settings }>
    | undefined
}

type MemoryEntryRecord = {
  userId: string
  date: string
  category: string
  hours: Record<string, number>
  breakApplied: boolean
  breakMinutes: number
}

type MemoryDb = {
  user: {
    findUnique: (args: {
      where: { email?: string; id?: string }
    }) => Promise<{
      id: string
      email: string
      name: string | null
      passwordHash: string | null
      image: string | null
    } | null>
    create: (args: {
      data: {
        email: string
        name?: string | null
        passwordHash?: string | null
        settings?: { create: { json: unknown } }
      }
    }) => Promise<{
      id: string
      email: string
      name: string | null
      passwordHash: string | null
      image: string | null
    }>
  }
  entry: {
    findMany: (args?: {
      where?: { userId?: string }
      select?: unknown
    }) => Promise<MemoryEntryRecord[]>
    upsert: (args: {
      where: { userId_date: { userId: string; date: string } }
      create: Record<string, unknown>
      update: Record<string, unknown>
    }) => Promise<MemoryEntryRecord>
    deleteMany: (args?: {
      where?: { userId?: string; date?: string }
    }) => Promise<{ count: number }>
  }
  settings: {
    findUnique: (args: {
      where: { userId: string }
    }) => Promise<{ userId: string; json: Settings } | null>
    upsert: (args: {
      where: { userId: string }
      create: { userId: string; json: unknown }
      update: { json: unknown }
    }) => Promise<{ userId: string; json: Settings }>
  }
  $transaction: <T>(fn: (tx: MemoryDb) => Promise<T>) => Promise<T>
}

function getUserState(userId: string) {
  const map = (globalThis.__jobtimeMemoryByUser ??= new Map())
  let state = map.get(userId)
  if (!state) {
    state = {
      entries: {},
      settings: sanitizeSettings(DEFAULT_DATA.settings)
    }
    map.set(userId, state)
  }
  return state
}

const memoryUsers = new Map<
  string,
  { id: string; email: string; name: string | null; passwordHash: string | null; image: string | null }
>()

export function createMemoryDb(): MemoryDb {
  const db: MemoryDb = {
    user: {
      async findUnique(args) {
        if (args.where.id) {
          return memoryUsers.get(args.where.id) ?? null
        }
        if (args.where.email) {
          for (const user of memoryUsers.values()) {
            if (user.email === args.where.email) return user
          }
        }
        return null
      },
      async create(args) {
        for (const existing of memoryUsers.values()) {
          if (existing.email === args.data.email) {
            throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
          }
        }
        const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const user = {
          id,
          email: args.data.email,
          name: args.data.name ?? null,
          passwordHash: args.data.passwordHash ?? null,
          image: null
        }
        memoryUsers.set(id, user)
        if (args.data.settings?.create) {
          const state = getUserState(id)
          state.settings = sanitizeSettings(args.data.settings.create.json)
        }
        return user
      }
    },
    entry: {
      async findMany(args) {
        const userId = args?.where?.userId
        if (!userId) return []
        const state = getUserState(userId)
        return Object.entries(state.entries).map(([date, entry]) => {
          const e = entry as DayEntry
          return {
            userId,
            date,
            category: e.category,
            hours: { ...e.hours },
            breakApplied: Boolean(e.breakApplied),
            breakMinutes: e.breakMinutes ?? state.settings.breakMinutes,
          }
        })
      },
      async upsert(args) {
        const { userId, date } = args.where.userId_date
        const state = getUserState(userId)
        const source: Record<string, unknown> = {
          ...(args.create ?? {}),
          ...(args.update ?? {})
        }

        const entry: DayEntry = {
          date,
          category: String(source.category ?? state.settings.defaultCategory),
          hours: sanitizeHours(source.hours),
          breakApplied: Boolean(source.breakApplied),
          breakMinutes:
            typeof source.breakMinutes === 'number'
              ? source.breakMinutes
              : state.settings.breakMinutes,
        }

        state.entries[date] = entry
        return {
          userId,
          date,
          category: entry.category,
          hours: { ...entry.hours },
          breakApplied: entry.breakApplied,
          breakMinutes: entry.breakMinutes,
        }
      },
      async deleteMany(args) {
        const userId = args?.where?.userId
        if (!userId) return { count: 0 }
        const state = getUserState(userId)
        const whereDate = args?.where?.date
        if (whereDate) {
          const existed = state.entries[whereDate] !== undefined
          delete state.entries[whereDate]
          return { count: existed ? 1 : 0 }
        }
        const count = Object.keys(state.entries).length
        Object.keys(state.entries).forEach((key) => delete state.entries[key])
        return { count }
      }
    },
    settings: {
      async findUnique(args) {
        const state = getUserState(args.where.userId)
        return { userId: args.where.userId, json: state.settings }
      },
      async upsert(args) {
        const state = getUserState(args.where.userId)
        state.settings = sanitizeSettings(args.update.json ?? args.create.json)
        return { userId: args.where.userId, json: state.settings }
      }
    },
    $transaction: async (fn) => fn(db)
  }

  return db
}

export class DatabaseUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Base de datos no disponible")
    this.name = "DatabaseUnavailableError"
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

export function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof DatabaseUnavailableError) return true
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : ""
  if (["P1000", "P1001", "P1002", "P1008", "P1017", "P2024"].includes(code)) {
    return true
  }
  const msg = error instanceof Error ? error.message : String(error)
  return /DATABASE_URL no configurada|can't reach database|ECONNREFUSED|ECONNRESET|connection terminated|timeout exceeded|Connection.*refused/i.test(
    msg,
  )
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  )
}

export function getDb(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL ?? ''

  if (!databaseUrl) {
    throw new DatabaseUnavailableError()
  }

  if (globalThis.__prisma) {
    return globalThis.__prisma
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const client = new PrismaClient({ adapter })

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = client
  }

  return client
}

/** Cliente Prisma. En desarrollo, memoria si no hay DATABASE_URL. En producción nunca cae a memoria. */
export function getDbOrMemory(): PrismaClient | MemoryDb {
  if (process.env.NODE_ENV === 'production') {
    return getDb()
  }
  try {
    return getDb()
  } catch {
    console.warn('[db] Sin DATABASE_URL, usando almacenamiento en memoria por usuario')
    return createMemoryDb()
  }
}
