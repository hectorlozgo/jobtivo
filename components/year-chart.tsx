"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { entryTotals, formatEur, round2 } from "@/lib/calc"
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
  const { data, totalGross, totalNet, totalHours } = useMemo(() => {
    const months = MONTH_LABELS.map((label) => ({ label, bruto: 0, neto: 0, horas: 0 }))
    let totalGross = 0
    let totalNet = 0
    let totalHours = 0

    for (const entry of Object.values(entries)) {
      const d = fromISO(entry.date)
      if (d.getFullYear() !== year) continue
      const { gross, totalHours: h } = entryTotals(entry, settings)
      const net = gross - gross * (settings.irpf / 100)
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
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Resumen anual {year}</CardTitle>
            <CardDescription>Importe bruto y neto acumulado por mes.</CardDescription>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Horas</p>
              <p className="font-semibold tabular-nums">{totalHours} h</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bruto</p>
              <p className="font-semibold tabular-nums">{formatEur(totalGross)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Neto</p>
              <p className="font-semibold tabular-nums text-primary">{formatEur(totalNet)}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} />
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
                      <span className="font-medium tabular-nums">{formatEur(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="bruto" fill="var(--color-bruto)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="neto" fill="var(--color-neto)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
