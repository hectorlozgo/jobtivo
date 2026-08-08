"use client"

import { type DayEntry, type Settings, findCategory } from "@/lib/types"
import { entryTotals, formatMoney } from "@/lib/calc"
import { hourColorVar } from "@/lib/hour-colors"
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
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)

  return (
    <div className="flex flex-col divide-y divide-border/60">
      {days.map((day, i) => {
        const iso = toISO(day)
        const entry = entries[iso]
        const totals = entry ? entryTotals(entry, settings) : null
        const selected = iso === selectedISO
        const today = isToday(day)
        const category = entry ? findCategory(settings, entry.category) : null
        const hasHours = Boolean(totals && totals.totalHours > 0)

        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            aria-pressed={selected}
            className={`flex items-center gap-3 px-3 py-3.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4 ${
              selected
                ? "bg-accent/70"
                : hasHours
                  ? "hover:bg-accent/40"
                  : "hover:bg-muted/40"
            }`}
          >
            <div className="flex w-12 shrink-0 flex-col items-center gap-0.5">
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {WEEKDAY_LONG[i].slice(0, 3)}
              </span>
              <span
                className={`flex size-9 items-center justify-center rounded-full text-sm tabular-nums ${
                  today
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                    : "font-medium"
                }`}
              >
                {day.getDate()}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {hasHours ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">{totals!.totalHours} h</span>
                    {category && (
                      <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                        {category.short}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {settings.hourTypes
                      .filter((t) => (totals!.hoursByType[t.id] ?? 0) > 0)
                      .map((t) => (
                        <span
                          key={t.id}
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full"
                            style={{
                              backgroundColor: `var(${hourColorVar(t.id, settings.hourTypes)})`,
                            }}
                          />
                          {t.label} {totals!.hoursByType[t.id]}h
                        </span>
                      ))}
                    {entry!.breakApplied && totals!.breakMinutesApplied > 0 && (
                      <span className="text-xs text-muted-foreground">
                        −{totals!.breakMinutesApplied} min descanso
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Sin horas</span>
              )}
            </div>

            {totals && totals.gross > 0 && (
              <span className="shrink-0 font-heading text-sm font-semibold tabular-nums text-primary">
                {money(totals.gross)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
