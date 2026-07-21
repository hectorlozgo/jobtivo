"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { HOUR_COLOR_VAR } from "@/lib/hour-colors"
import { clampPercent, clampRate } from "@/lib/validation"
import {
  type CategoryId,
  type HourType,
  type Settings,
  CATEGORIES,
  HOUR_TYPES,
} from "@/lib/types"

interface SettingsPanelProps {
  settings: Settings
  onChange: (settings: Settings) => void
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
}) {
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
        type="number"
        inputMode="decimal"
        min={0}
        step={0.5}
        value={value}
        onChange={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") e.preventDefault()
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

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  function setIrpf(raw: string) {
    onChange({ ...settings, irpf: clampPercent(raw === "" ? 0 : raw) })
  }

  function setRate(cat: CategoryId, type: HourType, raw: string) {
    const next = structuredClone(settings)
    next.rates[cat][type] = clampRate(raw === "" ? 0 : raw)
    onChange(next)
  }

  function setDefaultCategory(value: CategoryId) {
    onChange({ ...settings, defaultCategory: value })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            IRPF aplicado sobre el bruto y categoría preseleccionada al registrar un día.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div className="flex max-w-40 flex-col gap-1.5">
            <Label htmlFor="irpf">IRPF (%)</Label>
            <NumberField id="irpf" value={settings.irpf} onCommit={setIrpf} suffix="%" />
          </div>
          <div className="flex min-w-52 flex-col gap-1.5">
            <Label htmlFor="default-category">Categoría predeterminada</Label>
            <Select
              value={settings.defaultCategory}
              onValueChange={(v) => setDefaultCategory(v as CategoryId)}
            >
              <SelectTrigger id="default-category" className="w-full">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarifas por hora</CardTitle>
          <CardDescription>
            Precio en euros de cada tipo de hora, independiente por categoría.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold">
                {cat.name} <span className="text-muted-foreground">({cat.short})</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {HOUR_TYPES.map((t) => (
                  <div key={t.id} className="flex flex-col gap-1.5">
                    <Label htmlFor={`rate-${cat.id}-${t.id}`} className="text-xs">
                      {t.label}
                    </Label>
                    <NumberField
                      id={`rate-${cat.id}-${t.id}`}
                      value={settings.rates[cat.id][t.id]}
                      onCommit={(raw) => setRate(cat.id, t.id, raw)}
                      accentVar={HOUR_COLOR_VAR[t.id]}
                      suffix="€"
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
