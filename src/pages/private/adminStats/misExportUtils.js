import { DELIVERY_BUCKETS, asDisplayLabel } from "./misConstants"
import { downloadCsvLinesAsXlsx } from "utils/exportExcel"

export function breakdownRowsToCsv(sectionTitle, rows) {
  const lines = []
  lines.push(sectionTitle)
  lines.push(
    [
      "Name",
      "Phone",
      "JobTitle",
      "Booking_Orders",
      "Booking_Plants",
      "Delivery_Total_Orders",
      "Delivery_Total_Plants",
      ...DELIVERY_BUCKETS.flatMap((b) => [`${b}_Orders`, `${b}_Plants`]),
    ].join(",")
  )
  for (const row of rows || []) {
    const d = row.delivery
    lines.push(
      [
        `"${asDisplayLabel(row.personName)}"`,
        `"${row.phoneNumber || ""}"`,
        `"${row.jobTitle || ""}"`,
        row.booking.orders,
        row.booking.plants,
        d.total.orders,
        d.total.plants,
        ...DELIVERY_BUCKETS.flatMap((b) => [d[b].orders, d[b].plants]),
      ].join(",")
    )
  }
  return lines
}

/** Escape a CSV cell: wrap in quotes and double any inner quotes. */
function csvCell(value) {
  if (value == null) return ""
  const s = String(value)
  return `"${s.replace(/"/g, '""')}"`
}

/**
 * Build sales-sheet CSV lines from the backend payload.
 * @param {{ key: string, label: string }[]} columns
 * @param {object[]} rows
 */
export function salesSheetRowsToCsv(columns, rows, totalsRow) {
  const cols = columns || []
  const lines = []
  lines.push(cols.map((c) => csvCell(c.label)).join(","))
  for (const row of rows || []) {
    lines.push(cols.map((c) => csvCell(row[c.key])).join(","))
  }
  if (totalsRow) {
    lines.push(cols.map((c) => csvCell(totalsRow[c.key])).join(","))
  }
  return lines
}

export function downloadCsv(filename, lineArrays) {
  // Name kept for existing callers; the file is now a real Excel workbook.
  downloadCsvLinesAsXlsx(String(filename).replace(/\.csv$/i, ""), lineArrays, { stamp: false })
}
