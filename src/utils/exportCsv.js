/**
 * Small CSV helpers shared by every side-drawer "Export" button.
 *
 * A "sheet" is `{ title?, headers: string[], rows: any[][] }`. Several sheets can be written
 * to one file (blank line + title between them) so a drawer with a summary and a list exports
 * both in a single download. The file starts with a BOM so Excel reads Marathi text correctly.
 */

export function csvCell(value) {
  if (value == null) return ""
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function sheetsToCsv(sheets) {
  const parts = []
  for (const sheet of sheets || []) {
    if (!sheet) continue
    const lines = []
    if (sheet.title) lines.push(csvCell(sheet.title))
    if (sheet.headers?.length) lines.push(sheet.headers.map(csvCell).join(","))
    for (const row of sheet.rows || []) lines.push(row.map(csvCell).join(","))
    parts.push(lines.join("\r\n"))
  }
  return parts.join("\r\n\r\n")
}

/** `sowing-shed-A-2026-10-04.csv` style name; unsafe characters become dashes. */
export function exportFileName(base) {
  const safe =
    String(base || "export")
      .replace(/[^\w\u0900-\u097F.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "export"
  return `${safe}-${new Date().toISOString().slice(0, 10)}.csv`
}

export function downloadSheets(fileBase, sheets) {
  const csv = sheetsToCsv(sheets)
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = exportFileName(fileBase)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export function hasExportRows(sheets) {
  return (sheets || []).some((sheet) => (sheet?.rows || []).length > 0)
}
