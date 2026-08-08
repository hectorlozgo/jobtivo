"use client"

// Exportación de registros a CSV, Excel (xlsx) y PDF.
// Todo se genera en el cliente a partir de datos ya saneados.

import { entryTotals, summarize, round2, formatMoney } from "@/lib/calc"
import { type DayEntry, type Settings, categoryLabel } from "@/lib/types"
import { formatLongDate, fromISO } from "@/lib/dates"

interface ExportBundle {
  headers: string[]
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
  const hourTypes = settings.hourTypes
  const headers = [
    "Fecha",
    "Puesto",
    ...hourTypes.map((t) => `${t.label} (h)`),
    "Descanso (min)",
    "Total horas",
    `Bruto (${settings.currency})`,
  ]

  const sorted = [...entries]
    .filter((e) => Object.values(e.hours).some((h) => h > 0))
    .sort((a, b) => a.date.localeCompare(b.date))

  const rows = sorted.map((e) => {
    const t = entryTotals(e, settings)
    return [
      formatLongDate(fromISO(e.date)),
      categoryLabel(settings, e.category),
      ...hourTypes.map((ht) => round2(t.hoursByType[ht.id] ?? 0)),
      Math.round(t.breakMinutesApplied),
      round2(t.totalHours),
      round2(t.gross),
    ]
  })

  const s = summarize(sorted, settings)
  const totalBreak = sorted.reduce(
    (acc, e) => acc + entryTotals(e, settings).breakMinutesApplied,
    0,
  )
  const totalsRow = [
    "TOTAL",
    "",
    ...hourTypes.map((ht) => round2(s.hoursByType[ht.id] ?? 0)),
    Math.round(totalBreak),
    round2(s.totalHours),
    round2(s.gross),
  ]

  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)
  const taxLabel = settings.taxLabel || "Retención"
  const summaryRows: [string, string][] = [
    ["Días trabajados", String(s.days)],
    ["Total horas", round2(s.totalHours).toFixed(2)],
    ["Bruto", money(s.gross)],
    [`${taxLabel} (${settings.taxPercent}%)`, `-${money(s.taxAmount)}`],
    ["Neto", money(s.net)],
  ]

  return {
    headers,
    rows,
    totalsRow,
    summaryRows,
    filenameBase: `horas-${slug(periodLabel)}`,
    title: `Control de horas · ${periodLabel}`,
  }
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

/** Horas/importe a 2 decimales; descanso en enteros. Evita basura de float al stringify. */
function formatExportNumber(
  value: string | number,
  colIndex: number,
  headers: string[],
): string {
  if (typeof value !== "number") return value
  const header = headers[colIndex] ?? ""
  if (header === "Descanso (min)") return String(Math.round(value))
  return round2(value).toFixed(2)
}

function escapeCsv(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// ---- CSV ----
export function exportCsv(bundle: ExportBundle) {
  const cell = (v: string | number, colIndex: number) =>
    escapeCsv(formatExportNumber(v, colIndex, bundle.headers))

  const lines: string[] = []
  lines.push(bundle.headers.map((h) => escapeCsv(h)).join(";"))
  for (const row of bundle.rows) lines.push(row.map(cell).join(";"))
  lines.push(bundle.totalsRow.map(cell).join(";"))
  lines.push("")
  for (const [k, v] of bundle.summaryRows)
    lines.push(`${escapeCsv(k)};${escapeCsv(v)}`)
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
    bundle.headers,
    ...bundle.rows,
    bundle.totalsRow,
    [],
    ["Resumen"],
    ...bundle.summaryRows,
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws["!cols"] = bundle.headers.map((_, i) => ({
    wch: i === 0 || i === 1 ? 22 : 12,
  }))
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

  const toPdfRow = (row: (string | number)[]) =>
    row.map((v, i) => formatExportNumber(v, i, bundle.headers))

  // columnStyles solo aplica al body; head/foot necesitan didParseCell.
  autoTable(doc, {
    startY: 76,
    head: [bundle.headers],
    body: bundle.rows.map(toPdfRow),
    foot: [toPdfRow(bundle.totalsRow)],
    styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [34, 120, 90], textColor: 255, valign: "middle" },
    footStyles: {
      fillColor: [230, 240, 234],
      textColor: 0,
      fontStyle: "bold",
      valign: "middle",
    },
    columnStyles: Object.fromEntries(
      bundle.headers.map((_, i) => [
        i,
        i < 2 ? { halign: "left" as const } : { halign: "right" as const },
      ]),
    ),
    didParseCell: (data) => {
      if (data.column.index >= 2) data.cell.styles.halign = "right"
    },
  })

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
