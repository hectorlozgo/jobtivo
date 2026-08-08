// Lógica de cálculo de importes a partir de las horas y tarifas.

import {
  type DayEntry,
  type HourType,
  type Settings,
  HOUR_TYPES,
} from "./types"

export interface EntryTotals {
  /** Horas brutas introducidas por el usuario. */
  grossHours: number
  /** Horas cobrables tras restar el descanso. */
  totalHours: number
  /** Minutos de descanso efectivamente restados. */
  breakMinutesApplied: number
  hoursByType: Record<HourType, number>
  gross: number
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Formatea horas decimales como "7h 40m" o "8 h". */
export function formatDurationHours(hours: number): string {
  const totalMinutes = Math.round(round2(hours) * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = Math.abs(totalMinutes % 60)
  if (m === 0) return `${h} h`
  return `${h}h ${m}m`
}

function sumHours(hours: Record<HourType, number>): number {
  let total = 0
  for (const { id } of HOUR_TYPES) total += hours[id] ?? 0
  return round2(total)
}

/**
 * Horas cobrables por tipo: resta el descanso de `settings.breakMinutes`
 * empezando por "normal" y siguiendo el orden de HOUR_TYPES.
 */
export function billableHours(
  entry: DayEntry,
  settings: Settings,
): { hours: Record<HourType, number>; breakMinutesApplied: number } {
  const hours = { ...entry.hours } as Record<HourType, number>
  const configured = Math.max(0, settings.breakMinutes ?? 0)

  if (!entry.breakApplied || configured <= 0) {
    return { hours, breakMinutesApplied: 0 }
  }

  const gross = sumHours(hours)
  if (gross <= 0) {
    return { hours, breakMinutesApplied: 0 }
  }

  const maxDeductHours = Math.min(configured / 60, gross)
  let remaining = round2(maxDeductHours)

  for (const { id } of HOUR_TYPES) {
    if (remaining <= 0) break
    const current = hours[id] ?? 0
    if (current <= 0) continue
    const take = Math.min(current, remaining)
    hours[id] = round2(current - take)
    remaining = round2(remaining - take)
  }

  const appliedHours = round2(maxDeductHours - remaining)
  return {
    hours,
    breakMinutesApplied: Math.round(appliedHours * 60),
  }
}

// Importe bruto de un registro diario según la tarifa de su categoría.
export function entryTotals(entry: DayEntry, settings: Settings): EntryTotals {
  const rateSet = settings.rates[entry.category]
  const grossHours = sumHours(entry.hours)
  const { hours, breakMinutesApplied } = billableHours(entry, settings)

  let totalHours = 0
  let gross = 0
  const hoursByType = {} as Record<HourType, number>

  for (const { id } of HOUR_TYPES) {
    const h = hours[id] ?? 0
    hoursByType[id] = h
    totalHours += h
    gross += h * (rateSet[id] ?? 0)
  }

  return {
    grossHours,
    totalHours: round2(totalHours),
    breakMinutesApplied,
    hoursByType,
    gross: round2(gross),
  }
}

export interface PeriodSummary {
  totalHours: number
  hoursByType: Record<string, number>
  gross: number
  irpfAmount: number
  net: number
  days: number
}

// Resumen agregado de un conjunto de registros, aplicando el IRPF.
export function summarize(entries: DayEntry[], settings: Settings): PeriodSummary {
  const hoursByType: Record<string, number> = {}
  for (const { id } of HOUR_TYPES) hoursByType[id] = 0

  let totalHours = 0
  let gross = 0
  let days = 0

  for (const entry of entries) {
    const t = entryTotals(entry, settings)
    if (t.totalHours > 0 || t.grossHours > 0) days += 1
    totalHours += t.totalHours
    gross += t.gross
    for (const { id } of HOUR_TYPES) {
      hoursByType[id] += t.hoursByType[id] ?? 0
    }
  }

  const irpfAmount = round2(gross * (settings.irpf / 100))
  const net = round2(gross - irpfAmount)

  return {
    totalHours: round2(totalHours),
    hoursByType,
    gross: round2(gross),
    irpfAmount,
    net,
    days,
  }
}

export function formatEur(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}
