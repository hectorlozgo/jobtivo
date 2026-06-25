// Lógica de cálculo de importes a partir de las horas y tarifas.

import { type DayEntry, type Settings, HOUR_TYPES } from "./types"

export interface EntryTotals {
  totalHours: number
  gross: number
}

// Importe bruto de un registro diario según la tarifa de su categoría.
export function entryTotals(entry: DayEntry, settings: Settings): EntryTotals {
  const rateSet = settings.rates[entry.category]
  let totalHours = 0
  let gross = 0
  for (const { id } of HOUR_TYPES) {
    const h = entry.hours[id] ?? 0
    totalHours += h
    gross += h * (rateSet[id] ?? 0)
  }
  return { totalHours: round2(totalHours), gross: round2(gross) }
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
    if (t.totalHours > 0) days += 1
    totalHours += t.totalHours
    gross += t.gross
    for (const { id } of HOUR_TYPES) {
      hoursByType[id] += entry.hours[id] ?? 0
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

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function formatEur(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}
