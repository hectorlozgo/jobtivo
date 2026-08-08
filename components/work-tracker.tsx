'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MonthView } from '@/components/month-view'
import { WeekView } from '@/components/week-view'
import { DayEditor } from '@/components/day-editor'
import { SettingsPanel } from '@/components/settings-panel'
import { SummaryCards } from '@/components/summary-cards'
import { YearChart } from '@/components/year-chart'
import { summarize } from '@/lib/calc'
import { buildExport, exportCsv, exportExcel, exportPdf } from '@/lib/export'
import { useAppData } from '@/lib/use-app-data'
import { type CategoryId, type DayEntry } from '@/lib/types'
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
  weekDays
} from '@/lib/dates'
import {
  ArrowUp,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  SlidersHorizontal
} from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

type ViewMode = 'mes' | 'semana' | 'dia'
type Tab = 'calendario' | 'tarifas'

function emptyEntry(iso: string, category: CategoryId, breakApplied: boolean): DayEntry {
  return {
    date: iso,
    category,
    hours: { normal: 0, extra: 0, festiva: 0, nocturna: 0 },
    breakApplied,
  }
}

export function WorkTracker() {
  const { data, isLoading, saveEntry, removeEntry, saveMany, saveSettings } = useAppData()
  const [tab, setTab] = useState<Tab>('calendario')
  const [view, setView] = useState<ViewMode>('mes')
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [selectedISO, setSelectedISO] = useState<string>(() => toISO(new Date()))
  const [showTop, setShowTop] = useState(false)

  const settings = data.settings
  const selectedExists = Boolean(data.entries[selectedISO])
  const selectedEntry =
    data.entries[selectedISO] ??
    emptyEntry(selectedISO, settings.defaultCategory, settings.applyBreakByDefault)

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 320)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goToTab(next: Tab) {
    setTab(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goToYearChart() {
    setTab('calendario')
    // Espera al render si venimos de otra pestaña.
    window.setTimeout(() => {
      document.getElementById('resumen-anual')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

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
      entries.push({
        date: iso,
        category: template.category,
        hours: { ...template.hours },
        breakApplied: template.breakApplied,
      })
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
    if (view === 'mes') {
      const start = startOfMonth(cursor)
      const end = endOfMonth(cursor)
      return all.filter((e) => {
        const d = fromISO(e.date)
        return d >= start && d <= end
      })
    }
    if (view === 'semana') {
      const isos = new Set(weekDays(cursor).map(toISO))
      return all.filter((e) => isos.has(e.date))
    }
    const sel = data.entries[selectedISO]
    return sel ? [sel] : []
  }, [data.entries, view, cursor, selectedISO])

  const summary = useMemo(() => summarize(periodEntries, settings), [periodEntries, settings])

  function navigate(dir: -1 | 1) {
    if (view === 'mes') {
      setCursor((c) => addMonths(c, dir))
    } else if (view === 'semana') {
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
    if (view === 'mes') return monthName(cursor)
    if (view === 'semana') {
      const start = startOfWeek(cursor)
      return formatRangeShort(start, addDays(start, 6))
    }
    return formatLongDate(fromISO(selectedISO))
  }

  // Construye el paquete de exportación con las entradas del periodo visible.
  function currentBundle() {
    return buildExport(periodEntries, settings, periodLabel())
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
      <header id="inicio" className="flex flex-col gap-4 scroll-mt-6 sm:flex-row sm:items-center sm:justify-between">
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
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={!hasData} />}>
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
          <UserMenu />
          <ThemeToggle />
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

      {tab === 'tarifas' ? (
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
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Periodo anterior">
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Periodo siguiente">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <p className="text-base font-medium capitalize text-pretty">{periodLabel()}</p>

          <SummaryCards summary={summary} irpf={settings.irpf} />

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {view !== 'dia' && (
              <Card className="overflow-hidden p-0">
                {view === 'mes' ? (
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

            <Card className={view === 'dia' ? 'lg:col-span-2' : ''}>
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

          <div id="resumen-anual" className="scroll-mt-6">
            <YearChart
              year={(view === 'dia' ? fromISO(selectedISO) : cursor).getFullYear()}
              entries={data.entries}
              settings={settings}
            />
          </div>
        </div>
      )}

      <nav
        aria-label="Accesos rápidos"
        className="mt-auto flex flex-wrap items-center justify-center gap-1 border-t border-border/60 pt-4 text-xs text-muted-foreground"
      >
        <Button variant="ghost" size="xs" onClick={() => goToTab('calendario')}>
          <CalendarDays className="size-3.5" />
          Calendario
        </Button>
        <Button variant="ghost" size="xs" onClick={() => goToTab('tarifas')}>
          <SlidersHorizontal className="size-3.5" />
          Tarifas
        </Button>
        <Button variant="ghost" size="xs" onClick={goToYearChart}>
          <BarChart3 className="size-3.5" />
          Resumen anual
        </Button>
        <Button variant="ghost" size="xs" onClick={scrollToTop}>
          <ArrowUp className="size-3.5" />
          Arriba
        </Button>
      </nav>

      {showTop && (
        <Button
          variant="outline"
          size="icon"
          className="fixed right-4 bottom-4 z-40 shadow-sm sm:right-6 sm:bottom-6"
          onClick={scrollToTop}
          aria-label="Volver arriba"
        >
          <ArrowUp className="size-4" />
        </Button>
      )}
    </main>
  )
}
