// Validación y saneado puros (sin acceso a window ni a la base de datos).
// Buenas prácticas OWASP: nunca confiar en datos de entrada, ni del cliente
// ni de la base de datos. Todo se valida y normaliza antes de usarse.

import {
  type AppData,
  type CategoryId,
  type DayEntry,
  type HourType,
  type Settings,
  CATEGORIES,
  DEFAULT_DATA,
  HOUR_TYPES,
  MAX_BREAK_MINUTES,
  MAX_HOURS_PER_TYPE,
} from "./types"

const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
const HOUR_TYPE_IDS = HOUR_TYPES.map((h) => h.id)

// Convierte cualquier valor a un número de horas válido: 0..MAX, sin negativos,
// sin NaN/Infinity, redondeado a 2 decimales.
export function clampHours(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(n)) return 0
  const clamped = Math.min(Math.max(n, 0), MAX_HOURS_PER_TYPE)
  return Math.round(clamped * 100) / 100
}

// Porcentaje válido 0..100.
export function clampPercent(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(n)) return 0
  const clamped = Math.min(Math.max(n, 0), 100)
  return Math.round(clamped * 100) / 100
}

// Tarifa válida >= 0.
export function clampRate(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(n)) return 0
  const clamped = Math.max(n, 0)
  return Math.round(clamped * 100) / 100
}

/** Minutos de descanso: entero 0..MAX_BREAK_MINUTES. */
export function clampBreakMinutes(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(n)) return DEFAULT_DATA.settings.breakMinutes
  const clamped = Math.min(Math.max(Math.round(n), 0), MAX_BREAK_MINUTES)
  return clamped
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value
  if (value === "true" || value === 1 || value === "1") return true
  if (value === "false" || value === 0 || value === "0") return false
  return fallback
}

export function isValidCategory(v: unknown): v is CategoryId {
  return typeof v === "string" && (CATEGORY_IDS as string[]).includes(v)
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isValidIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false
  const d = new Date(v + "T00:00:00")
  return !Number.isNaN(d.getTime())
}

export function sanitizeHours(input: unknown): Record<HourType, number> {
  const obj = (input ?? {}) as Record<string, unknown>
  const result = {} as Record<HourType, number>
  for (const t of HOUR_TYPE_IDS) {
    result[t] = clampHours(obj[t])
  }
  return result
}

// Sanea un registro diario. Devuelve null si la fecha no es válida.
export function sanitizeEntry(input: unknown): DayEntry | null {
  const e = (input ?? {}) as Record<string, unknown>
  if (!isValidIsoDate(e.date)) return null
  return {
    date: e.date,
    category: isValidCategory(e.category) ? e.category : DEFAULT_DATA.settings.defaultCategory,
    hours: sanitizeHours(e.hours),
    breakApplied: asBoolean(e.breakApplied, false),
  }
}

export function sanitizeSettings(input: unknown): Settings {
  const obj = (input ?? {}) as Record<string, unknown>
  const ratesIn = (obj.rates ?? {}) as Record<string, unknown>
  const rates = {} as Settings["rates"]
  for (const cat of CATEGORY_IDS) {
    const rs = (ratesIn[cat] ?? {}) as Record<string, unknown>
    const set = {} as Record<HourType, number>
    for (const t of HOUR_TYPE_IDS) {
      const fallback = DEFAULT_DATA.settings.rates[cat][t]
      set[t] = rs[t] === undefined ? fallback : clampRate(rs[t])
    }
    rates[cat] = set
  }
  return {
    irpf: obj.irpf === undefined ? DEFAULT_DATA.settings.irpf : clampPercent(obj.irpf),
    defaultCategory: isValidCategory(obj.defaultCategory)
      ? obj.defaultCategory
      : DEFAULT_DATA.settings.defaultCategory,
    breakMinutes:
      obj.breakMinutes === undefined
        ? DEFAULT_DATA.settings.breakMinutes
        : clampBreakMinutes(obj.breakMinutes),
    applyBreakByDefault: asBoolean(
      obj.applyBreakByDefault,
      DEFAULT_DATA.settings.applyBreakByDefault,
    ),
    rates,
  }
}

export function sanitizeData(input: unknown): AppData {
  const obj = (input ?? {}) as Record<string, unknown>
  const settings = sanitizeSettings(obj.settings)
  const entriesIn = (obj.entries ?? {}) as Record<string, unknown>
  const entries: Record<string, DayEntry> = {}
  for (const [key, raw] of Object.entries(entriesIn)) {
    if (!isValidIsoDate(key)) continue
    const sane = sanitizeEntry({ ...(raw as object), date: key })
    if (sane) entries[key] = sane
  }
  return { settings, entries }
}
