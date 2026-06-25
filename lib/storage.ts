// Persistencia en JSON (localStorage) con validación y saneado de entrada.
// Buenas prácticas OWASP aplicables a cliente: nunca confiar en los datos
// almacenados; se validan y normalizan al leer y al escribir.

import {
  type AppData,
  type CategoryId,
  type DayEntry,
  type HourType,
  type Settings,
  CATEGORIES,
  DEFAULT_DATA,
  HOUR_TYPES,
  MAX_HOURS_PER_TYPE,
} from "./types"

const STORAGE_KEY = "horas-trabajo:data:v1"

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

function isValidCategory(v: unknown): v is CategoryId {
  return typeof v === "string" && (CATEGORY_IDS as string[]).includes(v)
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isValidIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false
  const d = new Date(v + "T00:00:00")
  return !Number.isNaN(d.getTime())
}

function sanitizeHours(input: unknown): Record<HourType, number> {
  const obj = (input ?? {}) as Record<string, unknown>
  const result = {} as Record<HourType, number>
  for (const t of HOUR_TYPE_IDS) {
    result[t] = clampHours(obj[t])
  }
  return result
}

function sanitizeSettings(input: unknown): Settings {
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
    rates,
  }
}

function sanitizeData(input: unknown): AppData {
  const obj = (input ?? {}) as Record<string, unknown>
  const settings = sanitizeSettings(obj.settings)
  const entriesIn = (obj.entries ?? {}) as Record<string, unknown>
  const entries: Record<string, DayEntry> = {}
  for (const [key, raw] of Object.entries(entriesIn)) {
    if (!isValidIsoDate(key)) continue
    const e = (raw ?? {}) as Record<string, unknown>
    const category = isValidCategory(e.category) ? e.category : "G1"
    entries[key] = {
      date: key,
      category,
      hours: sanitizeHours(e.hours),
    }
  }
  return { settings, entries }
}

export function loadData(): AppData {
  if (typeof window === "undefined") return structuredClone(DEFAULT_DATA)
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_DATA)
    const parsed = JSON.parse(raw)
    return sanitizeData(parsed)
  } catch {
    return structuredClone(DEFAULT_DATA)
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return
  try {
    const safe = sanitizeData(data)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  } catch {
    // Si el almacenamiento falla (cuota, modo privado), se ignora en silencio.
  }
}

export function exportJson(data: AppData): string {
  return JSON.stringify(sanitizeData(data), null, 2)
}

export function importJson(text: string): AppData {
  const parsed = JSON.parse(text)
  return sanitizeData(parsed)
}
