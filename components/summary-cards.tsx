"use client"

import type { ReactNode } from "react"
import { type PeriodSummary, formatMoney } from "@/lib/calc"
import { hourColorVar } from "@/lib/hour-colors"
import { type Settings } from "@/lib/types"
import { Banknote, CalendarCheck2, Clock3, Wallet } from "lucide-react"

interface SummaryCardsProps {
  summary: PeriodSummary
  settings: Settings
}

export function SummaryCards({ summary, settings }: SummaryCardsProps) {
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)
  const taxLabel = settings.taxLabel || "Retención"
  const maxHours = Math.max(
    ...settings.hourTypes.map((t) => summary.hoursByType[t.id] ?? 0),
    0.001,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Horas totales"
          value={`${summary.totalHours} h`}
          icon={<Clock3 className="size-4" />}
          className="stagger-1"
        />
        <Stat
          label="Días trabajados"
          value={String(summary.days)}
          icon={<CalendarCheck2 className="size-4" />}
          className="stagger-2"
        />
        <Stat
          label="Bruto"
          value={money(summary.gross)}
          icon={<Banknote className="size-4" />}
          className="stagger-3"
        />
        <Stat
          label="Neto"
          value={money(summary.net)}
          icon={<Wallet className="size-4" />}
          highlight
          className="stagger-4"
        />
      </div>

      <div className="surface-panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {taxLabel} ({settings.taxPercent}%)
          </span>
          <span className="font-medium tabular-nums text-destructive">
            − {money(summary.taxAmount)}
          </span>
        </div>

        <div className="my-4 h-px bg-border/70" />

        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Horas por tipo
          </p>
          {settings.hourTypes.map((t) => {
            const hours = Math.round((summary.hoursByType[t.id] ?? 0) * 100) / 100
            const width = Math.max(4, (hours / maxHours) * 100)
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
                  <span className="font-medium tabular-nums">{hours} h</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${width}%`,
                      backgroundColor: `var(${hourColorVar(t.id, settings.hourTypes)})`,
                      opacity: hours > 0 ? 0.85 : 0.25,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
  icon,
  className,
}: {
  label: string
  value: string
  highlight?: boolean
  icon: ReactNode
  className?: string
}) {
  return (
    <div
      className={`animate-fade-up surface-panel relative overflow-hidden p-4 ${
        highlight ? "ring-primary/30" : ""
      } ${className ?? ""}`}
    >
      {highlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-transparent"
        />
      )}
      <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span
            className={`flex size-7 items-center justify-center rounded-lg ${
              highlight
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {icon}
          </span>
        </div>
        <span
          className={`font-heading text-xl font-semibold tracking-tight tabular-nums text-pretty sm:text-2xl ${
            highlight ? "text-primary" : ""
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  )
}
