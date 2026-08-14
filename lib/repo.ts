import { createMemoryDb, getDbOrMemory, DatabaseUnavailableError, isDatabaseUnavailable } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { type AppData, type DayEntry, type Settings, DEFAULT_DATA, MAX_BULK_ENTRIES } from '@/lib/types'
import { sanitizeEntry, sanitizeSettings, isValidIsoDate } from '@/lib/validation'

type AppDb = ReturnType<typeof getDbOrMemory>

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

async function withDb<T>(fn: (db: AppDb) => Promise<T>): Promise<T> {
  try {
    return await fn(getDbOrMemory())
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) throw error
    if (process.env.NODE_ENV !== 'production' && isDatabaseUnavailable(error)) {
      console.warn('[db] La base de datos no está disponible, usando almacenamiento en memoria')
      return fn(createMemoryDb())
    }
    if (isDatabaseUnavailable(error)) {
      throw new DatabaseUnavailableError(error)
    }
    throw error
  }
}

export async function ensureUserSettings(userId: string): Promise<Settings> {
  return withDb(async (db) => {
    const row = await db.settings.findUnique({ where: { userId } })
    if (row) return sanitizeSettings(row.json)

    const settings = sanitizeSettings(DEFAULT_DATA.settings)
    await db.settings.upsert({
      where: { userId },
      create: { userId, json: asJson(settings) },
      update: { json: asJson(settings) }
    })
    return settings
  })
}

export async function getSettings(userId: string): Promise<Settings> {
  return ensureUserSettings(userId)
}

export async function saveSettings(userId: string, input: unknown): Promise<Settings> {
  return withDb(async (db) => {
    const settings = sanitizeSettings(input)
    await db.settings.upsert({
      where: { userId },
      create: { userId, json: asJson(settings) },
      update: { json: asJson(settings) }
    })
    return settings
  })
}

export async function getEntries(
  userId: string,
  settings?: Settings,
): Promise<Record<string, DayEntry>> {
  const resolved = settings ?? (await getSettings(userId))
  return withDb(async (db) => {
    const rows = await db.entry.findMany({
      where: { userId },
      select: {
        date: true,
        category: true,
        hours: true,
        breakApplied: true,
        breakMinutes: true,
      }
    })

    const entries: Record<string, DayEntry> = {}
    for (const row of rows) {
      const clean = sanitizeEntry(
        {
          date: row.date,
          category: row.category,
          hours: row.hours,
          breakApplied: row.breakApplied,
          breakMinutes: row.breakMinutes,
        },
        resolved,
      )
      if (clean) entries[clean.date] = clean
    }
    return entries
  })
}

export async function getAppData(userId: string): Promise<AppData> {
  const settings = await getSettings(userId)
  const entries = await getEntries(userId, settings)
  return { entries, settings }
}

export async function upsertEntry(userId: string, input: unknown): Promise<DayEntry | null> {
  const settings = await getSettings(userId)
  const entry = sanitizeEntry(input, settings)
  if (!entry) return null

  return withDb(async (db) => {
    await db.entry.upsert({
      where: { userId_date: { userId, date: entry.date } },
      create: {
        userId,
        date: entry.date,
        category: entry.category,
        hours: asJson(entry.hours),
        breakApplied: entry.breakApplied,
        breakMinutes: entry.breakMinutes,
      },
      update: {
        category: entry.category,
        hours: asJson(entry.hours),
        breakApplied: entry.breakApplied,
        breakMinutes: entry.breakMinutes,
      }
    })
    return entry
  })
}

export async function deleteEntry(userId: string, date: unknown): Promise<boolean> {
  if (!isValidIsoDate(date)) return false

  return withDb(async (db) => {
    await db.entry.deleteMany({ where: { userId, date: date as string } })
    return true
  })
}

export async function upsertMany(userId: string, inputs: unknown): Promise<DayEntry[]> {
  if (!Array.isArray(inputs)) return []

  const batch = inputs.slice(0, MAX_BULK_ENTRIES)
  const saved: DayEntry[] = []
  for (const item of batch) {
    const entry = await upsertEntry(userId, item)
    if (entry) saved.push(entry)
  }
  return saved
}
