"use client"

import { type DayEntry, type Settings, HOUR_TYPES } from "@/lib/types"
import { entryTotals, formatEur } from "@/lib/calc"
import { HOUR_COLOR_VAR } from "@/lib/hour-colors"
import {
  isToday,
  monthGridDays,
  toISO,
  weekdayShort,
} from "@/lib/dates"

interface MonthViewProps {
  cursor: Date
  entries: Record<string, DayEntry>
  settings: Settings
  selectedISO: string
  onSelect: (iso: string) => void
}

export function MonthView({ cursor, entries, settings, selectedISO, onSelect }: MonthViewProps) {
  const days = monthGridDays(cursor)
  const currentMonth = cursor.getMonth()

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 border-b">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {weekdayShort(i)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const iso = toISO(day)
          const entry = entries[iso]
          const totals = entry ? entryTotals(entry, settings) : null
          const inMonth = day.getMonth() === currentMonth
          const selected = iso === selectedISO
          const today = isToday(day)
          const activeTypes = entry
            ? HOUR_TYPES.filter((t) => (entry.hours[t.id] ?? 0) > 0)
            : []

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-pressed={selected}
              aria-label={`Día ${day.getDate()}${totals && totals.totalHours > 0 ? `, ${totals.totalHours} horas` : ""}`}
              className={`flex min-h-20 flex-col gap-1 border-b border-r p-1.5 text-left transition-colors last:border-r-0 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:min-h-24 ${
                inMonth ? "" : "bg-muted/30 text-muted-foreground"
              } ${selected ? "ring-2 ring-inset ring-primary" : ""}`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${
                  today ? "bg-primary font-semibold text-primary-foreground" : "font-medium"
                }`}
              >
                {day.getDate()}
              </span>
              {totals && totals.totalHours > 0 && (
                <span className="mt-auto flex flex-col gap-1">
                  <span className="flex flex-wrap gap-0.5">
                    {activeTypes.map((t) => (
                      <span
                        key={t.id}
                        aria-hidden="true"
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: `var(${HOUR_COLOR_VAR[t.id]})` }}
                      />
                    ))}
                  </span>
                  <span className="text-[11px] font-medium tabular-nums leading-none">
                    {totals.totalHours} h
                  </span>
                  <span className="hidden text-[11px] tabular-nums leading-none text-primary sm:block">
                    {formatEur(totals.gross)}
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
