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
import { entryTotals, formatDurationHours, formatMoney } from "@/lib/calc"
import { hourColorVar } from "@/lib/hour-colors"
import {
  type DayEntry,
  type Settings,
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
  const overLimit = totals.grossHours > MAX_TOTAL_HOURS_PER_DAY
  const hasHours = totals.grossHours > 0
  const dirty = JSON.stringify(draft) !== entrySignature

  // Se puede guardar si hay cambios sin persistir y hay algo que guardar
  // (un día nuevo sin horas no genera petición).
  const canSave = dirty && (exists || hasHours)

  function setCategory(next: string) {
    setDraft((d) => ({ ...d, category: next }))
  }

  function setHours(typeId: string, value: number) {
    setDraft((d) => ({ ...d, hours: { ...d.hours, [typeId]: value } }))
  }

  function setBreakApplied(next: boolean) {
    setDraft((d) => ({ ...d, breakApplied: next }))
  }

  function handleSave() {
    if (!canSave) return
    onSave(draft)
  }

  const dateLabel = formatLongDate(new Date(dateISO + "T00:00:00"))
  const breakPreview =
    draft.breakApplied && totals.breakMinutesApplied > 0
      ? `${formatDurationHours(totals.grossHours)} − ${totals.breakMinutesApplied} min = ${formatDurationHours(totals.totalHours)}`
      : null

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold capitalize text-pretty">{dateLabel}</h3>
        <p className="text-sm text-muted-foreground">
          Introduce la jornada bruta; el descanso se resta automáticamente si lo marcas.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Puesto</Label>
        <Select
          value={draft.category}
          onValueChange={(v) => {
            if (v) setCategory(v)
          }}
        >
          <SelectTrigger id="category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settings.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.short})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {settings.hourTypes.map((t) => (
          <HoursInput
            key={t.id}
            id={`hours-${t.id}`}
            label={t.label}
            value={draft.hours[t.id] ?? 0}
            accentVar={hourColorVar(t.id, settings.hourTypes)}
            onChange={(v) => setHours(t.id, v)}
          />
        ))}
      </div>

      <label
        htmlFor="break-applied"
        className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3"
      >
        <input
          id="break-applied"
          type="checkbox"
          checked={draft.breakApplied}
          onChange={(e) => setBreakApplied(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">
            Descanso de jornada ({settings.breakMinutes} min)
          </span>
          <span className="text-xs text-muted-foreground">
            Se descuenta empezando por el primer tipo de hora. Configúralo en Tarifas.
          </span>
          {breakPreview && (
            <span className="mt-1 text-xs font-medium tabular-nums text-foreground">
              {breakPreview}
            </span>
          )}
        </span>
      </label>

      {overLimit && (
        <p role="alert" className="text-sm font-medium text-destructive">
          El total de {totals.grossHours} h supera el máximo recomendado de {MAX_TOTAL_HOURS_PER_DAY} h
          diarias.
        </p>
      )}

      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {totals.breakMinutesApplied > 0 ? "Horas cobrables" : "Total del día"}
          </p>
          <p className="font-semibold tabular-nums">{formatDurationHours(totals.totalHours)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Importe bruto</p>
          <p className="font-semibold tabular-nums text-primary">
            {formatMoney(totals.gross, settings.currency, settings.locale)}
          </p>
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
