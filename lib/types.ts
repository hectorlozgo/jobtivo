// Modelo de datos de la aplicación de control de horas.

export type CategoryId = "G1" | "G2" | "G3"

export const CATEGORIES: { id: CategoryId; name: string; short: string }[] = [
  { id: "G1", name: "Mozo", short: "G1" },
  { id: "G2", name: "Mozo Especializado", short: "G2" },
  { id: "G3", name: "Carretillero", short: "G3" },
]

export type HourType = "normal" | "extra" | "festiva" | "nocturna"

export const HOUR_TYPES: { id: HourType; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "extra", label: "Extra" },
  { id: "festiva", label: "Festiva" },
  { id: "nocturna", label: "Nocturna" },
]

// Tarifa por hora (€) de cada tipo, para una categoría.
export type RateSet = Record<HourType, number>

export type Rates = Record<CategoryId, RateSet>

export interface Settings {
  irpf: number // porcentaje 0-100
  rates: Rates
  defaultCategory: CategoryId // categoría preseleccionada al registrar un día
  /** Minutos de descanso a restar cuando el día tiene breakApplied. */
  breakMinutes: number
  /** Si los días nuevos arrancan con el descanso marcado. */
  applyBreakByDefault: boolean
}

// Horas registradas en un día concreto, asociadas a una categoría.
// `hours` guarda el bruto introducido por el usuario; el neto se calcula
// restando el descanso si `breakApplied` está activo.
export interface DayEntry {
  date: string // ISO yyyy-mm-dd
  category: CategoryId
  hours: Record<HourType, number>
  breakApplied: boolean
}

export interface AppData {
  settings: Settings
  entries: Record<string, DayEntry> // clave = fecha ISO
}

export const MAX_HOURS_PER_TYPE = 12
export const MAX_TOTAL_HOURS_PER_DAY = 12

export const DEFAULT_BREAK_MINUTES = 20
export const MAX_BREAK_MINUTES = 180

export const DEFAULT_DATA: AppData = {
  settings: {
    irpf: 15,
    defaultCategory: "G1",
    breakMinutes: DEFAULT_BREAK_MINUTES,
    applyBreakByDefault: true,
    rates: {
      G1: { normal: 12, extra: 18, festiva: 22, nocturna: 16 },
      G2: { normal: 15, extra: 22, festiva: 27, nocturna: 19 },
      G3: { normal: 14, extra: 20, festiva: 25, nocturna: 18 },
    },
  },
  entries: {},
}
