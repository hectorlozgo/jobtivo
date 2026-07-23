import { getDb } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { type AppData, type DayEntry, type Settings } from '@/lib/types'
import { sanitizeEntry, sanitizeSettings, isValidIsoDate } from '@/lib/validation'

function toDayEntry(row: {
  date: string
  category: string
  normal: number
  extra: number
  festiva: number
  nocturna: number
}): DayEntry {
  return {
    date: row.date,
    category: row.category as DayEntry['category'],
    hours: {
      normal: row.normal,
      extra: row.extra,
      festiva: row.festiva,
      nocturna: row.nocturna
    }
  }
}

export async function getSettings(): Promise<Settings> {
  const db = getDb()
  const row = await db.settings.findUnique({ where: { id: 1 } })
  if (!row) return sanitizeSettings(undefined)
  return sanitizeSettings(row.json)
}

export async function saveSettings(input: unknown): Promise<Settings> {
  const db = getDb()
  const settings = sanitizeSettings(input)
  const jsonSettings = JSON.parse(JSON.stringify(settings)) as Prisma.InputJsonValue
  await db.settings.upsert({
    where: { id: 1 },
    create: { id: 1, json: jsonSettings },
    update: { json: jsonSettings }
  })
  return settings
}

export async function getEntries(): Promise<Record<string, DayEntry>> {
  const db = getDb()
  const rows = await db.entry.findMany({
    select: {
      date: true,
      category: true,
      normal: true,
      extra: true,
      festiva: true,
      nocturna: true
    }
  })

  const entries: Record<string, DayEntry> = {}
  for (const row of rows) {
    const clean = sanitizeEntry({
      date: row.date,
      category: row.category,
      hours: {
        normal: row.normal,
        extra: row.extra,
        festiva: row.festiva,
        nocturna: row.nocturna
      }
    })
    if (clean) entries[clean.date] = clean
  }
  return entries
}

export async function getAppData(): Promise<AppData> {
  return { entries: await getEntries(), settings: await getSettings() }
}

export async function upsertEntry(input: unknown): Promise<DayEntry | null> {
  const entry = sanitizeEntry(input)
  if (!entry) return null
  const db = getDb()
  await db.entry.upsert({
    where: { date: entry.date },
    create: {
      date: entry.date,
      category: entry.category,
      normal: entry.hours.normal,
      extra: entry.hours.extra,
      festiva: entry.hours.festiva,
      nocturna: entry.hours.nocturna
    },
    update: {
      category: entry.category,
      normal: entry.hours.normal,
      extra: entry.hours.extra,
      festiva: entry.hours.festiva,
      nocturna: entry.hours.nocturna
    }
  })
  return entry
}

export async function deleteEntry(date: unknown): Promise<boolean> {
  if (!isValidIsoDate(date)) return false
  const db = getDb()
  await db.entry.deleteMany({ where: { date } })
  return true
}

export async function upsertMany(inputs: unknown): Promise<DayEntry[]> {
  if (!Array.isArray(inputs)) return []
  const db = getDb()
  const saved: DayEntry[] = []

  await db.$transaction(async (tx) => {
    for (const item of inputs) {
      const entry = sanitizeEntry(item)
      if (!entry) continue
      saved.push(entry)
      await tx.entry.upsert({
        where: { date: entry.date },
        create: {
          date: entry.date,
          category: entry.category,
          normal: entry.hours.normal,
          extra: entry.hours.extra,
          festiva: entry.hours.festiva,
          nocturna: entry.hours.nocturna
        },
        update: {
          category: entry.category,
          normal: entry.hours.normal,
          extra: entry.hours.extra,
          festiva: entry.hours.festiva,
          nocturna: entry.hours.nocturna
        }
      })
    }
  })

  return saved
}

export async function replaceAll(input: unknown): Promise<AppData> {
  const db = getDb()
  const obj = (input ?? {}) as Record<string, unknown>
  const settings = sanitizeSettings(obj.settings)
  const rawEntries = (obj.entries ?? {}) as Record<string, unknown>

  const entries = Object.values(rawEntries)
    .map((value) => sanitizeEntry(value))
    .filter((entry): entry is DayEntry => entry !== null)

  await db.$transaction(async (tx) => {
    await tx.entry.deleteMany()
    if (entries.length > 0) {
      await tx.entry.createMany({
        data: entries.map((entry) => ({
          date: entry.date,
          category: entry.category,
          normal: entry.hours.normal,
          extra: entry.hours.extra,
          festiva: entry.hours.festiva,
          nocturna: entry.hours.nocturna
        }))
      })
    }
    await tx.settings.upsert({
      where: { id: 1 },
      create: { id: 1, json: JSON.parse(JSON.stringify(settings)) as Prisma.InputJsonValue },
      update: { json: JSON.parse(JSON.stringify(settings)) as Prisma.InputJsonValue }
    })
  })

  return getAppData()
}

// Referencias usadas para asegurar imports estables en el bundle del servidor.
export const _meta = { categories: 3, hourTypes: 4 }
