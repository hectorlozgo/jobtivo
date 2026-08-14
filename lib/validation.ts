// Validación y saneado puros (sin acceso a window ni a la base de datos).
// Buenas prácticas OWASP: nunca confiar en datos de entrada, ni del cliente
// ni de la base de datos. Todo se valida y normaliza antes de usarse.

import {
  type AppData,
  type Category,
  type DayEntry,
  type HourType,
  type Rates,
  type Settings,
  DEFAULT_DATA,
  ETT_LOGISTICS_PRESET,
  MAX_BREAK_MINUTES,
  MAX_CATALOG_NAME,
  MAX_CATEGORIES,
  MAX_EMAIL_LENGTH,
  MAX_HOUR_TYPES,
  MAX_HOURS_PER_TYPE,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_RATE,
  MIN_PASSWORD_LENGTH,
} from "./types"

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

// Tarifa válida 0..MAX_RATE.
export function clampRate(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(n)) return 0
  const clamped = Math.min(Math.max(n, 0), MAX_RATE)
  return Math.round(clamped * 100) / 100
}

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const email = value.trim().toLowerCase()
  if (email.length < 3 || email.length > MAX_EMAIL_LENGTH) return null
  if (!EMAIL_RE.test(email)) return null
  return email
}

export function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const name = value.trim().slice(0, MAX_NAME_LENGTH)
  return name.length > 0 ? name : null
}

export function isValidPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_PASSWORD_LENGTH &&
    value.length <= MAX_PASSWORD_LENGTH
  )
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

function asTrimmedString(value: unknown, fallback: string, max = MAX_CATALOG_NAME): string {
  if (typeof value !== "string") return fallback
  const t = value.trim().slice(0, max)
  return t || fallback
}

const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$/

function asId(value: unknown, fallback: string): string {
  if (typeof value === "string" && ID_RE.test(value)) return value
  return fallback
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isValidIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false
  const d = new Date(v + "T00:00:00")
  return !Number.isNaN(d.getTime())
}

/** Conserva claves id → horas; si hay allowedIds, solo esas (sin huérfanas). */
export function sanitizeHours(
  input: unknown,
  allowedIds?: string[],
): Record<string, number> {
  const obj = (input ?? {}) as Record<string, unknown>
  if (allowedIds) {
    const result: Record<string, number> = {}
    for (const id of allowedIds) {
      result[id] = clampHours(obj[id])
    }
    return result
  }
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(obj)) {
    if (!ID_RE.test(key)) continue
    result[key] = clampHours(raw)
  }
  return result
}

export function sanitizeEntry(
  input: unknown,
  settings?: Settings,
): DayEntry | null {
  const e = (input ?? {}) as Record<string, unknown>
  if (!isValidIsoDate(e.date)) return null

  const fallbackCategory =
    settings?.defaultCategory ?? DEFAULT_DATA.settings.defaultCategory
  const categoryRaw =
    typeof e.category === "string" && ID_RE.test(e.category)
      ? e.category
      : fallbackCategory
  const category =
    settings && !settings.categories.some((c) => c.id === categoryRaw)
      ? fallbackCategory
      : categoryRaw

  const allowedIds = settings?.hourTypes.map((t) => t.id)
  const defaultBreak =
    settings?.breakMinutes ?? DEFAULT_DATA.settings.breakMinutes
  return {
    date: e.date,
    category,
    hours: sanitizeHours(e.hours, allowedIds),
    breakApplied: asBoolean(e.breakApplied, false),
    breakMinutes:
      e.breakMinutes === undefined
        ? defaultBreak
        : clampBreakMinutes(e.breakMinutes),
  }
}

function sanitizeCategories(input: unknown): Category[] {
  const fallback = ETT_LOGISTICS_PRESET.categories
  if (!Array.isArray(input) || input.length === 0) return structuredClone(fallback)

  const seen = new Set<string>()
  const out: Category[] = []
  for (const raw of input) {
    if (out.length >= MAX_CATEGORIES) break
    const row = (raw ?? {}) as Record<string, unknown>
    const id = asId(row.id, "")
    if (!id || seen.has(id)) continue
    seen.add(id)
    const name = asTrimmedString(row.name, id)
    const short = asTrimmedString(row.short ?? "", name.slice(0, 4), 12)
    out.push({ id, name, short })
  }
  return out.length > 0 ? out : structuredClone(fallback)
}

function sanitizeHourTypes(input: unknown): HourType[] {
  const fallback = ETT_LOGISTICS_PRESET.hourTypes
  if (!Array.isArray(input) || input.length === 0) return structuredClone(fallback)

  const seen = new Set<string>()
  const out: HourType[] = []
  for (const raw of input) {
    if (out.length >= MAX_HOUR_TYPES) break
    const row = (raw ?? {}) as Record<string, unknown>
    const id = asId(row.id, "")
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({ id, label: asTrimmedString(row.label, id) })
  }
  return out.length > 0 ? out : structuredClone(fallback)
}

function sanitizeRates(
  input: unknown,
  categories: Category[],
  hourTypes: HourType[],
  fallbackRates: Rates,
): Rates {
  const ratesIn = (input ?? {}) as Record<string, unknown>
  const rates: Rates = {}
  for (const cat of categories) {
    const rs = (ratesIn[cat.id] ?? {}) as Record<string, unknown>
    const set: Record<string, number> = {}
    for (const t of hourTypes) {
      const fallback = fallbackRates[cat.id]?.[t.id] ?? 0
      set[t.id] = rs[t.id] === undefined ? fallback : clampRate(rs[t.id])
    }
    rates[cat.id] = set
  }
  return rates
}

/**
 * Normaliza settings. Acepta el formato antiguo (sin categories/hourTypes, con `irpf`)
 * y lo eleva al modelo genérico.
 */
export function sanitizeSettings(input: unknown): Settings {
  const obj = (input ?? {}) as Record<string, unknown>
  const defaults = DEFAULT_DATA.settings

  // Formato antiguo: sin catálogos → asumir preset ETT (ids G1/G2/G3 + 4 tipos).
  const hasCatalogs = Array.isArray(obj.categories) || Array.isArray(obj.hourTypes)
  const categories = hasCatalogs
    ? sanitizeCategories(obj.categories)
    : structuredClone(ETT_LOGISTICS_PRESET.categories)
  const hourTypes = hasCatalogs
    ? sanitizeHourTypes(obj.hourTypes)
    : structuredClone(ETT_LOGISTICS_PRESET.hourTypes)

  const taxPercent =
    obj.taxPercent !== undefined
      ? clampPercent(obj.taxPercent)
      : obj.irpf !== undefined
        ? clampPercent(obj.irpf)
        : defaults.taxPercent

  const defaultCategory =
    typeof obj.defaultCategory === "string" &&
    categories.some((c) => c.id === obj.defaultCategory)
      ? obj.defaultCategory
      : (categories[0]?.id ?? defaults.defaultCategory)

  return {
    taxPercent,
    taxLabel: asTrimmedString(obj.taxLabel, defaults.taxLabel, 24),
    currency: asTrimmedString(obj.currency, defaults.currency, 8).toUpperCase(),
    locale: asTrimmedString(obj.locale, defaults.locale, 16),
    categories,
    hourTypes,
    rates: sanitizeRates(obj.rates, categories, hourTypes, defaults.rates),
    defaultCategory,
    breakMinutes:
      obj.breakMinutes === undefined
        ? defaults.breakMinutes
        : clampBreakMinutes(obj.breakMinutes),
    applyBreakByDefault: asBoolean(
      obj.applyBreakByDefault,
      defaults.applyBreakByDefault,
    ),
    socialSecurityPercent:
      obj.socialSecurityPercent === undefined
        ? defaults.socialSecurityPercent
        : clampPercent(obj.socialSecurityPercent),
    applySocialSecurity: asBoolean(
      obj.applySocialSecurity,
      defaults.applySocialSecurity,
    ),
  }
}

export function sanitizeData(input: unknown): AppData {
  const obj = (input ?? {}) as Record<string, unknown>
  const settings = sanitizeSettings(obj.settings)
  const entriesIn = (obj.entries ?? {}) as Record<string, unknown>
  const entries: Record<string, DayEntry> = {}
  for (const [key, raw] of Object.entries(entriesIn)) {
    if (!isValidIsoDate(key)) continue
    const sane = sanitizeEntry({ ...(raw as object), date: key }, settings)
    if (sane) entries[key] = sane
  }
  return { settings, entries }
}
