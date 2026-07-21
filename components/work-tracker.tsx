"use client"

import { useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MonthView } from "@/components/month-view"
import { WeekView } from "@/components/week-view"
import { DayEditor } from "@/components/day-editor"
import { SettingsPanel } from "@/components/settings-panel"
import { SummaryCards } from "@/components/summary-cards"
import { YearChart } from "@/components/year-chart"
import { summarize } from "@/lib/calc"
import { buildExport, exportCsv, exportExcel, exportPdf } from "@/lib/export"
import { useAppData } from "@/lib/use-app-data"
import { sanitizeData } from "@/lib/validation"
import {
  type CategoryId,
  type DayEntry,
} from "@/lib/types"
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
  FileSpreadsheet,
  FileText,
  FileType,
  SlidersHorizontal,
  Upload,
} from "lucide-react"

type ViewMode = "mes" | "semana" | "dia"
type Tab = "calendario" | "tarifas"

function emptyEntry(iso: string, category: CategoryId): DayEntry {
  return { date: iso, category, hours: { normal: 0, extra: 0, festiva: 0, nocturna: 0 } }
}

export function WorkTracker() {
  const { data, isLoading, saveEntry, removeEntry, saveMany, saveSettings, replaceAll } =
    useAppData()
  const [tab, setTab] = useState<Tab>("calendario")
  const [view, setView] = useState<ViewMode>("mes")
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [selectedISO, setSelectedISO] = useState<string>(() => toISO(new Date()))
  const fileRef = useRef<HTMLInputElement>(null)

  const settings = data.settings
  const selectedExists = Boolean(data.entries[selectedISO])
  const selectedEntry =
    data.entries[selectedISO] ?? emptyEntry(selectedISO, settings.defaultCategory)

  function updateEntry(entry: DayEntry) {
    void saveEntry(entry)
  }

  function clearDay(iso: string) {
    void removeEntry(iso)
  }

  // Copia la categoría y horas del día indicado a lunes-viernes de su semana.
  function fillWeekdays(template: DayEntry) {
    if (!Object.values(template.hours).some((h) => h > 0)) return
    const start = startOfWeek(fromISO(template.date))
    const entries: DayEntry[] = []
    for (let i = 0; i < 5; i++) {
      const iso = toISO(addDays(start, i))
      entries.push({ date: iso, category: template.category, hours: { ...template.hours } })
    }
    void saveMany(entries)
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

  // Construye el paquete de exportación con las entradas del periodo visible.
  function currentBundle() {
    return buildExport(periodEntries, settings, periodLabel())
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = sanitizeData(JSON.parse(String(reader.result)))
        void replaceAll(parsed)
      } catch {
        // Archivo no válido: se ignora.
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando datos…</p>
      </div>
    )
  }

  const hasData = periodEntries.some((e) => Object.values(e.hours).some((h) => h > 0))

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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" disabled={!hasData} />}
            >
              <Download className="size-4" />
              Exportar
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCsv(currentBundle())}>
                <FileText className="size-4" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportExcel(currentBundle())}>
                <FileSpreadsheet className="size-4" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportPdf(currentBundle())}>
                <FileType className="size-4" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <SettingsPanel settings={settings} onChange={(s) => void saveSettings(s)} />
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
                  exists={selectedExists}
                  settings={settings}
                  onSave={updateEntry}
                  onClear={() => clearDay(selectedISO)}
                  onFillWeekdays={fillWeekdays}
                />
              </div>
            </Card>
          </div>

          <YearChart
            year={(view === "dia" ? fromISO(selectedISO) : cursor).getFullYear()}
            entries={data.entries}
            settings={settings}
          />
        </div>
      )}

      <footer className="mt-auto pt-4 text-center text-xs text-muted-foreground">
        Los datos se guardan en una base de datos SQLite en el servidor. Exporta a CSV, Excel o PDF
        para compartir o archivar.
      </footer>
    </main>
  )
}
