"use client"

import { type DayEntry, type Settings, CATEGORIES, HOUR_TYPES } from "@/lib/types"
import { entryTotals, formatEur } from "@/lib/calc"
import { HOUR_COLOR_VAR } from "@/lib/hour-colors"
import { isToday, toISO, weekDays } from "@/lib/dates"

interface WeekViewProps {
  cursor: Date
  entries: Record<string, DayEntry>
  settings: Settings
  selectedISO: string
  onSelect: (iso: string) => void
}

const WEEKDAY_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

export function WeekView({ cursor, entries, settings, selectedISO, onSelect }: WeekViewProps) {
  const days = weekDays(cursor)

  return (
    <div className="flex flex-col divide-y">
      {days.map((day, i) => {
        const iso = toISO(day)
        const entry = entries[iso]
        const totals = entry ? entryTotals(entry, settings) : null
        const selected = iso === selectedISO
        const today = isToday(day)
        const category = entry ? CATEGORIES.find((c) => c.id === entry.category) : null

        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            aria-pressed={selected}
            className={`flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
              selected ? "bg-accent/60" : ""
            }`}
          >
            <div className="flex w-12 shrink-0 flex-col items-center">
              <span className="text-xs text-muted-foreground">{WEEKDAY_LONG[i].slice(0, 3)}</span>
              <span
                className={`flex size-8 items-center justify-center rounded-full text-sm tabular-nums ${
                  today ? "bg-primary font-semibold text-primary-foreground" : "font-medium"
                }`}
              >
                {day.getDate()}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {totals && totals.totalHours > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">{totals.totalHours} h</span>
                    {category && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        {category.short}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {HOUR_TYPES.filter((t) => (totals.hoursByType[t.id] ?? 0) > 0).map((t) => (
                      <span key={t.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: `var(${HOUR_COLOR_VAR[t.id]})` }}
                        />
                        {t.label} {totals.hoursByType[t.id]}h
                      </span>
                    ))}
                    {entry!.breakApplied && totals.breakMinutesApplied > 0 && (
                      <span className="text-xs text-muted-foreground">
                        −{totals.breakMinutesApplied} min descanso
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Sin horas</span>
              )}
            </div>

            {totals && totals.gross > 0 && (
              <span className="shrink-0 text-sm font-medium tabular-nums text-primary">
                {formatEur(totals.gross)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
