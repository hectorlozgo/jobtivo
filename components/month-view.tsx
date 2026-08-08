"use client"

import { type DayEntry, type Settings } from "@/lib/types"
import { entryTotals, formatMoney } from "@/lib/calc"
import { hourColorVar } from "@/lib/hour-colors"
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
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40 px-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="px-2 py-2.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
          >
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
            ? settings.hourTypes.filter(
                (t) => (totals?.hoursByType[t.id] ?? entry.hours[t.id] ?? 0) > 0,
              )
            : []
          const hasHours = Boolean(totals && totals.totalHours > 0)

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-pressed={selected}
              aria-label={`Día ${day.getDate()}${totals && totals.totalHours > 0 ? `, ${totals.totalHours} horas` : ""}`}
              className={`group flex min-h-[4.75rem] flex-col gap-1 border-b border-r border-border/50 p-1.5 text-left transition-all duration-150 last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:min-h-24 sm:p-2 ${
                inMonth ? "hover:bg-accent/45" : "bg-muted/25 text-muted-foreground hover:bg-muted/40"
              } ${selected ? "bg-accent/55 ring-2 ring-inset ring-primary" : ""} ${
                hasHours && inMonth && !selected ? "bg-primary/[0.03]" : ""
              }`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs tabular-nums transition-colors sm:size-7 ${
                  today
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                    : "font-medium group-hover:bg-background/70"
                }`}
              >
                {day.getDate()}
              </span>
              {hasHours && (
                <span className="mt-auto flex flex-col gap-1">
                  <span className="flex flex-wrap gap-0.5">
                    {activeTypes.map((t) => (
                      <span
                        key={t.id}
                        aria-hidden="true"
                        className="size-1.5 rounded-full"
                        style={{
                          backgroundColor: `var(${hourColorVar(t.id, settings.hourTypes)})`,
                        }}
                      />
                    ))}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums leading-none">
                    {totals!.totalHours} h
                  </span>
                  <span className="hidden text-[11px] tabular-nums leading-none text-primary sm:block">
                    {money(totals!.gross)}
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
