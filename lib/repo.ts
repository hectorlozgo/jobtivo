import { createMemoryDb, getDbOrMemory } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { type AppData, type DayEntry, type Settings, DEFAULT_DATA } from '@/lib/types'
import { sanitizeEntry, sanitizeSettings, isValidIsoDate } from '@/lib/validation'

type AppDb = ReturnType<typeof getDbOrMemory>

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

async function withFallbackDb<T>(fn: (db: AppDb) => Promise<T>): Promise<T> {
  try {
    return await fn(getDbOrMemory())
  } catch (error) {
    console.warn('[db] La base de datos no está disponible, usando almacenamiento en memoria:', error)
    return fn(createMemoryDb())
  }
}

export async function ensureUserSettings(userId: string): Promise<Settings> {
  return withFallbackDb(async (db) => {
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
  return withFallbackDb(async (db) => {
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
  return withFallbackDb(async (db) => {
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

  return withFallbackDb(async (db) => {
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

  return withFallbackDb(async (db) => {
    await db.entry.deleteMany({ where: { userId, date: date as string } })
    return true
  })
}

export async function upsertMany(userId: string, inputs: unknown): Promise<DayEntry[]> {
  if (!Array.isArray(inputs)) return []

  const saved: DayEntry[] = []
  for (const item of inputs) {
    const entry = await upsertEntry(userId, item)
    if (entry) saved.push(entry)
  }
  return saved
}
