'use client'

import { useEffect, useRef, useState } from 'react'
import { type DayEntry, type Settings } from '@/lib/types'
import { entryTotals, formatMoney } from '@/lib/calc'
import { hourColorVar } from '@/lib/hour-colors'
import { addMonths, isToday, monthGridDays, monthOnlyName, toISO, weekdayShort } from '@/lib/dates'

interface MonthViewProps {
  cursor: Date
  entries: Record<string, DayEntry>
  settings: Settings
  selectedISO: string
  onSelect: (iso: string) => void
  /** Cambia el mes visible (−1 anterior, +1 siguiente). */
  onNavigate: (dir: -1 | 1) => void
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`
}

function monthDir(from: Date, to: Date): -1 | 1 {
  return to.getFullYear() > from.getFullYear() ||
    (to.getFullYear() === from.getFullYear() && to.getMonth() > from.getMonth())
    ? 1
    : -1
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const SLIDE_MS = 280

export function MonthView({ cursor, entries, settings, selectedISO, onSelect, onNavigate }: MonthViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [displayCursor, setDisplayCursor] = useState(cursor)
  const [dragX, setDragX] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [dragging, setDragging] = useState(false)

  const gestureRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    lastX: number
    lastT: number
    velocity: number
    axis: 'h' | 'v' | null
  } | null>(null)
  const draggedRef = useRef(false)
  const skipPropAnimRef = useRef(false)
  const animatingRef = useRef(false)
  const displayRef = useRef(displayCursor)
  displayRef.current = displayCursor

  const prevMonth = addMonths(displayCursor, -1)
  const nextMonth = addMonths(displayCursor, 1)

  function viewportWidth(): number {
    return viewportRef.current?.offsetWidth || 1
  }

  function finishSlide(dir: -1 | 1, nextDisplay: Date, notifyParent: boolean) {
    if (animatingRef.current) return

    if (prefersReducedMotion()) {
      setDisplayCursor(nextDisplay)
      setDragX(0)
      if (notifyParent) {
        skipPropAnimRef.current = true
        onNavigate(dir)
      }
      return
    }

    const width = viewportWidth()
    animatingRef.current = true
    setAnimating(true)
    setDragX(-dir * width)

    window.setTimeout(() => {
      setDisplayCursor(nextDisplay)
      setAnimating(false)
      setDragX(0)
      animatingRef.current = false
      if (notifyParent) {
        skipPropAnimRef.current = true
        onNavigate(dir)
      }
    }, SLIDE_MS)
  }

  // Navegación externa (botones Hoy / chevrons).
  useEffect(() => {
    if (monthKey(cursor) === monthKey(displayCursor)) return

    if (skipPropAnimRef.current) {
      skipPropAnimRef.current = false
      setDisplayCursor(cursor)
      return
    }

    const months =
      (cursor.getFullYear() - displayCursor.getFullYear()) * 12 + (cursor.getMonth() - displayCursor.getMonth())

    if (Math.abs(months) !== 1 || prefersReducedMotion() || animatingRef.current) {
      setDisplayCursor(cursor)
      setDragX(0)
      setAnimating(false)
      animatingRef.current = false
      return
    }

    const dir = monthDir(displayCursor, cursor)
    finishSlide(dir, cursor, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor])

  useEffect(() => {
    return () => {
      // Limpia listeners si el componente se desmonta a mitad de gesto.
      gestureRef.current = null
    }
  }, [])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (animatingRef.current || e.button !== 0) return

    const now = performance.now()
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastT: now,
      velocity: 0,
      axis: null
    }
    draggedRef.current = false

    const onMove = (ev: PointerEvent) => {
      const g = gestureRef.current
      if (!g || ev.pointerId !== g.pointerId) return

      const dx = ev.clientX - g.startX
      const dy = ev.clientY - g.startY
      const t = performance.now()
      const dt = Math.max(t - g.lastT, 1)
      g.velocity = (ev.clientX - g.lastX) / dt
      g.lastX = ev.clientX
      g.lastT = t

      if (!g.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        g.axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
        if (g.axis === 'v') {
          // Scroll vertical: abandonamos el gesto horizontal.
          cleanup()
          setDragging(false)
          setDragX(0)
          return
        }
        setDragging(true)
      }

      if (g.axis !== 'h') return

      ev.preventDefault()
      if (Math.abs(dx) > 6) draggedRef.current = true

      const width = viewportWidth()
      const resisted = Math.abs(dx) > width ? Math.sign(dx) * (width + (Math.abs(dx) - width) * 0.18) : dx
      setDragX(resisted)
    }

    const onUp = (ev: PointerEvent) => {
      const g = gestureRef.current
      if (!g || ev.pointerId !== g.pointerId) return
      cleanup()

      const wasHorizontal = g.axis === 'h'
      setDragging(false)

      if (!wasHorizontal) {
        setDragX(0)
        return
      }

      const width = viewportWidth()
      const dx = ev.clientX - g.startX
      const threshold = Math.min(72, width * 0.18)
      const flick = g.velocity

      if (dx <= -threshold || flick < -0.45) {
        finishSlide(1, addMonths(displayRef.current, 1), true)
      } else if (dx >= threshold || flick > 0.45) {
        finishSlide(-1, addMonths(displayRef.current, -1), true)
      } else {
        setAnimating(true)
        setDragX(0)
        window.setTimeout(() => setAnimating(false), 220)
      }
    }

    function cleanup() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      gestureRef.current = null
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function handleSelect(iso: string) {
    // Tras un swipe, el click sintético no debe cambiar el día.
    if (draggedRef.current) return
    onSelect(iso)
  }

  return (
    <div className="flex flex-col select-none">
      <div className="border-b border-border/60 bg-muted/40 p-2">
        <p className="text-center font-heading text-md font-semibold tracking-tight">{monthOnlyName(displayCursor)}</p>
      </div>
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40 px-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="px-2 py-2 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
          >
            {weekdayShort(i)}
          </div>
        ))}
      </div>

      <div
        ref={viewportRef}
        className={`relative overflow-hidden ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ touchAction: dragging ? 'none' : 'pan-y' }}
        onPointerDown={onPointerDown}
        role="region"
        aria-label="Calendario mensual. Desliza horizontalmente para cambiar de mes."
      >
        <div
          className="flex w-[300%] will-change-transform"
          style={{
            transform: `translate3d(calc(-33.333% + ${dragX}px), 0, 0)`,
            transition: animating && !dragging ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
            // Evita que el botón reciba el click al soltar tras un swipe.
            pointerEvents: dragging ? 'none' : 'auto'
          }}
        >
          <MonthGrid
            cursor={prevMonth}
            entries={entries}
            settings={settings}
            selectedISO={selectedISO}
            onSelect={handleSelect}
            inert
          />
          <MonthGrid
            cursor={displayCursor}
            entries={entries}
            settings={settings}
            selectedISO={selectedISO}
            onSelect={handleSelect}
          />
          <MonthGrid
            cursor={nextMonth}
            entries={entries}
            settings={settings}
            selectedISO={selectedISO}
            onSelect={handleSelect}
            inert
          />
        </div>
      </div>
    </div>
  )
}

function MonthGrid({
  cursor,
  entries,
  settings,
  selectedISO,
  onSelect,
  inert
}: {
  cursor: Date
  entries: Record<string, DayEntry>
  settings: Settings
  selectedISO: string
  onSelect: (iso: string) => void
  inert?: boolean
}) {
  const days = monthGridDays(cursor)
  const currentMonth = cursor.getMonth()
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)

  return (
    <div className="grid w-1/3 shrink-0 grid-cols-7" aria-hidden={inert || undefined} inert={inert || undefined}>
      {days.map((day) => {
        const iso = toISO(day)
        const entry = entries[iso]
        const totals = entry ? entryTotals(entry, settings) : null
        const inMonth = day.getMonth() === currentMonth
        const selected = !inert && iso === selectedISO
        const today = isToday(day)
        const activeTypes = entry
          ? settings.hourTypes.filter((t) => (totals?.hoursByType[t.id] ?? entry.hours[t.id] ?? 0) > 0)
          : []
        const hasHours = Boolean(totals && totals.totalHours > 0)

        return (
          <button
            key={`${monthKey(cursor)}-${iso}`}
            type="button"
            onClick={() => onSelect(iso)}
            tabIndex={inert ? -1 : undefined}
            aria-pressed={selected}
            aria-label={`Día ${day.getDate()}${totals && totals.totalHours > 0 ? `, ${totals.totalHours} horas` : ''}`}
            className={`group flex min-h-[4.75rem] flex-col gap-1 border-b border-r border-border/50 p-1.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:min-h-24 sm:p-2 ${
              inMonth ? 'hover:bg-accent/45' : 'bg-muted/25 text-muted-foreground hover:bg-muted/40'
            } ${selected ? 'bg-accent/55 ring-2 ring-inset ring-primary' : ''} ${
              hasHours && inMonth && !selected ? 'bg-primary/[0.03]' : ''
            }`}
          >
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs tabular-nums transition-colors sm:size-7 ${
                today
                  ? 'bg-primary font-semibold text-primary-foreground shadow-sm'
                  : 'font-medium group-hover:bg-background/70'
              }`}
            >
              {day.getDate()}
            </span>
            {hasHours && (
              <span className="mt-auto flex flex-col gap-1">
                <span className="flex flex-wrap gap-0.5">
                  {activeTypes.map((t) => (
                    <span
                      key={t.id}
                      aria-hidden="true"
                      className="size-1.5 rounded-full"
                      style={{
                        backgroundColor: `var(${hourColorVar(t.id, settings.hourTypes)})`
                      }}
                    />
                  ))}
                </span>
                <span className="text-[11px] font-semibold tabular-nums leading-none">{totals!.totalHours} h</span>
                <span className="hidden text-[11px] tabular-nums leading-none text-primary sm:block">
                  {money(totals!.gross)}
                </span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
