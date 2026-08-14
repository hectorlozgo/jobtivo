"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { hourColorVar } from "@/lib/hour-colors"
import { clampBreakMinutes, clampPercent, clampRate } from "@/lib/validation"
import {
  type Settings,
  MAX_BREAK_MINUTES,
  MAX_CATEGORIES,
  MAX_HOUR_TYPES,
  makeCatalogId,
} from "@/lib/types"
import { Plus, Trash2 } from "lucide-react"

interface SettingsPanelProps {
  settings: Settings
  onChange: (settings: Settings) => void
}

function formatNumberText(value: number): string {
  return value === 0 ? "" : String(value)
}

function NumberField({
  id,
  value,
  onCommit,
  suffix,
  accentVar,
}: {
  id: string
  value: number
  onCommit: (raw: string) => void
  suffix?: string
  accentVar?: string
  /** Reservado por compatibilidad con llamadas existentes. */
  step?: number
}) {
  const [text, setText] = useState(() => formatNumberText(value))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) setText(formatNumberText(value))
  }, [value])

  function commit(raw: string) {
    onCommit(raw === "" || raw === "." ? "0" : raw)
  }

  return (
    <div className="relative">
      {accentVar && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 size-2.5 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: `var(${accentVar})` }}
        />
      )}
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={text}
        placeholder="0"
        onFocus={() => {
          focusedRef.current = true
        }}
        onChange={(e) => {
          const raw = e.target.value.trim().replace(",", ".")
          if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return
          setText(raw)
          if (raw === "" || raw === ".") return
          onCommit(raw)
        }}
        onBlur={() => {
          focusedRef.current = false
          const raw = text === "" || text === "." ? "0" : text
          commit(raw)
          const n = Number.parseFloat(raw)
          setText(!Number.isFinite(n) || n === 0 ? "" : String(Math.round(n * 100) / 100))
        }}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
            e.preventDefault()
          }
          if (e.key === "Enter") {
            e.currentTarget.blur()
          }
        }}
        className={`text-right tabular-nums ${accentVar ? "pl-7" : ""} ${suffix ? "pr-7" : ""}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}

function rebuildRates(settings: Settings): Settings["rates"] {
  const rates: Settings["rates"] = {}
  for (const cat of settings.categories) {
    const prev = settings.rates[cat.id] ?? {}
    const set: Record<string, number> = {}
    for (const t of settings.hourTypes) {
      set[t.id] = prev[t.id] ?? 0
    }
    rates[cat.id] = set
  }
  return rates
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const currencySuffix = settings.currency === "EUR" ? "€" : settings.currency

  function patch(partial: Partial<Settings>) {
    const next = { ...settings, ...partial }
    if (partial.categories || partial.hourTypes) {
      next.rates = rebuildRates(next)
      if (!next.categories.some((c) => c.id === next.defaultCategory)) {
        next.defaultCategory = next.categories[0]?.id ?? next.defaultCategory
      }
    }
    onChange(next)
  }

  function setTaxPercent(raw: string) {
    patch({ taxPercent: clampPercent(raw === "" ? 0 : raw) })
  }

  function setTaxLabel(raw: string) {
    patch({ taxLabel: raw.slice(0, 24) })
  }

  function setRate(catId: string, typeId: string, raw: string) {
    const next = structuredClone(settings)
    if (!next.rates[catId]) next.rates[catId] = {}
    next.rates[catId][typeId] = clampRate(raw === "" ? 0 : raw)
    onChange(next)
  }

  function setDefaultCategory(value: string) {
    patch({ defaultCategory: value })
  }

  function setBreakMinutes(raw: string) {
    patch({ breakMinutes: clampBreakMinutes(raw === "" ? 0 : raw) })
  }

  function setApplyBreakByDefault(next: boolean) {
    patch({ applyBreakByDefault: next })
  }

  function updateCategory(id: string, field: "name" | "short", value: string) {
    patch({
      categories: settings.categories.map((c) =>
        c.id === id ? { ...c, [field]: value.slice(0, field === "short" ? 12 : 40) } : c,
      ),
    })
  }

  function addCategory() {
    if (settings.categories.length >= MAX_CATEGORIES) return
    const id = makeCatalogId("puesto", "Puesto")
    patch({
      categories: [...settings.categories, { id, name: "Nuevo puesto", short: "N" }],
    })
  }

  function removeCategory(id: string) {
    if (settings.categories.length <= 1) return
    patch({ categories: settings.categories.filter((c) => c.id !== id) })
  }

  function updateHourType(id: string, label: string) {
    patch({
      hourTypes: settings.hourTypes.map((t) =>
        t.id === id ? { ...t, label: label.slice(0, 40) } : t,
      ),
    })
  }

  function addHourType() {
    if (settings.hourTypes.length >= MAX_HOUR_TYPES) return
    const id = makeCatalogId("hora", "Hora")
    patch({
      hourTypes: [...settings.hourTypes, { id, label: "Nuevo tipo" }],
    })
  }

  function removeHourType(id: string) {
    if (settings.hourTypes.length <= 1) return
    patch({ hourTypes: settings.hourTypes.filter((t) => t.id !== id) })
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">General</CardTitle>
          <CardDescription>
            Retención por defecto (también editable en Liquidación) y puesto
            preseleccionado al registrar un día.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div className="flex max-w-40 flex-col gap-1.5">
            <Label htmlFor="tax-label">Etiqueta retención</Label>
            <Input
              id="tax-label"
              value={settings.taxLabel}
              onChange={(e) => setTaxLabel(e.target.value)}
              placeholder="IRPF"
            />
          </div>
          <div className="flex max-w-40 flex-col gap-1.5">
            <Label htmlFor="tax-percent">{settings.taxLabel || "Retención"} (%)</Label>
            <NumberField
              id="tax-percent"
              value={settings.taxPercent}
              onCommit={setTaxPercent}
              suffix="%"
            />
          </div>
          <div className="flex min-w-52 flex-col gap-1.5">
            <Label htmlFor="default-category">Puesto predeterminado</Label>
            <Select
              value={settings.defaultCategory}
              onValueChange={(v) => {
                if (v) setDefaultCategory(v)
              }}
            >
              <SelectTrigger id="default-category" className="w-full">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">Puestos</CardTitle>
          <CardDescription>
            Categorías o roles con tarifa propia (máx. {MAX_CATEGORIES}).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {settings.categories.map((cat) => (
            <div
              key={cat.id}
              className="flex flex-wrap items-end gap-2 rounded-xl border border-border/60 bg-muted/20 p-3"
            >
              <div className="flex min-w-40 flex-1 flex-col gap-1.5">
                <Label htmlFor={`cat-name-${cat.id}`} className="text-xs">
                  Nombre
                </Label>
                <Input
                  id={`cat-name-${cat.id}`}
                  value={cat.name}
                  onChange={(e) => updateCategory(cat.id, "name", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="flex w-24 flex-col gap-1.5">
                <Label htmlFor={`cat-short-${cat.id}`} className="text-xs">
                  Abrev.
                </Label>
                <Input
                  id={`cat-short-${cat.id}`}
                  value={cat.short}
                  onChange={(e) => updateCategory(cat.id, "short", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={settings.categories.length <= 1}
                onClick={() => removeCategory(cat.id)}
                aria-label={`Eliminar ${cat.name}`}
                className="rounded-xl text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={settings.categories.length >= MAX_CATEGORIES}
            onClick={addCategory}
            className="self-start"
          >
            <Plus className="size-4" />
            Añadir puesto
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">Tipos de hora</CardTitle>
          <CardDescription>
            Normal, extra, festiva… o los que necesites (máx. {MAX_HOUR_TYPES}).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {settings.hourTypes.map((t) => (
            <div key={t.id} className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-40 flex-1 flex-col gap-1.5">
                <Label htmlFor={`ht-${t.id}`} className="text-xs">
                  Etiqueta
                </Label>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 size-2.5 -translate-y-1/2 rounded-full"
                    style={{
                      backgroundColor: `var(${hourColorVar(t.id, settings.hourTypes)})`,
                    }}
                  />
                  <Input
                    id={`ht-${t.id}`}
                    value={t.label}
                    onChange={(e) => updateHourType(t.id, e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={settings.hourTypes.length <= 1}
                onClick={() => removeHourType(t.id)}
                aria-label={`Eliminar ${t.label}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={settings.hourTypes.length >= MAX_HOUR_TYPES}
            onClick={addHourType}
            className="self-start"
          >
            <Plus className="size-4" />
            Añadir tipo de hora
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">Descanso</CardTitle>
          <CardDescription>
            Valor por defecto de minutos al marcar descanso en un día. Cada día
            puede ajustarlo por separado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-6">
          <div className="flex max-w-40 flex-col gap-1.5">
            <Label htmlFor="break-minutes">Duración por defecto (min)</Label>
            <NumberField
              id="break-minutes"
              value={settings.breakMinutes}
              onCommit={setBreakMinutes}
              suffix="min"
              step={5}
            />
            <p className="text-xs text-muted-foreground">Máximo {MAX_BREAK_MINUTES} min.</p>
          </div>
          <label
            htmlFor="apply-break-default"
            className="flex cursor-pointer items-start gap-3 pb-1"
          >
            <input
              id="apply-break-default"
              type="checkbox"
              checked={settings.applyBreakByDefault}
              onChange={(e) => setApplyBreakByDefault(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Marcar por defecto</span>
              <span className="text-xs text-muted-foreground">
                Los días nuevos empiezan con el descanso ya marcado.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">Tarifas por hora</CardTitle>
          <CardDescription>
            Precio de cada tipo de hora, independiente por puesto.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {settings.categories.map((cat) => (
            <div
              key={cat.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/15 p-4"
            >
              <h4 className="font-heading text-sm font-semibold tracking-tight">
                {cat.name} <span className="text-muted-foreground">({cat.short})</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {settings.hourTypes.map((t) => (
                  <div key={t.id} className="flex flex-col gap-1.5">
                    <Label htmlFor={`rate-${cat.id}-${t.id}`} className="text-xs">
                      {t.label}
                    </Label>
                    <NumberField
                      id={`rate-${cat.id}-${t.id}`}
                      value={settings.rates[cat.id]?.[t.id] ?? 0}
                      onCommit={(raw) => setRate(cat.id, t.id, raw)}
                      accentVar={hourColorVar(t.id, settings.hourTypes)}
                      suffix={currencySuffix}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
