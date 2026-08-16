// Modelo genérico de control de horas: catálogos configurables por usuario.

export interface Category {
  id: string
  name: string
  short: string
}

export interface HourType {
  id: string
  label: string
}

/** Tarifas: actividad → tipo de hora → €/h */
export type Rates = Record<string, Record<string, number>>

export interface Settings {
  /** Porcentaje de retención 0–100. */
  taxPercent: number
  /** Etiqueta de la retención: "Retención", "IRPF", "Tax", etc. */
  taxLabel: string
  currency: string
  locale: string
  categories: Category[]
  hourTypes: HourType[]
  rates: Rates
  defaultCategory: string
  /** Minutos de descanso a restar cuando el día tiene breakApplied. */
  breakMinutes: number
  /** Si los días nuevos arrancan con el descanso marcado. */
  applyBreakByDefault: boolean
  /**
   * Cotización SS trabajador estimada (% sobre bruto).
   * Orientativa; no sustituye la nómina real.
   */
  socialSecurityPercent: number
  /** Si se resta la SS estimada al calcular el neto. */
  applySocialSecurity: boolean
}

export interface DayEntry {
  date: string // ISO yyyy-mm-dd
  category: string
  /** Horas brutas por id de HourType. */
  hours: Record<string, number>
  /** Si el usuario marca descanso ese día. */
  breakApplied: boolean
  /** Minutos de descanso de ese día (editable; por defecto settings.breakMinutes). */
  breakMinutes: number
}

export interface AppData {
  settings: Settings
  entries: Record<string, DayEntry>
}

export const MAX_HOURS_PER_TYPE = 12
export const MAX_TOTAL_HOURS_PER_DAY = 12
export const DEFAULT_BREAK_MINUTES = 20
export const MAX_BREAK_MINUTES = 180
export const MAX_CATEGORIES = 20
export const MAX_HOUR_TYPES = 12
export const MAX_CATALOG_NAME = 40
/** Tope de €/h al sanear tarifas (evita JSON/números enormes). */
export const MAX_RATE = 10_000
/** Máximo de días en un POST bulk (un año). */
export const MAX_BULK_ENTRIES = 366
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 72
export const MAX_NAME_LENGTH = 80
export const MAX_EMAIL_LENGTH = 254
/** Contingencias comunes trabajador (orientativo España). */
export const DEFAULT_SS_PERCENT = 6.35

/** Atajos de retención (%). El usuario puede poner cualquier valor 0–100. */
export const TAX_PRESETS = [
  { label: "0 %", value: 0 },
  { label: "2 %", value: 2 },
  { label: "8 %", value: 8 },
  { label: "15 %", value: 15 },
  { label: "19 %", value: 19 },
] as const

/** Ajustes iniciales de una cuenta nueva. El usuario los cambia en Tarifas. */
export const DEFAULT_SETTINGS: Settings = {
  taxPercent: 0,
  taxLabel: "Retención",
  currency: "EUR",
  locale: "es-ES",
  categories: [
    { id: "actividad-1", name: "Actividad 1", short: "A1" },
    { id: "actividad-2", name: "Actividad 2", short: "A2" },
  ],
  hourTypes: [
    { id: "normal", label: "Normal" },
    { id: "extra", label: "Extra" },
  ],
  defaultCategory: "actividad-1",
  breakMinutes: DEFAULT_BREAK_MINUTES,
  applyBreakByDefault: false,
  socialSecurityPercent: DEFAULT_SS_PERCENT,
  applySocialSecurity: false,
  rates: {
    "actividad-1": { normal: 10, extra: 15 },
    "actividad-2": { normal: 12, extra: 18 },
  },
}

export const DEFAULT_DATA: AppData = {
  settings: structuredClone(DEFAULT_SETTINGS),
  entries: {},
}

/** Horas a cero para todos los tipos configurados. */
export function emptyHours(hourTypes: HourType[]): Record<string, number> {
  const hours: Record<string, number> = {}
  for (const t of hourTypes) hours[t.id] = 0
  return hours
}

export function findCategory(settings: Settings, id: string): Category | undefined {
  return settings.categories.find((c) => c.id === id)
}

export function categoryLabel(settings: Settings, id: string): string {
  const c = findCategory(settings, id)
  if (!c) return id
  return c.short ? `${c.name} (${c.short})` : c.name
}

/** Id estable a partir de un nombre (para actividades / tipos nuevos). */
export function makeCatalogId(prefix: string, label: string): string {
  const slug = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24)
  const base = slug || prefix
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}
