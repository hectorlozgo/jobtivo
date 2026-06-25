// Utilidades de fecha en horario local (semana empieza en lunes).

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function fromISO(iso: string): Date {
  return new Date(iso + "T00:00:00")
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // 0 = lunes
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

export function addDays(d: Date, n: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

export function addMonths(d: Date, n: number): Date {
  const date = new Date(d)
  date.setMonth(date.getMonth() + n)
  return date
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISO(a) === toISO(b)
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date())
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const WEEKDAYS_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

export function monthName(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function weekdayShort(index: number): string {
  return WEEKDAYS[index]
}

export function formatLongDate(d: Date): string {
  const wd = WEEKDAYS_LONG[(d.getDay() + 6) % 7]
  return `${wd}, ${d.getDate()} de ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// Días que componen la cuadrícula mensual (incluye relleno de semanas).
export function monthGridDays(d: Date): Date[] {
  const first = startOfMonth(d)
  const gridStart = startOfWeek(first)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(addDays(gridStart, i))
  }
  return days
}

export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function formatRangeShort(start: Date, end: Date): string {
  const s = `${start.getDate()} ${MONTHS[start.getMonth()].slice(0, 3)}`
  const e = `${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`
  return `${s} – ${e}`
}
