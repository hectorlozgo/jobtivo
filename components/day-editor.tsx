"use client"

import { useEffect, useMemo, useState } from "react"
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
import { CalendarRange, Check, Save, Trash2 } from "lucide-react"

interface DayEditorProps {
  dateISO: string
  entry: DayEntry
  /** true si el día ya tiene datos almacenados en la base de datos. */
  exists: boolean
  settings: Settings
  /** Persiste el borrador (una única petición). */
  onSave: (entry: DayEntry) => void
  onClear: () => void
  onFillWeekdays?: (entry: DayEntry) => void
}

export function DayEditor({
  dateISO,
  entry,
  exists,
  settings,
  onSave,
  onClear,
  onFillWeekdays,
}: DayEditorProps) {
  // El borrador vive en estado local: los cambios NO se envían a la API hasta
  // que el usuario pulsa "Guardar"/"Actualizar". Esto evita una petición por
  // cada pulsación de tecla.
  const [draft, setDraft] = useState<DayEntry>(entry)

  // Firma estable de la entrada almacenada para sincronizar el borrador solo
  // cuando cambia el día o los datos guardados (no en cada render).
  const entrySignature = JSON.stringify(entry)
  useEffect(() => {
    setDraft(JSON.parse(entrySignature) as DayEntry)
  }, [entrySignature])

  const totals = useMemo(() => entryTotals(draft, settings), [draft, settings])
  const overLimit = totals.totalHours > MAX_TOTAL_HOURS_PER_DAY
  const hasHours = totals.totalHours > 0
  const dirty = JSON.stringify(draft) !== entrySignature

  // Se puede guardar si hay cambios sin persistir y hay algo que guardar
  // (un día nuevo sin horas no genera petición).
  const canSave = dirty && (exists || hasHours)

  function setCategory(next: CategoryId) {
    setDraft((d) => ({ ...d, category: next }))
  }

  function setHours(type: HourType, value: number) {
    setDraft((d) => ({ ...d, hours: { ...d.hours, [type]: value } }))
  }

  function handleSave() {
    if (!canSave) return
    onSave(draft)
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
        <Select value={draft.category} onValueChange={(v) => setCategory(v as CategoryId)}>
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
            value={draft.hours[t.id]}
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
        onClick={handleSave}
        disabled={!canSave}
        className="justify-center"
        aria-live="polite"
      >
        {!dirty && exists ? (
          <>
            <Check className="size-4" />
            Guardado
          </>
        ) : (
          <>
            <Save className="size-4" />
            {exists ? "Actualizar" : "Guardar"}
          </>
        )}
      </Button>

      {dirty && (
        <p className="-mt-2 text-center text-xs text-muted-foreground">
          Tienes cambios sin guardar en este día.
        </p>
      )}

      {onFillWeekdays && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hasHours}
          onClick={() => onFillWeekdays(draft)}
          className="justify-center"
        >
          <CalendarRange className="size-4" />
          Aplicar a toda la semana (L–V)
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={!exists}
        className="self-start text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
        Vaciar día
      </Button>
    </div>
  )
}
