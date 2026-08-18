'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HoursInput } from '@/components/hours-input'
import { entryTotals, formatDurationHours, formatMoney } from '@/lib/calc'
import { hourColorVar } from '@/lib/hour-colors'
import { type DayEntry, type Settings, MAX_BREAK_MINUTES, MAX_TOTAL_HOURS_PER_DAY, categoryLabel } from '@/lib/types'
import { clampBreakMinutes } from '@/lib/validation'
import { formatLongDate } from '@/lib/dates'
import { CalendarRange, Check, Save, Trash2 } from 'lucide-react'

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

export function DayEditor({ dateISO, entry, exists, settings, onSave, onClear, onFillWeekdays }: DayEditorProps) {
  const [draft, setDraft] = useState<DayEntry>(entry)

  const entrySignature = JSON.stringify(entry)
  useEffect(() => {
    setDraft(JSON.parse(entrySignature) as DayEntry)
  }, [entrySignature])

  const totals = useMemo(() => entryTotals(draft, settings), [draft, settings])
  const overLimit = totals.grossHours > MAX_TOTAL_HOURS_PER_DAY
  const hasHours = totals.grossHours > 0
  const dirty = JSON.stringify(draft) !== entrySignature
  const canSave = dirty && (exists || hasHours)

  function setCategory(next: string) {
    setDraft((d) => ({ ...d, category: next }))
  }

  function setHours(typeId: string, value: number) {
    setDraft((d) => ({ ...d, hours: { ...d.hours, [typeId]: value } }))
  }

  function setBreakApplied(next: boolean) {
    setDraft((d) => ({
      ...d,
      breakApplied: next,
      // Al marcar, si no hay minutos, usa el valor por defecto de tarifas.
      breakMinutes: next && d.breakMinutes <= 0 ? settings.breakMinutes : d.breakMinutes
    }))
  }

  function setBreakMinutes(raw: string) {
    const next = raw === '' ? 0 : clampBreakMinutes(raw)
    setDraft((d) => ({ ...d, breakMinutes: next }))
  }

  function handleSave() {
    if (!canSave) return
    onSave(draft)
  }

  const dateLabel = formatLongDate(new Date(dateISO + 'T00:00:00'))

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Editor del día</p>
        <h3 className="font-heading text-lg font-semibold capitalize tracking-tight text-pretty">{dateLabel}</h3>
        <p className="text-sm text-muted-foreground">
          Introduce la jornada bruta y marca el descanso solo si lo has hecho.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Actividad</Label>
        <Select
          value={draft.category}
          onValueChange={(v) => {
            if (v) setCategory(v)
          }}
          items={settings.categories.map((c) => ({
            value: c.id,
            label: categoryLabel(settings, c.id),
          }))}
        >
          <SelectTrigger id="category" className="w-full rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settings.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {categoryLabel(settings, c.id)}
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

      <div className="rounded-xl border border-border/70 bg-muted/35 px-4 py-3.5">
        <label htmlFor="break-applied" className="flex cursor-pointer items-start gap-3">
          <input
            id="break-applied"
            type="checkbox"
            checked={draft.breakApplied}
            onChange={(e) => setBreakApplied(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">Descanso</span>
            <span className="text-xs text-muted-foreground">
              Solo se descuenta si lo marcas. Puedes ajustar los minutos de este día.
            </span>
          </span>
        </label>

        {draft.breakApplied && (
          <div className="mt-3 ml-7 flex max-w-36 flex-col gap-1.5">
            <Label htmlFor="break-minutes-day">Duración (min)</Label>
            <div className="relative">
              <Input
                id="break-minutes-day"
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_BREAK_MINUTES}
                step={5}
                value={draft.breakMinutes === 0 ? '' : draft.breakMinutes}
                placeholder={String(settings.breakMinutes)}
                onChange={(e) => setBreakMinutes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault()
                  }
                }}
                className="h-9 rounded-lg pr-10 text-right font-heading text-base font-semibold tabular-nums"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                min
              </span>
            </div>
          </div>
        )}
      </div>

      {overLimit && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          El total de {totals.grossHours} h supera el máximo recomendado de {MAX_TOTAL_HOURS_PER_DAY} h diarias.
        </p>
      )}

      <div className="mt-auto flex flex-col gap-5">
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-4 py-3.5">
          <div>
            <p className="text-xs text-muted-foreground">
              {totals.breakMinutesApplied > 0 ? 'Horas cobrables' : 'Total del día'}
            </p>
            <p className="font-heading text-lg font-semibold tabular-nums">{formatDurationHours(totals.totalHours)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Importe bruto</p>
            <p className="font-heading text-lg font-semibold tabular-nums text-primary">
              {formatMoney(totals.gross, settings.currency, settings.locale)}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="h-10 justify-center rounded-xl"
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
              {exists ? 'Actualizar' : 'Guardar'}
            </>
          )}
        </Button>

        {dirty && (
          <p className="-mt-2 text-center text-xs text-muted-foreground">Tienes cambios sin guardar en este día.</p>
        )}

        {onFillWeekdays && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!hasHours}
            onClick={() => onFillWeekdays(draft)}
            className="h-9 justify-center rounded-xl"
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
          className="self-start rounded-lg text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          Vaciar día
        </Button>
      </div>
    </div>
  )
}
