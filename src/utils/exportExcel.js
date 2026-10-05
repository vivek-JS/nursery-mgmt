import * as XLSX from "xlsx"

/**
 * Excel (.xlsx) download helpers shared by every "Export" button.
 *
 * A "sheet" is `{ title?, headers: string[], rows: any[][] }`. Each sheet becomes its own worksheet
 * (the title is the tab name), with a header row, auto-sized columns and a filter on the header.
 * Numbers stay numbers so Excel can sum and sort them.
 */

export function hasExportRows(sheets) {
  return (sheets || []).some((sheet) => (sheet?.rows || []).length > 0)
}

/** `shed-stock-Shed-A-2026-10-04.xlsx` style name; unsafe characters become dashes. */
export function exportFileName(base, { stamp = true } = {}) {
  const safe =
    String(base || "export")
      .replace(/[^\w\u0900-\u097F.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "export"
  return `${safe}${stamp ? `-${new Date().toISOString().slice(0, 10)}` : ""}.xlsx`
}

/** Excel tab names: max 31 chars, none of \ / ? * [ ] :, and unique inside the workbook. */
function tabName(title, index, used) {
  let name =
    String(title || `Sheet ${index + 1}`)
      .replace(/[\\/?*[\]:]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 31) || `Sheet ${index + 1}`
  let suffix = 2
  while (used.has(name.toLowerCase())) {
    const tail = ` (${suffix++})`
    name = `${name.slice(0, 31 - tail.length)}${tail}`
  }
  used.add(name.toLowerCase())
  return name
}

function cellValue(value) {
  if (value == null) return ""
  if (typeof value === "number") return Number.isFinite(value) ? value : ""
  return value
}

function buildWorksheet(sheet) {
  const headers = sheet.headers || []
  const data = [headers, ...(sheet.rows || []).map((row) => row.map(cellValue))]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const columnCount = Math.max(headers.length, ...data.map((row) => row.length))
  ws["!cols"] = Array.from({ length: columnCount }, (_, col) => {
    const longest = data.reduce((max, row) => Math.max(max, String(row[col] ?? "").length), 0)
    return { wch: Math.min(48, Math.max(9, longest + 2)) }
  })
  if (headers.length && data.length > 1) {
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length - 1, c: columnCount - 1 } }) }
  }
  return ws
}

export function downloadSheetsXlsx(fileBase, sheets, options) {
  const wb = XLSX.utils.book_new()
  const used = new Set()
  const list = (sheets || []).filter(Boolean)
  list.forEach((sheet, index) => {
    XLSX.utils.book_append_sheet(wb, buildWorksheet(sheet), tabName(sheet.title, index, used))
  })
  XLSX.writeFile(wb, exportFileName(fileBase, options))
}

/**
 * Turns CSV text into an .xlsx download. Values are read as text first so mobile numbers (10+ digits),
 * IDs with leading zeros and dates are never mangled; short plain numbers (up to 9 digits) are then
 * turned back into real numbers so Excel can sort and sum them.
 */
export function downloadCsvTextAsXlsx(fileBase, csvText, options) {
  const wb = XLSX.read(csvText, { type: "string", raw: true })
  Object.values(wb.Sheets).forEach((ws) => {
    Object.keys(ws).forEach((ref) => {
      if (ref[0] === "!") return
      const cell = ws[ref]
      if (cell?.t === "s" && /^-?(?!0\d)\d{1,9}(\.\d+)?$/.test(String(cell.v).trim())) {
        cell.t = "n"
        cell.v = Number(cell.v)
        delete cell.w
      }
    })
  })
  XLSX.writeFile(wb, exportFileName(fileBase, options))
}

/** Same as above, for code that has an array of CSV lines (or arrays of lines). */
export function downloadCsvLinesAsXlsx(fileBase, lines, options) {
  downloadCsvTextAsXlsx(fileBase, [lines].flat(2).join("\n"), options)
}
