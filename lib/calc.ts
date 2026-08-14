// Lógica de cálculo de importes a partir de las horas y tarifas.

import { type DayEntry, type Settings } from "./types"

export interface EntryTotals {
  /** Horas brutas introducidas por el usuario. */
  grossHours: number
  /** Horas cobrables tras restar el descanso. */
  totalHours: number
  /** Minutos de descanso efectivamente restados. */
  breakMinutesApplied: number
  hoursByType: Record<string, number>
  gross: number
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function hoursToHM(hours: number): { h: number; m: number } {
  const totalMinutes = Math.round(round2(hours) * 60)
  return {
    h: Math.floor(totalMinutes / 60),
    m: Math.abs(totalMinutes % 60),
  }
}

/** Formatea horas decimales como "7h 40m" o "8 h". */
export function formatDurationHours(hours: number): string {
  const { h, m } = hoursToHM(hours)
  if (m === 0) return `${h} h`
  return `${h}h ${m}m`
}

/** Formatea horas decimales como "7:40" o "8:00". */
export function formatHoursClock(hours: number): string {
  const { h, m } = hoursToHM(hours)
  return `${h}:${String(m).padStart(2, "0")}`
}

function sumHours(hours: Record<string, number>, typeIds: string[]): number {
  let total = 0
  for (const id of typeIds) total += hours[id] ?? 0
  return round2(total)
}

/**
 * Horas cobrables por tipo: resta el descanso del día (`entry.breakMinutes`)
 * empezando por el primer tipo de hora y siguiendo el orden del catálogo.
 */
function billableHours(
  entry: DayEntry,
  settings: Settings,
): { hours: Record<string, number>; breakMinutesApplied: number } {
  const typeIds = settings.hourTypes.map((t) => t.id)
  const hours: Record<string, number> = {}
  for (const id of typeIds) hours[id] = entry.hours[id] ?? 0

  const configured = Math.max(
    0,
    entry.breakMinutes ?? settings.breakMinutes ?? 0,
  )

  if (!entry.breakApplied || configured <= 0) {
    return { hours, breakMinutesApplied: 0 }
  }

  const gross = sumHours(hours, typeIds)
  if (gross <= 0) {
    return { hours, breakMinutesApplied: 0 }
  }

  const maxDeductHours = Math.min(configured / 60, gross)
  let remaining = round2(maxDeductHours)

  for (const id of typeIds) {
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
  const rateSet = settings.rates[entry.category] ?? {}
  const typeIds = settings.hourTypes.map((t) => t.id)
  const grossHours = sumHours(
    Object.fromEntries(typeIds.map((id) => [id, entry.hours[id] ?? 0])),
    typeIds,
  )
  const { hours, breakMinutesApplied } = billableHours(entry, settings)

  let totalHours = 0
  let gross = 0
  const hoursByType: Record<string, number> = {}

  for (const id of typeIds) {
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
  taxAmount: number
  net: number
  days: number
}

// Resumen agregado de un conjunto de registros, aplicando la retención.
export function summarize(entries: DayEntry[], settings: Settings): PeriodSummary {
  const hoursByType: Record<string, number> = {}
  for (const { id } of settings.hourTypes) hoursByType[id] = 0

  let totalHours = 0
  let gross = 0
  let days = 0

  for (const entry of entries) {
    const t = entryTotals(entry, settings)
    if (t.totalHours > 0 || t.grossHours > 0) days += 1
    totalHours += t.totalHours
    gross += t.gross
    for (const { id } of settings.hourTypes) {
      hoursByType[id] = round2((hoursByType[id] ?? 0) + (t.hoursByType[id] ?? 0))
    }
  }

  const taxAmount = round2(gross * (settings.taxPercent / 100))
  const net = round2(gross - taxAmount)

  return {
    totalHours: round2(totalHours),
    hoursByType,
    gross: round2(gross),
    taxAmount,
    net,
    days,
  }
}

export function formatMoney(
  n: number,
  currency = "EUR",
  locale = "es-ES",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(n)
  } catch {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(n)
  }
}
