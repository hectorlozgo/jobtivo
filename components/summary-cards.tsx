"use client"

import type { ReactNode } from "react"
import { type PeriodSummary, formatHoursClock, formatMoney } from "@/lib/calc"
import { type Settings } from "@/lib/types"
import { Banknote, CalendarCheck2, Clock3, Wallet } from "lucide-react"

interface SummaryCardsProps {
  summary: PeriodSummary
  settings: Settings
}

export function SummaryCards({ summary, settings }: SummaryCardsProps) {
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label="Horas totales"
        value={formatHoursClock(summary.totalHours)}
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
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/12 via-transparent to-transparent"
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
