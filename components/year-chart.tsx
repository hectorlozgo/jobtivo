"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { entryTotals, estimateDeductions, formatMoney, round2 } from "@/lib/calc"
import { type DayEntry, type Settings } from "@/lib/types"
import { fromISO } from "@/lib/dates"

interface YearChartProps {
  year: number
  entries: Record<string, DayEntry>
  settings: Settings
}

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

const chartConfig = {
  bruto: { label: "Bruto", color: "var(--chart-1)" },
  neto: { label: "Neto", color: "var(--chart-4)" },
} satisfies ChartConfig

export function YearChart({ year, entries, settings }: YearChartProps) {
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)
  const { data, totalGross, totalNet, totalHours } = useMemo(() => {
    const months = MONTH_LABELS.map((label) => ({ label, bruto: 0, neto: 0, horas: 0 }))
    let totalGross = 0
    let totalNet = 0
    let totalHours = 0

    for (const entry of Object.values(entries)) {
      const d = fromISO(entry.date)
      if (d.getFullYear() !== year) continue
      const { gross, totalHours: h } = entryTotals(entry, settings)
      const { net } = estimateDeductions(gross, settings)
      const m = d.getMonth()
      months[m].bruto = round2(months[m].bruto + gross)
      months[m].neto = round2(months[m].neto + net)
      months[m].horas = round2(months[m].horas + h)
      totalGross += gross
      totalNet += net
      totalHours += h
    }

    return {
      data: months,
      totalGross: round2(totalGross),
      totalNet: round2(totalNet),
      totalHours: round2(totalHours),
    }
  }, [entries, settings, year])

  return (
    <div className="surface-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <h3 className="font-heading text-lg font-semibold tracking-tight">
            Resumen anual {year}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Importe bruto y neto acumulado por mes.
          </p>
        </div>
        <div className="flex gap-5 text-right">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Horas
            </p>
            <p className="font-heading font-semibold tabular-nums">{totalHours} h</p>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Bruto
            </p>
            <p className="font-heading font-semibold tabular-nums">{money(totalGross)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Neto
            </p>
            <p className="font-heading font-semibold tabular-nums text-primary">
              {money(totalNet)}
            </p>
          </div>
        </div>
      </div>
      <div className="px-3 py-4 sm:px-5 sm:py-5">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => `${v}€`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="capitalize text-muted-foreground">{name}</span>
                      <span className="font-medium tabular-nums">{money(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="bruto" fill="var(--color-bruto)" radius={[6, 6, 2, 2]} />
            <Bar dataKey="neto" fill="var(--color-neto)" radius={[6, 6, 2, 2]} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}
