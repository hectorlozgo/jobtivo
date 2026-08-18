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
  type Category,
  type HourType,
  type Settings,
  MAX_BREAK_MINUTES,
  MAX_CATALOG_NAME,
  MAX_CATEGORIES,
  MAX_HOUR_TYPES,
  categoryLabel,
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

/** Abreviatura sugerida: iniciales si hay varias palabras, si no las 3 primeras letras. */
function suggestShort(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ""
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return parts
      .map((p) => p[0])
      .join("")
      .slice(0, 4)
      .toUpperCase()
  }
  return trimmed.slice(0, 3)
}

function CatalogTextField({
  id,
  value,
  onCommit,
  max = MAX_CATALOG_NAME,
  placeholder,
  className,
}: {
  id: string
  value: string
  onCommit: (value: string) => void
  max?: number
  placeholder?: string
  className?: string
}) {
  const [text, setText] = useState(value)
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) setText(value)
  }, [value])

  function commit() {
    const next = text.trim().slice(0, max)
    if (next) onCommit(next)
    else setText(value)
  }

  return (
    <Input
      id={id}
      value={text}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      maxLength={max}
      onFocus={() => {
        focusedRef.current = true
      }}
      onChange={(e) => setText(e.target.value.slice(0, max))}
      onBlur={() => {
        focusedRef.current = false
        commit()
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
      }}
      className={className}
    />
  )
}

type CategoryDraft = {
  id: string
  name: string
  short: string
  shortTouched: boolean
}

type HourTypeDraft = {
  id: string
  label: string
}

function categoryFromDraft(draft: CategoryDraft): Category {
  const name = draft.name.trim().slice(0, MAX_CATALOG_NAME)
  const shortRaw = draft.shortTouched ? draft.short.trim() : suggestShort(name)
  const short = (shortRaw || suggestShort(name) || name.slice(0, 4)).slice(0, 12)
  return {
    id: makeCatalogId("actividad", name),
    name,
    short,
  }
}

function hourTypeFromDraft(draft: HourTypeDraft): HourType {
  const label = draft.label.trim().slice(0, MAX_CATALOG_NAME)
  return { id: makeCatalogId("hora", label), label }
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
  const [categoryDrafts, setCategoryDrafts] = useState<CategoryDraft[]>([])
  const [hourTypeDrafts, setHourTypeDrafts] = useState<HourTypeDraft[]>([])
  const [focusDraftId, setFocusDraftId] = useState<string | null>(null)
  const categoryDraftsRef = useRef(categoryDrafts)
  const hourTypeDraftsRef = useRef(hourTypeDrafts)
  const settingsRef = useRef(settings)
  const onChangeRef = useRef(onChange)
  categoryDraftsRef.current = categoryDrafts
  hourTypeDraftsRef.current = hourTypeDrafts
  settingsRef.current = settings
  onChangeRef.current = onChange

  useEffect(() => {
    if (!focusDraftId) return
    document.getElementById(focusDraftId)?.focus()
    setFocusDraftId(null)
  }, [focusDraftId, categoryDrafts, hourTypeDrafts])

  useEffect(() => {
    return () => {
      const cats = categoryDraftsRef.current.filter((d) => d.name.trim())
      const types = hourTypeDraftsRef.current.filter((d) => d.label.trim())
      if (cats.length === 0 && types.length === 0) return
      const next: Settings = { ...settingsRef.current }
      if (cats.length > 0) {
        next.categories = [...next.categories, ...cats.map(categoryFromDraft)]
      }
      if (types.length > 0) {
        next.hourTypes = [...next.hourTypes, ...types.map(hourTypeFromDraft)]
      }
      next.rates = rebuildRates(next)
      if (!next.categories.some((c) => c.id === next.defaultCategory)) {
        next.defaultCategory = next.categories[0]?.id ?? next.defaultCategory
      }
      onChangeRef.current(next)
    }
  }, [])

  function patch(partial: Partial<Settings>) {
    const next = { ...settingsRef.current, ...partial }
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
    const max = field === "short" ? 12 : MAX_CATALOG_NAME
    const next = value.trim().slice(0, max)
    if (!next) return
    patch({
      categories: settings.categories.map((c) =>
        c.id === id ? { ...c, [field]: next } : c,
      ),
    })
  }

  function commitCategoryDraft(id: string) {
    const draft = categoryDraftsRef.current.find((d) => d.id === id)
    if (!draft?.name.trim()) return
    patch({
      categories: [...settingsRef.current.categories, categoryFromDraft(draft)],
    })
    setCategoryDrafts((d) => d.filter((x) => x.id !== id))
  }

  function commitHourTypeDraft(id: string) {
    const draft = hourTypeDraftsRef.current.find((d) => d.id === id)
    if (!draft?.label.trim()) return
    patch({
      hourTypes: [...settingsRef.current.hourTypes, hourTypeFromDraft(draft)],
    })
    setHourTypeDrafts((d) => d.filter((x) => x.id !== id))
  }

  function addCategory() {
    const ready = categoryDrafts.filter((d) => d.name.trim())
    const empty = categoryDrafts.filter((d) => !d.name.trim())
    if (ready.length > 0) {
      patch({
        categories: [...settings.categories, ...ready.map(categoryFromDraft)],
      })
    }
    if (empty.length > 0) {
      setCategoryDrafts(empty)
      setFocusDraftId(`cat-name-${empty[0].id}`)
      return
    }
    if (settings.categories.length + ready.length >= MAX_CATEGORIES) {
      setCategoryDrafts([])
      return
    }
    const id = makeCatalogId("actividad", "Actividad")
    setCategoryDrafts([{ id, name: "", short: "", shortTouched: false }])
    setFocusDraftId(`cat-name-${id}`)
  }

  function removeCategory(id: string) {
    if (settings.categories.length <= 1) return
    patch({ categories: settings.categories.filter((c) => c.id !== id) })
  }

  function removeCategoryDraft(id: string) {
    setCategoryDrafts((d) => d.filter((x) => x.id !== id))
  }

  function updateHourType(id: string, label: string) {
    const next = label.trim().slice(0, MAX_CATALOG_NAME)
    if (!next) return
    patch({
      hourTypes: settings.hourTypes.map((t) =>
        t.id === id ? { ...t, label: next } : t,
      ),
    })
  }

  function addHourType() {
    const ready = hourTypeDrafts.filter((d) => d.label.trim())
    const empty = hourTypeDrafts.filter((d) => !d.label.trim())
    if (ready.length > 0) {
      patch({ hourTypes: [...settings.hourTypes, ...ready.map(hourTypeFromDraft)] })
    }
    if (empty.length > 0) {
      setHourTypeDrafts(empty)
      setFocusDraftId(`ht-${empty[0].id}`)
      return
    }
    if (settings.hourTypes.length + ready.length >= MAX_HOUR_TYPES) {
      setHourTypeDrafts([])
      return
    }
    const id = makeCatalogId("hora", "Hora")
    setHourTypeDrafts([{ id, label: "" }])
    setFocusDraftId(`ht-${id}`)
  }

  function removeHourType(id: string) {
    if (settings.hourTypes.length <= 1) return
    patch({ hourTypes: settings.hourTypes.filter((t) => t.id !== id) })
  }

  function removeHourTypeDraft(id: string) {
    setHourTypeDrafts((d) => d.filter((x) => x.id !== id))
  }

  function onDraftRowBlur(
    e: React.FocusEvent<HTMLDivElement>,
    commit: () => void,
  ) {
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    commit()
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">General</CardTitle>
          <CardDescription>
            Retención por defecto (también editable en Liquidación) y actividad
            preseleccionada al registrar un día.
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
            <Label htmlFor="default-category">Predeterminado</Label>
            <Select
              value={settings.defaultCategory}
              onValueChange={(v) => {
                if (v) setDefaultCategory(v)
              }}
              items={settings.categories.map((c) => ({
                value: c.id,
                label: categoryLabel(settings, c.id),
              }))}
            >
              <SelectTrigger id="default-category" className="w-full">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">Actividades</CardTitle>
          <CardDescription>
            Lo que cobras con tarifa propia: rol, servicio, cliente… (máx.{" "}
            {MAX_CATEGORIES}).
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
                <CatalogTextField
                  id={`cat-name-${cat.id}`}
                  value={cat.name}
                  onCommit={(value) => updateCategory(cat.id, "name", value)}
                  placeholder="Nombre de la actividad"
                  className="rounded-xl"
                />
              </div>
              <div className="flex w-24 flex-col gap-1.5">
                <Label htmlFor={`cat-short-${cat.id}`} className="text-xs">
                  Abrev.
                </Label>
                <CatalogTextField
                  id={`cat-short-${cat.id}`}
                  value={cat.short}
                  onCommit={(value) => updateCategory(cat.id, "short", value)}
                  max={12}
                  placeholder="Abrev."
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
          {categoryDrafts.map((draft) => (
            <div
              key={draft.id}
              className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border/80 bg-muted/10 p-3"
              onBlur={(e) => onDraftRowBlur(e, () => commitCategoryDraft(draft.id))}
            >
              <div className="flex min-w-40 flex-1 flex-col gap-1.5">
                <Label htmlFor={`cat-name-${draft.id}`} className="text-xs">
                  Nombre
                </Label>
                <Input
                  id={`cat-name-${draft.id}`}
                  value={draft.name}
                  placeholder="Escribe el nombre"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus={!draft.name}
                  maxLength={MAX_CATALOG_NAME}
                  onChange={(e) => {
                    const name = e.target.value.slice(0, MAX_CATALOG_NAME)
                    setCategoryDrafts((all) =>
                      all.map((d) =>
                        d.id === draft.id
                          ? {
                              ...d,
                              name,
                              short: d.shortTouched ? d.short : suggestShort(name),
                            }
                          : d,
                      ),
                    )
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur()
                  }}
                  className="rounded-xl"
                />
              </div>
              <div className="flex w-24 flex-col gap-1.5">
                <Label htmlFor={`cat-short-${draft.id}`} className="text-xs">
                  Abrev.
                </Label>
                <Input
                  id={`cat-short-${draft.id}`}
                  value={draft.short}
                  placeholder="Abrev."
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={12}
                  onChange={(e) => {
                    const short = e.target.value.slice(0, 12)
                    setCategoryDrafts((all) =>
                      all.map((d) =>
                        d.id === draft.id ? { ...d, short, shortTouched: true } : d,
                      ),
                    )
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur()
                  }}
                  className="rounded-xl"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => removeCategoryDraft(draft.id)}
                aria-label="Descartar actividad"
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
            disabled={
              settings.categories.length + categoryDrafts.length >= MAX_CATEGORIES
            }
            onClick={addCategory}
            className="self-start"
          >
            <Plus className="size-4" />
            Añadir actividad
          </Button>
          {categoryDrafts.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Se guarda al escribir un nombre y salir del recuadro.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold tracking-tight">Tipos de hora</CardTitle>
          <CardDescription>
            Normal, extra u otros tipos con tarifa propia (máx. {MAX_HOUR_TYPES}).
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
                  <CatalogTextField
                    id={`ht-${t.id}`}
                    value={t.label}
                    onCommit={(value) => updateHourType(t.id, value)}
                    placeholder="Tipo de hora"
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
          {hourTypeDrafts.map((draft) => (
            <div
              key={draft.id}
              className="flex flex-wrap items-end gap-2"
              onBlur={(e) => onDraftRowBlur(e, () => commitHourTypeDraft(draft.id))}
            >
              <div className="flex min-w-40 flex-1 flex-col gap-1.5">
                <Label htmlFor={`ht-${draft.id}`} className="text-xs">
                  Etiqueta
                </Label>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-muted-foreground/40"
                  />
                  <Input
                    id={`ht-${draft.id}`}
                    value={draft.label}
                    placeholder="Escribe el tipo de hora"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus={!draft.label}
                    maxLength={MAX_CATALOG_NAME}
                    onChange={(e) => {
                      const label = e.target.value.slice(0, MAX_CATALOG_NAME)
                      setHourTypeDrafts((all) =>
                        all.map((d) => (d.id === draft.id ? { ...d, label } : d)),
                      )
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur()
                    }}
                    className="pl-7"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => removeHourTypeDraft(draft.id)}
                aria-label="Descartar tipo de hora"
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
            disabled={settings.hourTypes.length + hourTypeDrafts.length >= MAX_HOUR_TYPES}
            onClick={addHourType}
            className="self-start"
          >
            <Plus className="size-4" />
            Añadir tipo de hora
          </Button>
          {hourTypeDrafts.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Se guarda al escribir una etiqueta y salir del recuadro.
            </p>
          )}
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
            Precio de cada tipo de hora, independiente por actividad.
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
