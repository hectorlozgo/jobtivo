"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HoursInput } from "@/components/hours-input"
import { entryTotals, formatEur } from "@/lib/calc"
import { HOUR_COLOR_VAR } from "@/lib/hour-colors"
import {
  type CategoryId,
  type DayEntry,
  type HourType,
  type Settings,
  CATEGORIES,
  HOUR_TYPES,
  MAX_TOTAL_HOURS_PER_DAY,
} from "@/lib/types"
import { formatLongDate } from "@/lib/dates"
import { Trash2 } from "lucide-react"

interface DayEditorProps {
  dateISO: string
  entry: DayEntry
  settings: Settings
  onChange: (entry: DayEntry) => void
  onClear: () => void
}

export function DayEditor({ dateISO, entry, settings, onChange, onClear }: DayEditorProps) {
  const totals = useMemo(() => entryTotals(entry, settings), [entry, settings])
  const overLimit = totals.totalHours > MAX_TOTAL_HOURS_PER_DAY

  function setCategory(category: CategoryId) {
    onChange({ ...entry, category })
  }

  function setHours(type: HourType, value: number) {
    onChange({ ...entry, hours: { ...entry.hours, [type]: value } })
  }

  const dateLabel = formatLongDate(new Date(dateISO + "T00:00:00"))

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold capitalize text-pretty">{dateLabel}</h3>
        <p className="text-sm text-muted-foreground">Registra las horas trabajadas en este día.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Categoría</Label>
        <Select value={entry.category} onValueChange={(v) => setCategory(v as CategoryId)}>
          <SelectTrigger id="category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.short})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {HOUR_TYPES.map((t) => (
          <HoursInput
            key={t.id}
            id={`hours-${t.id}`}
            label={t.label}
            value={entry.hours[t.id]}
            accentVar={HOUR_COLOR_VAR[t.id]}
            onChange={(v) => setHours(t.id, v)}
          />
        ))}
      </div>

      {overLimit && (
        <p role="alert" className="text-sm font-medium text-destructive">
          El total de {totals.totalHours} h supera el máximo recomendado de {MAX_TOTAL_HOURS_PER_DAY} h
          diarias.
        </p>
      )}

      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Total del día</p>
          <p className="font-semibold tabular-nums">{totals.totalHours} h</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Importe bruto</p>
          <p className="font-semibold tabular-nums text-primary">{formatEur(totals.gross)}</p>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="self-start text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
        Vaciar día
      </Button>
    </div>
  )
}
