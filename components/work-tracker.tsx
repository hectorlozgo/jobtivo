"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MonthView } from "@/components/month-view"
import { WeekView } from "@/components/week-view"
import { DayEditor } from "@/components/day-editor"
import { SettingsPanel } from "@/components/settings-panel"
import { SummaryCards } from "@/components/summary-cards"
import { summarize } from "@/lib/calc"
import {
  type AppData,
  type DayEntry,
  type Settings,
  DEFAULT_DATA,
} from "@/lib/types"
import { exportJson, importJson, loadData, saveData } from "@/lib/storage"
import {
  addDays,
  addMonths,
  endOfMonth,
  formatLongDate,
  formatRangeShort,
  fromISO,
  monthName,
  startOfMonth,
  startOfWeek,
  toISO,
  weekDays,
} from "@/lib/dates"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  SlidersHorizontal,
  Upload,
} from "lucide-react"

type ViewMode = "mes" | "semana" | "dia"
type Tab = "calendario" | "tarifas"

function emptyEntry(iso: string): DayEntry {
  return { date: iso, category: "G1", hours: { normal: 0, extra: 0, festiva: 0, nocturna: 0 } }
}

function hasHours(entry: DayEntry): boolean {
  return Object.values(entry.hours).some((h) => h > 0)
}

export function WorkTracker() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA)
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>("calendario")
  const [view, setView] = useState<ViewMode>("mes")
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [selectedISO, setSelectedISO] = useState<string>(() => toISO(new Date()))
  const fileRef = useRef<HTMLInputElement>(null)

  // Carga inicial desde localStorage (JSON).
  useEffect(() => {
    setData(loadData())
    setMounted(true)
  }, [])

  // Persiste cualquier cambio.
  useEffect(() => {
    if (mounted) saveData(data)
  }, [data, mounted])

  const settings = data.settings
  const selectedEntry = data.entries[selectedISO] ?? emptyEntry(selectedISO)

  function updateEntry(entry: DayEntry) {
    setData((prev) => {
      const next = { ...prev, entries: { ...prev.entries } }
      if (hasHours(entry)) {
        next.entries[entry.date] = entry
      } else {
        delete next.entries[entry.date]
      }
      return next
    })
  }

  function clearDay(iso: string) {
    setData((prev) => {
      const entries = { ...prev.entries }
      delete entries[iso]
      return { ...prev, entries }
    })
  }

  function updateSettings(s: Settings) {
    setData((prev) => ({ ...prev, settings: s }))
  }

  function selectDay(iso: string) {
    setSelectedISO(iso)
    setCursor(fromISO(iso))
  }

  // Entradas dentro del periodo visible para el resumen.
  const periodEntries = useMemo(() => {
    const all = Object.values(data.entries)
    if (view === "mes") {
      const start = startOfMonth(cursor)
      const end = endOfMonth(cursor)
      return all.filter((e) => {
        const d = fromISO(e.date)
        return d >= start && d <= end
      })
    }
    if (view === "semana") {
      const isos = new Set(weekDays(cursor).map(toISO))
      return all.filter((e) => isos.has(e.date))
    }
    const sel = data.entries[selectedISO]
    return sel ? [sel] : []
  }, [data.entries, view, cursor, selectedISO])

  const summary = useMemo(() => summarize(periodEntries, settings), [periodEntries, settings])

  function navigate(dir: -1 | 1) {
    if (view === "mes") {
      setCursor((c) => addMonths(c, dir))
    } else if (view === "semana") {
      setCursor((c) => addDays(c, dir * 7))
    } else {
      const next = addDays(fromISO(selectedISO), dir)
      selectDay(toISO(next))
    }
  }

  function goToday() {
    const today = new Date()
    setCursor(today)
    setSelectedISO(toISO(today))
  }

  function periodLabel(): string {
    if (view === "mes") return monthName(cursor)
    if (view === "semana") {
      const start = startOfWeek(cursor)
      return formatRangeShort(start, addDays(start, 6))
    }
    return formatLongDate(fromISO(selectedISO))
  }

  function handleExport() {
    const blob = new Blob([exportJson(data)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `horas-trabajo-${toISO(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        setData(importJson(String(reader.result)))
      } catch {
        // Archivo no válido: se ignora.
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  if (!mounted) {
    return <div className="min-h-screen bg-background" aria-hidden="true" />
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Clock className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold leading-tight text-balance">Control de horas</h1>
            <p className="text-sm text-muted-foreground">Mozo · Especializado · Carretillero</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" />
            Importar
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={handleImport}
            aria-label="Importar datos JSON"
          />
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="calendario">
            <CalendarDays className="size-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="tarifas">
            <SlidersHorizontal className="size-4" />
            Tarifas e IRPF
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "tarifas" ? (
        <SettingsPanel settings={settings} onChange={updateSettings} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="mes">Mes</TabsTrigger>
                <TabsTrigger value="semana">Semana</TabsTrigger>
                <TabsTrigger value="dia">Día</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToday}>
                Hoy
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(-1)}
                  aria-label="Periodo anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(1)}
                  aria-label="Periodo siguiente"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <p className="text-base font-medium capitalize text-pretty">{periodLabel()}</p>

          <SummaryCards summary={summary} irpf={settings.irpf} />

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {view !== "dia" && (
              <Card className="overflow-hidden p-0">
                {view === "mes" ? (
                  <MonthView
                    cursor={cursor}
                    entries={data.entries}
                    settings={settings}
                    selectedISO={selectedISO}
                    onSelect={selectDay}
                  />
                ) : (
                  <WeekView
                    cursor={cursor}
                    entries={data.entries}
                    settings={settings}
                    selectedISO={selectedISO}
                    onSelect={selectDay}
                  />
                )}
              </Card>
            )}

            <Card className={view === "dia" ? "lg:col-span-2" : ""}>
              <div className="p-5">
                <DayEditor
                  dateISO={selectedISO}
                  entry={selectedEntry}
                  settings={settings}
                  onChange={updateEntry}
                  onClear={() => clearDay(selectedISO)}
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      <footer className="mt-auto pt-4 text-center text-xs text-muted-foreground">
        Los datos se guardan localmente en tu navegador (JSON). Usa Exportar para hacer copia de
        seguridad.
      </footer>
    </main>
  )
}
