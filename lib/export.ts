"use client"

// Exportación de registros a CSV, Excel (xlsx) y PDF.
// Todo se genera en el cliente a partir de datos ya saneados.

import { entryTotals, summarize, round2 } from "@/lib/calc"
import {
  type DayEntry,
  type Settings,
  CATEGORIES,
  HOUR_TYPES,
} from "@/lib/types"
import { formatLongDate, fromISO } from "@/lib/dates"

const CATEGORY_NAME: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, `${c.name} (${c.short})`]),
)

const HEADERS = [
  "Fecha",
  "Categoría",
  "Normal (h)",
  "Extra (h)",
  "Festiva (h)",
  "Nocturna (h)",
  "Total horas",
  "Bruto (€)",
]

interface ExportBundle {
  rows: (string | number)[][]
  totalsRow: (string | number)[]
  summaryRows: [string, string][]
  filenameBase: string
  title: string
}

// Prepara filas ordenadas por fecha y la fila de totales + resumen.
export function buildExport(
  entries: DayEntry[],
  settings: Settings,
  periodLabel: string,
): ExportBundle {
  const sorted = [...entries]
    .filter((e) => Object.values(e.hours).some((h) => h > 0))
    .sort((a, b) => a.date.localeCompare(b.date))

  const rows = sorted.map((e) => {
    const t = entryTotals(e, settings)
    return [
      formatLongDate(fromISO(e.date)),
      CATEGORY_NAME[e.category] ?? e.category,
      e.hours.normal,
      e.hours.extra,
      e.hours.festiva,
      e.hours.nocturna,
      t.totalHours,
      round2(t.gross),
    ]
  })

  const s = summarize(sorted, settings)
  const totalsRow = [
    "TOTAL",
    "",
    s.hoursByType.normal,
    s.hoursByType.extra,
    s.hoursByType.festiva,
    s.hoursByType.nocturna,
    s.totalHours,
    s.gross,
  ]

  const summaryRows: [string, string][] = [
    ["Días trabajados", String(s.days)],
    ["Total horas", String(s.totalHours)],
    ["Bruto", eur(s.gross)],
    [`IRPF (${settings.irpf}%)`, `-${eur(s.irpfAmount)}`],
    ["Neto", eur(s.net)],
  ]

  return {
    rows,
    totalsRow,
    summaryRows,
    filenameBase: `horas-${slug(periodLabel)}`,
    title: `Control de horas · ${periodLabel}`,
  }
}

function eur(n: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n)
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---- CSV ----
export function exportCsv(bundle: ExportBundle) {
  const escape = (v: string | number) => {
    const str = String(v)
    return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const lines: string[] = []
  lines.push(HEADERS.map(escape).join(";"))
  for (const row of bundle.rows) lines.push(row.map(escape).join(";"))
  lines.push(bundle.totalsRow.map(escape).join(";"))
  lines.push("")
  for (const [k, v] of bundle.summaryRows) lines.push(`${escape(k)};${escape(v)}`)
  // BOM para que Excel abra bien los acentos y el euro.
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  })
  download(blob, `${bundle.filenameBase}.csv`)
}

// ---- Excel (xlsx) ----
export async function exportExcel(bundle: ExportBundle) {
  const XLSX = await import("xlsx")
  const aoa: (string | number)[][] = [
    [bundle.title],
    [],
    HEADERS,
    ...bundle.rows,
    bundle.totalsRow,
    [],
    ["Resumen"],
    ...bundle.summaryRows,
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Horas")
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  download(
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${bundle.filenameBase}.xlsx`,
  )
}

// ---- PDF ----
export async function exportPdf(bundle: ExportBundle) {
  const { default: jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })

  doc.setFontSize(16)
  doc.text(bundle.title, 40, 40)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Generado el ${formatLongDate(new Date())}`, 40, 58)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 76,
    head: [HEADERS],
    body: bundle.rows.map((r) => r.map(String)),
    foot: [bundle.totalsRow.map(String)],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [34, 120, 90], textColor: 255 },
    footStyles: { fillColor: [230, 240, 234], textColor: 0, fontStyle: "bold" },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  })

  // Tabla de resumen debajo.
  const afterTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  const y = (afterTable?.finalY ?? 76) + 24
  autoTable(doc, {
    startY: y,
    body: bundle.summaryRows,
    theme: "plain",
    styles: { fontSize: 11, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 160 },
      1: { halign: "right", cellWidth: 140 },
    },
    tableWidth: 300,
  })

  doc.save(`${bundle.filenameBase}.pdf`)
}
