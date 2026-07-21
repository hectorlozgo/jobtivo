import { getDb } from "@/lib/db"
import {
  type AppData,
  type DayEntry,
  type Settings,
  CATEGORIES,
  HOUR_TYPES,
} from "@/lib/types"
import {
  sanitizeEntry,
  sanitizeSettings,
  isValidIsoDate,
} from "@/lib/validation"

// Lee todos los ajustes (fila única id=1) desde la base de datos.
export function getSettings(): Settings {
  const db = getDb()
  const row = db.prepare("SELECT json FROM settings WHERE id = 1").get() as
    | { json: string }
    | undefined
  if (!row) return sanitizeSettings(undefined)
  try {
    return sanitizeSettings(JSON.parse(row.json))
  } catch {
    return sanitizeSettings(undefined)
  }
}

// Guarda los ajustes saneados como JSON en la fila única.
export function saveSettings(input: unknown): Settings {
  const db = getDb()
  const settings = sanitizeSettings(input)
  db.prepare(
    "INSERT INTO settings (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json",
  ).run(JSON.stringify(settings))
  return settings
}

// Lee todas las entradas de días como mapa iso -> DayEntry.
export function getEntries(): Record<string, DayEntry> {
  const db = getDb()
  const rows = db
    .prepare(
      "SELECT date, category, normal, extra, festiva, nocturna FROM entries",
    )
    .all() as Array<{
    date: string
    category: string
    normal: number
    extra: number
    festiva: number
    nocturna: number
  }>

  const entries: Record<string, DayEntry> = {}
  for (const r of rows) {
    const clean = sanitizeEntry({
      date: r.date,
      category: r.category,
      hours: {
        normal: r.normal,
        extra: r.extra,
        festiva: r.festiva,
        nocturna: r.nocturna,
      },
    })
    if (clean) entries[clean.date] = clean
  }
  return entries
}

// Devuelve el estado completo de la aplicación.
export function getAppData(): AppData {
  return { entries: getEntries(), settings: getSettings() }
}

// Inserta/actualiza una entrada saneada. Devuelve la entrada guardada o null si es inválida.
export function upsertEntry(input: unknown): DayEntry | null {
  const entry = sanitizeEntry(input)
  if (!entry) return null
  const db = getDb()
  db.prepare(
    `INSERT INTO entries (date, category, normal, extra, festiva, nocturna)
     VALUES (@date, @category, @normal, @extra, @festiva, @nocturna)
     ON CONFLICT(date) DO UPDATE SET
       category = excluded.category,
       normal = excluded.normal,
       extra = excluded.extra,
       festiva = excluded.festiva,
       nocturna = excluded.nocturna`,
  ).run({
    date: entry.date,
    category: entry.category,
    normal: entry.hours.normal,
    extra: entry.hours.extra,
    festiva: entry.hours.festiva,
    nocturna: entry.hours.nocturna,
  })
  return entry
}

// Elimina una entrada por fecha ISO validada.
export function deleteEntry(date: unknown): boolean {
  if (!isValidIsoDate(date)) return false
  const db = getDb()
  db.prepare("DELETE FROM entries WHERE date = ?").run(date)
  return true
}

// Sustituye masivamente varias entradas (usado por "aplicar a la semana").
export function upsertMany(inputs: unknown): DayEntry[] {
  if (!Array.isArray(inputs)) return []
  const db = getDb()
  const saved: DayEntry[] = []
  const tx = db.transaction((items: unknown[]) => {
    for (const item of items) {
      const entry = upsertEntry(item)
      if (entry) saved.push(entry)
    }
  })
  tx(inputs)
  return saved
}

// Reemplaza todo el estado (usado por importaciones). Valida y sanea todo.
export function replaceAll(input: unknown): AppData {
  const db = getDb()
  const obj = (input ?? {}) as Record<string, unknown>
  const settings = sanitizeSettings(obj.settings)
  const rawEntries = (obj.entries ?? {}) as Record<string, unknown>

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM entries").run()
    for (const value of Object.values(rawEntries)) {
      upsertEntry(value)
    }
    saveSettings(settings)
  })
  tx()
  return getAppData()
}

// Referencias usadas para asegurar imports estables en el bundle del servidor.
export const _meta = { categories: CATEGORIES.length, hourTypes: HOUR_TYPES.length }
