"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  type PeriodSummary,
  formatHoursClock,
  formatMoney,
} from "@/lib/calc"
import { hourColorVar } from "@/lib/hour-colors"
import {
  IRPF_PRESETS,
  type Settings,
  DEFAULT_SS_PERCENT,
} from "@/lib/types"
import { clampPercent } from "@/lib/validation"
import { Info, ChevronLeft, ChevronRight } from "lucide-react"

interface LiquidationPanelProps {
  summary: PeriodSummary
  settings: Settings
  periodLabel: string
  onChangeSettings: (settings: Settings) => void
  onNavigate: (dir: -1 | 1) => void
  onToday: () => void
}

/** Input de % con texto local para evitar el cero a la izquierda. */
function PercentInput({
  id,
  value,
  onCommit,
  className,
  "aria-label": ariaLabel,
}: {
  id: string
  value: number
  onCommit: (n: number) => void
  className?: string
  "aria-label"?: string
}) {
  const [text, setText] = useState(() => (value === 0 ? "" : String(value)))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) setText(value === 0 ? "" : String(value))
  }, [value])

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      placeholder="0"
      aria-label={ariaLabel}
      onFocus={() => {
        focusedRef.current = true
      }}
      onChange={(e) => {
        const raw = e.target.value.trim().replace(",", ".")
        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return
        setText(raw)
        if (raw === "" || raw === ".") return
        onCommit(clampPercent(raw))
      }}
      onBlur={() => {
        focusedRef.current = false
        const raw = text === "" || text === "." ? "0" : text
        const n = clampPercent(raw)
        onCommit(n)
        setText(n === 0 ? "" : String(n))
      }}
      onKeyDown={(e) => {
        if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
          e.preventDefault()
        }
        if (e.key === "Enter") e.currentTarget.blur()
      }}
      className={className}
    />
  )
}

export function LiquidationPanel({
  summary,
  settings,
  periodLabel,
  onChangeSettings,
  onNavigate,
  onToday,
}: LiquidationPanelProps) {
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)
  const taxLabel = settings.taxLabel || "IRPF"

  const maxGross = Math.max(
    ...settings.hourTypes.map((t) => summary.grossByType[t.id] ?? 0),
    0.001,
  )

  const isCustomIrpf = !IRPF_PRESETS.some((p) => p.value === settings.taxPercent)

  const typeRows = useMemo(
    () =>
      settings.hourTypes.map((t) => {
        const hours = summary.hoursByType[t.id] ?? 0
        const gross = summary.grossByType[t.id] ?? 0
        const share =
          summary.gross > 0 ? Math.round((gross / summary.gross) * 100) : 0
        return { ...t, hours, gross, share }
      }),
    [settings.hourTypes, summary],
  )

  function patch(partial: Partial<Settings>) {
    onChangeSettings({ ...settings, ...partial })
  }

  function setIrpf(value: number) {
    patch({ taxPercent: clampPercent(value) })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Liquidación estimada
          </p>
          <h2 className="font-heading text-lg font-semibold capitalize tracking-tight text-pretty sm:text-xl">
            {periodLabel}
          </h2>
          <p className="text-sm text-muted-foreground">
            Simula el cobro del mes a partir de tus horas y tarifas. No sustituye
            la liquidación o nómina de la empresa.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday} className="rounded-xl">
            Hoy
          </Button>
          <div className="flex items-center rounded-xl border border-border/70 bg-background/60 p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onNavigate(-1)}
              aria-label="Mes anterior"
              className="rounded-lg"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onNavigate(1)}
              aria-label="Mes siguiente"
              className="rounded-lg"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Bruto" value={money(summary.gross)} />
        <Metric
          label="Deducciones"
          value={money(summary.taxAmount + summary.socialSecurityAmount)}
          tone="danger"
        />
        <Metric label="Neto estimado" value={money(summary.net)} tone="primary" />
      </div>

      <div className="surface-panel flex flex-col gap-5 p-4 sm:p-5">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {taxLabel}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Presets habituales en contratos temporales / ETT. El % se guarda en
            Tarifas.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {IRPF_PRESETS.map((p) => {
              const active = settings.taxPercent === p.value
              return (
                <Button
                  key={p.value}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="rounded-xl pr-3"
                  onClick={() => setIrpf(p.value)}
                >
                  {p.label}
                </Button>
              )
            })}
            <div className="flex items-center gap-2">
              <Label htmlFor="irpf-custom" className="sr-only">
                IRPF personalizado
              </Label>
              <div className="relative w-18">
                <PercentInput
                  id="irpf-custom"
                  value={settings.taxPercent}
                  onCommit={setIrpf}
                  aria-label="Porcentaje IRPF personalizado"
                  className={`h-8 rounded-xl pr-6 text-right tabular-nums ${
                    isCustomIrpf ? "border-primary ring-1 ring-primary/30" : ""
                  }`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              − {taxLabel} ({settings.taxPercent}%)
            </span>
            <span className="font-medium tabular-nums text-destructive">
              − {money(summary.taxAmount)}
            </span>
          </div>
        </div>

        <div className="h-px bg-border/70" />

        <div>
          <label
            htmlFor="apply-ss"
            className="flex cursor-pointer items-start gap-3"
          >
            <input
              id="apply-ss"
              type="checkbox"
              checked={settings.applySocialSecurity}
              onChange={(e) => patch({ applySocialSecurity: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">
                Cotización SS trabajador
              </span>
              <span className="text-xs text-muted-foreground">
                Estimación orientativa (~{DEFAULT_SS_PERCENT}% contingencias
                comunes). En ETT a menudo ya va descontada en la liquidación.
              </span>
            </span>
          </label>

          {settings.applySocialSecurity && (
            <div className="mt-3 ml-7 flex flex-wrap items-end gap-3">
              <div className="flex w-28 flex-col gap-1.5">
                <Label htmlFor="ss-percent">SS (%)</Label>
                <div className="relative">
                  <PercentInput
                    id="ss-percent"
                    value={settings.socialSecurityPercent}
                    onCommit={(n) => patch({ socialSecurityPercent: n })}
                    className="h-8 rounded-xl pr-8 text-right tabular-nums"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              <p className="pb-1.5 text-sm tabular-nums text-destructive">
                − {money(summary.socialSecurityAmount)}
              </p>
            </div>
          )}
        </div>

        <div className="h-px bg-border/70" />

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Neto estimado</span>
          <span className="font-heading text-xl font-semibold tabular-nums text-primary">
            {money(summary.net)}
          </span>
        </div>
      </div>

      <div className="surface-panel p-4 sm:p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Bruto por tipo de hora
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {typeRows.map((t) => {
            const width = Math.max(4, (t.gross / maxGross) * 100)
            return (
              <div key={t.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor: `var(${hourColorVar(t.id, settings.hourTypes)})`,
                    }}
                  />
                  <span className="flex-1">{t.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatHoursClock(t.hours)}
                    {t.share > 0 ? ` · ${t.share}%` : ""}
                  </span>
                  <span className="min-w-20 text-right font-medium tabular-nums">
                    {money(t.gross)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${width}%`,
                      backgroundColor: `var(${hourColorVar(t.id, settings.hourTypes)})`,
                      opacity: t.gross > 0 ? 0.85 : 0.25,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Estimación orientativa. El IRPF real depende de tu situación fiscal y la
        SS de bases, convenio y tipo de contrato. Contrasta siempre con tu
        liquidación oficial.
      </p>
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "primary" | "danger"
}) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-heading text-xl font-semibold tabular-nums ${
          tone === "primary"
            ? "text-primary"
            : tone === "danger"
              ? "text-destructive"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  )
}
