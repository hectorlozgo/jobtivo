'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MonthView } from '@/components/month-view'
import { WeekView } from '@/components/week-view'
import { DayEditor } from '@/components/day-editor'
import { SettingsPanel } from '@/components/settings-panel'
import { SummaryCards } from '@/components/summary-cards'
import { LiquidationPanel } from '@/components/liquidation-panel'
import { YearChart } from '@/components/year-chart'
import { summarize } from '@/lib/calc'
import { buildExport, exportCsv, exportPdf } from '@/lib/export'
import { useAppData } from '@/lib/use-app-data'
import { type DayEntry, type Settings, emptyHours } from '@/lib/types'
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
  FileText,
  FileType,
  Receipt,
  SlidersHorizontal
} from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

type ViewMode = 'mes' | 'semana' | 'dia'
type Tab = 'calendario' | 'tarifas' | 'liquidacion'

function emptyEntry(iso: string, settings: Settings): DayEntry {
  return {
    date: iso,
    category: settings.defaultCategory,
    hours: emptyHours(settings.hourTypes),
    breakApplied: settings.applyBreakByDefault,
    breakMinutes: settings.breakMinutes
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
  const selectedEntry = data.entries[selectedISO] ?? emptyEntry(selectedISO, settings)

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
        breakMinutes: template.breakMinutes
      })
    }
    void saveMany(entries)
  }

  function selectDay(iso: string) {
    setSelectedISO(iso)
    setCursor(fromISO(iso))
  }

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

  const monthEntries = useMemo(() => {
    const all = Object.values(data.entries)
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    return all.filter((e) => {
      const d = fromISO(e.date)
      return d >= start && d <= end
    })
  }, [data.entries, cursor])

  const liquidacionSummary = useMemo(() => summarize(monthEntries, settings), [monthEntries, settings])

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

  function currentBundle() {
    return buildExport(periodEntries, settings, periodLabel())
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="animate-fade-up flex flex-col items-center gap-4">
          <span className="brand-mark flex size-12 items-center justify-center rounded-2xl text-primary-foreground">
            <Clock className="size-5" />
          </span>
          <div className="flex flex-col items-center gap-2">
            <p className="font-heading text-base font-semibold">Jobtime</p>
            <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/70" />
            </div>
            <p className="text-sm text-muted-foreground">Cargando tus horas…</p>
          </div>
        </div>
      </div>
    )
  }

  const hasData = periodEntries.some((e) => Object.values(e.hours).some((h) => h > 0))

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col gap-7 px-4 py-6 sm:px-6 lg:gap-8 lg:py-10">
      <header
        id="inicio"
        className="animate-fade-up sticky top-3 z-30 scroll-mt-6 rounded-2xl border border-border/50 bg-card/70 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="brand-mark flex size-11 items-center justify-center rounded-2xl text-primary-foreground">
              <Clock className="size-5" />
            </span>
            <div>
              <h1 className="font-heading text-xl font-semibold tracking-tight text-balance sm:text-2xl">Jobtime</h1>
              <p className="text-sm text-muted-foreground">
                {settings.categories.map((c) => c.short || c.name).join(' · ') || 'Puestos y tarifas'}
              </p>
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
                <DropdownMenuItem onClick={() => void exportPdf(currentBundle())}>
                  <FileType className="size-4" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="animate-fade-up stagger-1">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="h-10 rounded-xl bg-muted/80 p-1">
            <TabsTrigger value="calendario" className="rounded-lg px-3">
              <CalendarDays className="size-4" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="liquidacion" className="rounded-lg px-3">
              <Receipt className="size-4" />
              Liquidación
            </TabsTrigger>
            <TabsTrigger value="tarifas" className="rounded-lg px-3">
              <SlidersHorizontal className="size-4" />
              Tarifas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === 'tarifas' ? (
        <div key="tarifas" className="animate-fade-up stagger-2">
          <SettingsPanel settings={settings} onChange={(s) => void saveSettings(s)} />
        </div>
      ) : tab === 'liquidacion' ? (
        <div key="liquidacion" className="animate-fade-up stagger-2">
          <LiquidationPanel
            summary={liquidacionSummary}
            settings={settings}
            periodLabel={monthName(cursor)}
            onChangeSettings={(s) => void saveSettings(s)}
            onNavigate={(dir) => setCursor((c) => addMonths(c, dir))}
            onToday={goToday}
          />
        </div>
      ) : (
        <div key="calendario" className="animate-fade-up stagger-2 flex flex-col gap-6 lg:gap-7">
          <div className="surface-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                <TabsList className="h-9 rounded-xl bg-muted/90 p-1">
                  <TabsTrigger value="mes" className="rounded-lg px-3">
                    Mes
                  </TabsTrigger>
                  <TabsTrigger value="semana" className="rounded-lg px-3">
                    Semana
                  </TabsTrigger>
                  <TabsTrigger value="dia" className="rounded-lg px-3">
                    Día
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="font-heading text-lg font-semibold capitalize tracking-tight text-pretty sm:text-xl">
                {periodLabel()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToday} className="rounded-xl">
                Hoy
              </Button>
              <div className="flex items-center rounded-xl border border-border/70 bg-background/60 p-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => navigate(-1)}
                  aria-label="Periodo anterior"
                  className="rounded-lg"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => navigate(1)}
                  aria-label="Periodo siguiente"
                  className="rounded-lg"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <SummaryCards summary={summary} settings={settings} />

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {view !== 'dia' && (
              <div className="surface-panel overflow-hidden">
                {view === 'mes' ? (
                  <MonthView
                    cursor={cursor}
                    entries={data.entries}
                    settings={settings}
                    selectedISO={selectedISO}
                    onSelect={selectDay}
                    onNavigate={navigate}
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
              </div>
            )}

            <div className={`surface-panel p-5 sm:p-6 ${view === 'dia' ? 'lg:col-span-2' : ''}`}>
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
        className="mt-auto flex flex-wrap items-center justify-center gap-1 border-t border-border/50 pt-5 text-xs text-muted-foreground"
      >
        <Button variant="ghost" size="xs" onClick={() => goToTab('calendario')} className="rounded-lg">
          <CalendarDays className="size-3.5" />
          Calendario
        </Button>
        <Button variant="ghost" size="xs" onClick={() => goToTab('tarifas')} className="rounded-lg">
          <SlidersHorizontal className="size-3.5" />
          Tarifas
        </Button>
        <Button variant="ghost" size="xs" onClick={() => goToTab('liquidacion')} className="rounded-lg">
          <Receipt className="size-3.5" />
          Liquidación
        </Button>
        <Button variant="ghost" size="xs" onClick={goToYearChart} className="rounded-lg">
          <BarChart3 className="size-3.5" />
          Resumen anual
        </Button>
        <Button variant="ghost" size="xs" onClick={scrollToTop} className="rounded-lg">
          <ArrowUp className="size-3.5" />
          Arriba
        </Button>
      </nav>

      {showTop && (
        <Button
          variant="outline"
          size="icon"
          className="animate-fade-in fixed right-4 bottom-4 z-40 rounded-2xl border-border/60 bg-card/90 shadow-lg backdrop-blur-md sm:right-6 sm:bottom-6"
          onClick={scrollToTop}
          aria-label="Volver arriba"
        >
          <ArrowUp className="size-4" />
        </Button>
      )}
    </main>
  )
}
