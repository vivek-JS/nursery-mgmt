import * as XLSX from "xlsx"

/**
 * Excel (.xlsx) download helpers shared by every "Export" button.
 *
 * A "sheet" is `{ title?, headers: string[], rows: any[][] }`. Each sheet becomes its own worksheet
 * (the title is the tab name), with a header row, auto-sized columns and a filter on the header.
 * Leave `headers` empty for a free-form sheet (e.g. a summary) with no header row or filter.
 *
 * Every cell is written with a real Excel type so filters, sorting and sums work:
 * - Dates (Date / moment / dayjs objects, ISO timestamps, or text such as 17-10-2026, 17/10/2026,
 *   2026-10-17, 17-Oct-2026, 17 Oct 2026, with or without a time) become date cells shown as
 *   dd-mm-yyyy (or dd-mm-yyyy hh:mm AM/PM). Timestamps are read in IST.
 * - Numbers, and number-like text such as "1,23,456", "₹1,250.50" or "12.5%", become numbers.
 * - Mobile numbers, long IDs and codes with leading zeros stay text, so Excel never turns them
 *   into 9.88E+09 or drops the zeros.
 */

const IST_OFFSET_MS = 330 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)

const DATE_FMT = "dd-mm-yyyy"
const DATETIME_FMT = "dd-mm-yyyy hh:mm AM/PM"

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12
}

const TIME_PART = String.raw`(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap])\.?\s?m\.?)?)?`
const DMY_NUMERIC = new RegExp(String.raw`^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})${TIME_PART}$`, "i")
const YMD_NUMERIC = new RegExp(String.raw`^(\d{4})[-/](\d{1,2})[-/](\d{1,2})${TIME_PART}$`, "i")
const DMY_MONTH_NAME = new RegExp(
  String.raw`^(\d{1,2})[-\s]([a-z]{3})[a-z]*\.?,?[-\s](\d{4})${TIME_PART}$`,
  "i"
)
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i
const ISO_HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i

const NUMBER_TEXT =
  /^(-)?\s*(₹|rs\.?)?\s*(-)?\s*(\d{1,3}(?:,\d{2,3})+|0|[1-9]\d{0,8})(\.\d+)?\s*(%)?$/i
const VALID_GROUPING = /^(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})$/
const KEEP_AS_TEXT = /^(?:\+?\d{10,}|0\d+)$/

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

function serialFromParts(y, m, d, hh = 0, mm = 0, ss = 0) {
  return Math.round(((Date.UTC(y, m - 1, d, hh, mm, ss) - EXCEL_EPOCH_MS) / DAY_MS) * 86400) / 86400
}

function isValidParts(y, m, d, hh = 0, mm = 0, ss = 0) {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || hh > 23 || mm > 59 || ss > 59) return false
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function dateCell(y, m, d, time) {
  if (!isValidParts(y, m, d, ...(time || []))) return null
  if (!time) return { t: "n", v: serialFromParts(y, m, d), z: DATE_FMT, width: 10 }
  return { t: "n", v: serialFromParts(y, m, d, ...time), z: DATETIME_FMT, width: 19 }
}

/**
 * A point in time. Midnight in IST (how most dates are saved) or midnight UTC (date-only values
 * parsed as UTC) is written as a plain date; anything else as an IST date + time.
 */
function instantCell(ms) {
  if (!Number.isFinite(ms)) return null
  const ist = new Date(ms + IST_OFFSET_MS)
  if (ms % DAY_MS === 0 || (ms + IST_OFFSET_MS) % DAY_MS === 0) {
    const day = ms % DAY_MS === 0 ? new Date(ms) : ist
    return dateCell(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate())
  }
  return dateCell(ist.getUTCFullYear(), ist.getUTCMonth() + 1, ist.getUTCDate(), [
    ist.getUTCHours(),
    ist.getUTCMinutes(),
    ist.getUTCSeconds()
  ])
}

function timeParts(hh, mm, ss, ampm) {
  if (hh == null) return null
  let hours = Number(hh)
  if (ampm) {
    if (hours < 1 || hours > 12) return [99, 0, 0]
    hours = (hours % 12) + (ampm.toLowerCase() === "p" ? 12 : 0)
  }
  return [hours, Number(mm), Number(ss || 0)]
}

function parseDateText(text) {
  if (ISO_TIMESTAMP.test(text)) {
    if (ISO_HAS_ZONE.test(text)) return instantCell(Date.parse(text))
    const [datePart, timePart] = text.split("T")
    const [y, m, d] = datePart.split("-").map(Number)
    const [hh, mm, ss] = timePart.split(":").map((p) => Math.floor(Number(p)))
    return dateCell(y, m, d, hh || mm || ss ? [hh, mm, ss || 0] : null)
  }
  let match = DMY_NUMERIC.exec(text)
  if (match) {
    const [, d, m, y, hh, mm, ss, ampm] = match
    return dateCell(Number(y), Number(m), Number(d), timeParts(hh, mm, ss, ampm))
  }
  match = YMD_NUMERIC.exec(text)
  if (match) {
    const [, y, m, d, hh, mm, ss, ampm] = match
    return dateCell(Number(y), Number(m), Number(d), timeParts(hh, mm, ss, ampm))
  }
  match = DMY_MONTH_NAME.exec(text)
  if (match) {
    const [, d, mon, y, hh, mm, ss, ampm] = match
    const m = MONTHS[mon.toLowerCase()]
    return m ? dateCell(Number(y), m, Number(d), timeParts(hh, mm, ss, ampm)) : null
  }
  return null
}

function parseNumberText(text) {
  const match = NUMBER_TEXT.exec(text)
  if (!match) return null
  const [, minusBefore, currency, minusAfter, intPart, fraction = "", percent] = match
  if ((currency && percent) || (minusBefore && minusAfter)) return null
  const grouped = intPart.includes(",")
  if (grouped && !VALID_GROUPING.test(intPart)) return null
  let value = Number(intPart.replace(/,/g, "") + fraction)
  if (!Number.isFinite(value)) return null
  if (minusBefore || minusAfter) value = -value
  const decimals = fraction ? ".00" : ""
  if (percent) return { t: "n", v: value / 100, z: `0${decimals}%`, width: text.length }
  if (currency) return { t: "n", v: value, z: `"₹"#,##0${decimals}`, width: text.length + 1 }
  if (grouped) return { t: "n", v: value, z: `#,##0${decimals}`, width: text.length }
  return { t: "n", v: value, width: text.length }
}

function textCell(text) {
  return { t: "s", v: text, width: text.length }
}

function looksLikePhoneOrId(value) {
  return /^(?:[6-9]\d{9}|91[6-9]\d{9}|\d{12,16})$/.test(String(Math.abs(value)))
}

/** Turns any export value into a typed SheetJS cell (plus a `width` hint), or null for blank. */
function toCell(value) {
  if (value == null) return null
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    if (Number.isInteger(value) && looksLikePhoneOrId(value)) {
      return { ...textCell(String(value)), z: "@" }
    }
    return { t: "n", v: value, width: String(value).length }
  }
  if (typeof value === "boolean") return { t: "b", v: value, width: 5 }
  if (value instanceof Date) return instantCell(value.getTime())
  if (typeof value === "object" && typeof value.toDate === "function") {
    const date = value.toDate()
    return date instanceof Date ? instantCell(date.getTime()) : null
  }
  const raw = String(value)
  const text = raw.trim()
  if (!text) return null
  if (KEEP_AS_TEXT.test(text)) return { ...textCell(text), z: "@" }
  return parseNumberText(text) || parseDateText(text) || textCell(raw)
}

function buildWorksheet(sheet, { autofilter = true } = {}) {
  const headers = sheet.headers || []
  const body = sheet.rows || []
  const ws = {}
  const widths = []
  let lastCol = Math.max(headers.length - 1, 0)

  const put = (r, c, cell) => {
    if (!cell) return
    const { width, ...rest } = cell
    ws[XLSX.utils.encode_cell({ r, c })] = rest
    widths[c] = Math.max(widths[c] || 0, width || 0)
    lastCol = Math.max(lastCol, c)
  }

  headers.forEach((label, c) => put(0, c, label == null || label === "" ? null : textCell(String(label))))
  const offset = headers.length ? 1 : 0
  body.forEach((row, r) => (row || []).forEach((value, c) => put(r + offset, c, toCell(value))))

  const lastRow = Math.max(body.length + offset - 1, 0)
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } })
  ws["!cols"] = Array.from({ length: lastCol + 1 }, (_, c) => ({
    wch: Math.min(48, Math.max(9, (widths[c] || 0) + 2))
  }))
  if (autofilter && headers.length && body.length) {
    ws["!autofilter"] = { ref: ws["!ref"] }
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

/** RFC 4180 CSV → rows of strings (quoted commas, quotes and line breaks are kept intact). */
function parseCsv(csvText) {
  const text = String(csvText || "").replace(/^\uFEFF/, "")
  const rows = []
  let row = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch !== '"') field += ch
      else if (text[i + 1] === '"') {
        field += '"'
        i++
      } else quoted = false
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += ch
  }
  if (field !== "" || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/**
 * Turns CSV text into an .xlsx download with the same typed cells as `downloadSheetsXlsx`.
 * The first line is the header; it gets a filter when it is a plain table header (2+ named columns).
 */
export function downloadCsvTextAsXlsx(fileBase, csvText, options) {
  const [headers = [], ...rows] = parseCsv(csvText)
  const isTable = headers.length > 1 && headers.every((h) => String(h).trim())
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildWorksheet({ headers, rows }, { autofilter: isTable }), "Sheet1")
  XLSX.writeFile(wb, exportFileName(fileBase, options))
}

/** Same as above, for code that has an array of CSV lines (or arrays of lines). */
export function downloadCsvLinesAsXlsx(fileBase, lines, options) {
  downloadCsvTextAsXlsx(fileBase, [lines].flat(2).join("\n"), options)
}

/** For API calls that return a CSV file (string, Blob or ArrayBuffer response body). */
export async function downloadCsvResponseAsXlsx(fileBase, data, options) {
  let text = data
  if (typeof Blob !== "undefined" && data instanceof Blob) text = await data.text()
  else if (data instanceof ArrayBuffer) text = new TextDecoder("utf-8").decode(data)
  downloadCsvTextAsXlsx(fileBase, typeof text === "string" ? text : String(text ?? ""), options)
}
