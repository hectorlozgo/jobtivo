// Modelo genérico de control de horas: catálogos configurables por usuario.
// El preset ETT (Mozo / Extra / Festiva…) es solo el valor por defecto.

export interface Category {
  id: string
  name: string
  short: string
}

export interface HourType {
  id: string
  label: string
}

/** Tarifas: categoría → tipo de hora → €/h */
export type Rates = Record<string, Record<string, number>>

export interface Settings {
  /** Porcentaje de retención 0–100 (antes IRPF fijo). */
  taxPercent: number
  /** Etiqueta de la retención: "IRPF", "Retención", "Tax", etc. */
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
/** Contingencias comunes trabajador (orientativo España). */
export const DEFAULT_SS_PERCENT = 6.35

/** Presets habituales de retención IRPF en contratos temporales / ETT. */
export const IRPF_PRESETS = [
  { label: "2 %", value: 2 },
  { label: "15 %", value: 15 },
  { label: "19 %", value: 19 },
] as const

/** Preset ETT logística (España): valor por defecto y plantilla de migración. */
export const ETT_LOGISTICS_PRESET: Settings = {
  taxPercent: 15,
  taxLabel: "IRPF",
  currency: "EUR",
  locale: "es-ES",
  categories: [
    { id: "G1", name: "Mozo", short: "G1" },
    { id: "G2", name: "Mozo Especializado", short: "G2" },
    { id: "G3", name: "Carretillero", short: "G3" },
  ],
  hourTypes: [
    { id: "normal", label: "Normal" },
    { id: "extra", label: "Extra" },
    { id: "festiva", label: "Festiva" },
    { id: "nocturna", label: "Nocturna" },
  ],
  defaultCategory: "G1",
  breakMinutes: DEFAULT_BREAK_MINUTES,
  applyBreakByDefault: false,
  socialSecurityPercent: DEFAULT_SS_PERCENT,
  applySocialSecurity: false,
  rates: {
    G1: { normal: 12, extra: 18, festiva: 22, nocturna: 16 },
    G2: { normal: 15, extra: 22, festiva: 27, nocturna: 19 },
    G3: { normal: 14, extra: 20, festiva: 25, nocturna: 18 },
  },
}

export const DEFAULT_DATA: AppData = {
  settings: structuredClone(ETT_LOGISTICS_PRESET),
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

/** Id estable a partir de un nombre (para puestos / tipos nuevos). */
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
