"use client"

import { Card, CardContent } from "@/components/ui/card"
import { type PeriodSummary, formatMoney } from "@/lib/calc"
import { hourColorVar } from "@/lib/hour-colors"
import { type Settings } from "@/lib/types"

interface SummaryCardsProps {
  summary: PeriodSummary
  settings: Settings
}

export function SummaryCards({ summary, settings }: SummaryCardsProps) {
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)
  const taxLabel = settings.taxLabel || "Retención"

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Horas totales" value={`${summary.totalHours} h`} />
        <Stat label="Días trabajados" value={String(summary.days)} />
        <Stat label="Bruto" value={money(summary.gross)} />
        <Stat label="Neto" value={money(summary.net)} highlight />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {taxLabel} ({settings.taxPercent}%)
            </span>
            <span className="font-medium tabular-nums text-destructive">
              − {money(summary.taxAmount)}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-medium text-muted-foreground">Horas por tipo</p>
            {settings.hourTypes.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor: `var(${hourColorVar(t.id, settings.hourTypes)})`,
                  }}
                />
                <span className="flex-1">{t.label}</span>
                <span className="font-medium tabular-nums">
                  {Math.round((summary.hoursByType[t.id] ?? 0) * 100) / 100} h
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? "border-primary/40 bg-accent/50" : undefined}>
      <CardContent className="flex flex-col gap-1 py-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={`text-lg font-semibold tabular-nums text-pretty ${
            highlight ? "text-primary" : ""
          }`}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  )
}
