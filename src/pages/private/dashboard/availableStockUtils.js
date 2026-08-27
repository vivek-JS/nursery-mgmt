import moment from "moment"

/** Slot dates from API are typically DD-MM-YYYY (IST). */
const SLOT_DATE_INPUT_FORMATS = ["DD-MM-YYYY", "D-M-YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]

const PLANT_ACCENT = [
  "#2e7d32",
  "#1565c0",
  "#6a1b9a",
  "#e65100",
  "#00838f",
  "#c62828",
  "#4527a0",
  "#558b2f",
]

export function plantAccentFor(name = "") {
  const s = String(name || "Unknown")
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) % PLANT_ACCENT.length
  return PLANT_ACCENT[h]
}

export const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export const STATUS_META = {
  ok: {
    label: "Open",
    color: "success",
    bar: "#43a047",
    bg: "rgba(46, 125, 50, 0.12)",
    icon: "check",
  },
  low: {
    label: "Low stock",
    color: "warning",
    bar: "#fb8c00",
    bg: "rgba(251, 140, 0, 0.12)",
    icon: "warning",
  },
  full: {
    label: "Full",
    color: "default",
    bar: "#90a4ae",
    bg: "rgba(144, 164, 174, 0.15)",
    icon: "block",
  },
  overbooked: {
    label: "Overbooked",
    color: "error",
    bar: "#e53935",
    bg: "rgba(229, 57, 53, 0.12)",
    icon: "error",
  },
}

export function parseSlotDate(value) {
  if (value == null || value === "") return null
  const m = moment(String(value).trim(), SLOT_DATE_INPUT_FORMATS, true)
  return m.isValid() ? m : null
}

/** Display: 24-May-2025 */
export function formatSlotDate(value) {
  const m = parseSlotDate(value)
  if (m) return m.format("D-MMM-YYYY")
  return value ? String(value) : "—"
}

/** Compact range, e.g. 24 – 30-May-2025 or 24-May-2025 – 2-Jun-2025 */
export function formatSlotPeriod(startDay, endDay) {
  const start = parseSlotDate(startDay)
  const end = parseSlotDate(endDay)
  if (!start && !end) return "—"
  if (!start) return formatSlotDate(endDay)
  if (!end) return formatSlotDate(startDay)
  if (start.isSame(end, "day")) return start.format("D-MMM-YYYY")
  if (start.isSame(end, "month") && start.isSame(end, "year")) {
    return `${start.format("D")} – ${end.format("D-MMM-YYYY")}`
  }
  return `${start.format("D-MMM-YYYY")} – ${end.format("D-MMM-YYYY")}`
}

export function monthSortIndexFromRow(row) {
  const m = parseSlotDate(row?.startDay)
  if (m) return m.year() * 12 + m.month()
  const i = MONTH_OPTIONS.indexOf(row?.month)
  return i >= 0 ? i : 99
}

export function compareRowsBySlotDate(a, b) {
  const ma = parseSlotDate(a?.startDay)
  const mb = parseSlotDate(b?.startDay)
  if (ma && mb) {
    const d = ma.valueOf() - mb.valueOf()
    if (d !== 0) return d
  }
  const pc = String(a?.plantName || "").localeCompare(String(b?.plantName || ""))
  if (pc !== 0) return pc
  return String(a?.subtypeName || "").localeCompare(String(b?.subtypeName || ""))
}

export function sortStockRows(rows) {
  return [...(rows || [])].sort((a, b) => {
    const ma = monthSortIndexFromRow(a)
    const mb = monthSortIndexFromRow(b)
    if (ma !== mb) return ma - mb
    return compareRowsBySlotDate(a, b)
  })
}

export const SORT_OPTIONS = [
  { value: "date-asc", label: "Delivery date ↑" },
  { value: "date-desc", label: "Delivery date ↓" },
  { value: "plant-asc", label: "Plant A → Z" },
  { value: "plant-desc", label: "Plant Z → A" },
  { value: "subtype-asc", label: "Subtype A → Z" },
  { value: "subtype-desc", label: "Subtype Z → A" },
  { value: "available-desc", label: "Most available" },
  { value: "available-asc", label: "Least available" },
  { value: "actual-desc", label: "Most actual available" },
  { value: "shed-desc", label: "Most in shed" },
]

export function sortStockRowsBy(rows, sortKey = "date-asc") {
  const list = [...(rows || [])]
  const cmpDate = (a, b) => compareRowsBySlotDate(a, b)
  const cmpDateDesc = (a, b) => -cmpDate(a, b)

  switch (sortKey) {
    case "date-desc":
      return list.sort((a, b) => {
        const ma = monthSortIndexFromRow(a)
        const mb = monthSortIndexFromRow(b)
        if (ma !== mb) return mb - ma
        return cmpDateDesc(a, b)
      })
    case "plant-asc":
      return list.sort(
        (a, b) =>
          String(a.plantName).localeCompare(String(b.plantName)) ||
          String(a.subtypeName).localeCompare(String(b.subtypeName)) ||
          cmpDate(a, b)
      )
    case "plant-desc":
      return list.sort(
        (a, b) =>
          String(b.plantName).localeCompare(String(a.plantName)) ||
          String(a.subtypeName).localeCompare(String(b.subtypeName)) ||
          cmpDate(a, b)
      )
    case "subtype-asc":
      return list.sort(
        (a, b) =>
          String(a.subtypeName).localeCompare(String(b.subtypeName)) ||
          String(a.plantName).localeCompare(String(b.plantName)) ||
          cmpDate(a, b)
      )
    case "subtype-desc":
      return list.sort(
        (a, b) =>
          String(b.subtypeName).localeCompare(String(a.subtypeName)) ||
          String(a.plantName).localeCompare(String(b.plantName)) ||
          cmpDate(a, b)
      )
    case "available-desc":
      return list.sort(
        (a, b) =>
          (b.availablePlants || 0) - (a.availablePlants || 0) ||
          cmpDate(a, b)
      )
    case "available-asc":
      return list.sort(
        (a, b) =>
          (a.availablePlants || 0) - (b.availablePlants || 0) ||
          cmpDate(a, b)
      )
    case "actual-desc":
      return list.sort(
        (a, b) =>
          (b.actualAvailable || 0) - (a.actualAvailable || 0) ||
          cmpDate(a, b)
      )
    case "shed-desc":
      return list.sort(
        (a, b) =>
          (b.shedAvailableInShed || 0) - (a.shedAvailableInShed || 0) ||
          cmpDate(a, b)
      )
    case "date-asc":
    default:
      return sortStockRows(list)
  }
}

/** Unique plants / subtypes from rows for filter dropdowns */
export function extractStockFilterOptions(rows) {
  const plantsMap = new Map()
  const subtypesMap = new Map()
  for (const row of rows || []) {
    if (row.plantId) plantsMap.set(String(row.plantId), row.plantName || "Unknown")
    const sk = `${row.plantId}:${row.subtypeId}`
    if (row.subtypeId) {
      subtypesMap.set(sk, {
        key: sk,
        plantId: String(row.plantId),
        subtypeId: String(row.subtypeId),
        subtypeName: row.subtypeName || "Other",
        plantName: row.plantName,
      })
    }
  }
  const plants = [...plantsMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const subtypes = [...subtypesMap.values()].sort((a, b) => {
    const pc = a.plantName.localeCompare(b.plantName)
    return pc !== 0 ? pc : a.subtypeName.localeCompare(b.subtypeName)
  })
  return { plants, subtypes }
}

export function filterStockRows(rows, { plantId, subtypeId } = {}) {
  let out = rows || []
  if (plantId) out = out.filter((r) => String(r.plantId) === String(plantId))
  if (subtypeId) out = out.filter((r) => String(r.subtypeId) === String(subtypeId))
  return out
}

/** Today in IST as YYYY-MM-DD (for date inputs min / default range). */
export function todayIsoIST() {
  return moment().utcOffset(330).startOf("day").format("YYYY-MM-DD")
}

/** Key for month + year chip, e.g. "May-2026". */
export function monthYearKey(monthName, year) {
  return `${monthName}-${year}`
}

/** All calendar months for a year (chip list). */
export function getAllMonthsForYear(year) {
  const y = Number(year) || moment().utcOffset(330).year()
  return MONTH_OPTIONS.map((month) => ({
    month,
    year: y,
    key: monthYearKey(month, y),
  }))
}

/** Month is entirely before the current month (IST). */
export function isPastCalendarMonth(monthName, year, today = moment().utcOffset(330)) {
  const idx = MONTH_OPTIONS.indexOf(monthName)
  if (idx < 0) return false
  const monthEnd = moment().year(Number(year)).month(idx).endOf("month")
  return monthEnd.isBefore(today.clone().startOf("month"), "day")
}

/** Current month + next 2 (IST), e.g. May, June, July. */
export function getNextThreeCalendarMonths(from = moment().utcOffset(330)) {
  const result = []
  let m = from.clone().startOf("month")
  for (let i = 0; i < 3; i++) {
    const monthName = MONTH_OPTIONS[m.month()]
    result.push({
      month: monthName,
      year: m.year(),
      key: monthYearKey(monthName, m.year()),
    })
    m = m.add(1, "month")
  }
  return result
}

export function formatMonthKeysLabel(monthKeys) {
  if (!monthKeys?.length) return ""
  const parts = monthKeys.map((key) => {
    const i = key.lastIndexOf("-")
    const month = key.slice(0, i)
    const y = key.slice(i + 1)
    return `${month.slice(0, 3)} ${y}`
  })
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`
  return `${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]}`
}

export function filterRowsByMonthKeys(rows, monthKeys) {
  if (!monthKeys?.length) return rows || []
  const set = new Set(monthKeys)
  return (rows || []).filter((row) => {
    const m = parseSlotDate(row.startDay)
    const monthName = row.month || (m ? MONTH_OPTIONS[m.month()] : null)
    const y = m ? m.year() : null
    if (!monthName || y == null) return false
    return set.has(monthYearKey(monthName, y))
  })
}

/** Default window: today → end of 3rd month ahead (no past). */
export function getDefaultThreeMonthRange() {
  const start = moment().utcOffset(330).startOf("day")
  const end = start.clone().add(3, "months").subtract(1, "day")
  return {
    from: start.format("YYYY-MM-DD"),
    to: end.format("YYYY-MM-DD"),
    year: start.year(),
  }
}

export function getYearsInIsoRange(fromIso, toIso, fallbackYear) {
  if (!fromIso || !toIso) return [fallbackYear]
  const fromY = moment(fromIso, "YYYY-MM-DD", true).year()
  const toY = moment(toIso, "YYYY-MM-DD", true).year()
  if (!Number.isFinite(fromY) || !Number.isFinite(toY)) return [fallbackYear]
  const years = []
  for (let y = fromY; y <= toY; y++) years.push(y)
  return years.length ? years : [fallbackYear]
}

/** Parse YYYY-MM-DD from date input */
export function parseInputDate(iso) {
  if (!iso) return null
  const m = moment(String(iso).trim(), ["YYYY-MM-DD"], true)
  return m.isValid() ? m.startOf("day") : null
}

export function formatInputDateLabel(iso) {
  const m = parseInputDate(iso)
  return m ? m.format("D-MMM-YYYY") : ""
}

export function yearFromIso(iso) {
  const m = parseInputDate(iso)
  return m ? m.year() : null
}

/** Slot delivery period overlaps [from, to] (inclusive, by day) */
export function slotOverlapsDateRange(row, fromIso, toIso) {
  const rangeFrom = parseInputDate(fromIso)
  const rangeTo = parseInputDate(toIso)
  if (!rangeFrom && !rangeTo) return true
  if (rangeFrom && rangeTo && rangeFrom.isAfter(rangeTo)) return false

  const slotStart = parseSlotDate(row?.startDay)
  const slotEnd = parseSlotDate(row?.endDay) || slotStart
  if (!slotStart) return false
  const end = slotEnd || slotStart

  const fromMs = rangeFrom ? rangeFrom.valueOf() : -Infinity
  const toMs = rangeTo ? rangeTo.clone().endOf("day").valueOf() : Infinity
  const startMs = slotStart.startOf("day").valueOf()
  const endMs = end.endOf("day").valueOf()

  return startMs <= toMs && endMs >= fromMs
}

export function filterRowsByDateRange(rows, fromIso, toIso) {
  if (!fromIso && !toIso) return rows || []
  return (rows || []).filter((r) => slotOverlapsDateRange(r, fromIso, toIso))
}

/**
 * Merge slots in range by subtype — sums available plants, counts slots.
 */
export function combineSlotsBySubtype(rows, rangeFromIso, rangeToIso, rangeLabelOverride) {
  const rangeLabel =
    rangeLabelOverride ||
    (rangeFromIso && rangeToIso
      ? `${formatInputDateLabel(rangeFromIso)} – ${formatInputDateLabel(rangeToIso)}`
      : rangeFromIso
        ? `From ${formatInputDateLabel(rangeFromIso)}`
        : rangeToIso
          ? `Until ${formatInputDateLabel(rangeToIso)}`
          : "Selected period")

  const map = new Map()
  for (const row of rows || []) {
    const key = String(row.subtypeId || row.subtypeName || "unknown")
    if (!map.has(key)) {
      map.set(key, {
        plantId: row.plantId,
        plantName: row.plantName,
        subtypeId: row.subtypeId,
        subtypeName: row.subtypeName,
        slotId: `combined-${key}`,
        _combined: true,
        _slotCount: 0,
        _underlyingSlots: [],
        availablePlants: 0,
        startDay: row.startDay,
        endDay: row.endDay,
        month: row.month,
      })
    }
    const agg = map.get(key)
    agg.availablePlants += Number(row.availablePlants) || 0
    agg._slotCount += 1
    agg._underlyingSlots.push(row)

    const s = parseSlotDate(row.startDay)
    const e = parseSlotDate(row.endDay) || s
    const aggStart = parseSlotDate(agg.startDay)
    const aggEnd = parseSlotDate(agg.endDay)
    if (s && (!aggStart || s.isBefore(aggStart, "day"))) agg.startDay = row.startDay
    if (e && (!aggEnd || e.isAfter(aggEnd, "day"))) agg.endDay = row.endDay
  }

  return [...map.values()]
    .map((agg) => ({
      ...agg,
      _rangeLabel: rangeLabel,
    }))
    .sort((a, b) => String(a.subtypeName).localeCompare(String(b.subtypeName)))
}

/** Month section title, e.g. "May 2026" with optional delivery span. */
export function formatMonthSectionLabel(monthName, year, groupRows = []) {
  const firstDate = groupRows.map((r) => parseSlotDate(r.startDay)).filter(Boolean).sort((a, b) => a - b)[0]
  const y = year || firstDate?.year() || null
  const title = y ? `${monthName} ${y}` : monthName
  const dates = groupRows.map((r) => parseSlotDate(r.startDay)).filter(Boolean)
  if (!dates.length) return { title, subtitle: null }
  dates.sort((a, b) => a.valueOf() - b.valueOf())
  const endDates = groupRows.map((r) => parseSlotDate(r.endDay)).filter(Boolean)
  endDates.sort((a, b) => a.valueOf() - b.valueOf())
  const from = dates[0].format("D-MMM-YYYY")
  const to = (endDates[endDates.length - 1] || dates[dates.length - 1]).format("D-MMM-YYYY")
  return {
    title,
    subtitle: `${from} – ${to} · ${groupRows.length} slot${groupRows.length === 1 ? "" : "s"}`,
  }
}

export function buildGroupedDisplayRows(rows, year, { groupByMonth = true } = {}) {
  const sorted = sortStockRows(rows)
  if (!groupByMonth) {
    return sorted.map((r) => ({ ...r, key: r.slotId }))
  }
  const groups = new Map()
  for (const row of sorted) {
    const m = parseSlotDate(row.startDay)
    const key = row.month || m?.format("MMMM") || "Other"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  const monthKeys = [...groups.keys()].sort((a, b) => {
    const ra = groups.get(a)[0]
    const rb = groups.get(b)[0]
    return monthSortIndexFromRow(ra) - monthSortIndexFromRow(rb)
  })
  const flat = []
  for (const monthName of monthKeys) {
    const groupRows = groups.get(monthName)
    const monthAvail = groupRows.reduce((s, r) => s + (r.availablePlants || 0), 0)
    const { title, subtitle } = formatMonthSectionLabel(monthName, year, groupRows)
    flat.push({
      _isHeader: true,
      month: monthName,
      monthTitle: title,
      monthSubtitle: subtitle,
      monthAvail,
      key: `h-${monthName}-${year}`,
    })
    for (const r of groupRows) flat.push({ ...r, key: r.slotId })
  }
  return flat
}

/** Month sections for accordion UI (preserves row order from caller) */
export function groupRowsIntoMonthSections(rows, year) {
  const groups = new Map()
  for (const row of rows || []) {
    const m = parseSlotDate(row.startDay)
    const key = row.month || m?.format("MMMM") || "Other"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  const monthKeys = [...groups.keys()].sort((a, b) => {
    const ra = groups.get(a)[0]
    const rb = groups.get(b)[0]
    return monthSortIndexFromRow(ra) - monthSortIndexFromRow(rb)
  })
  return monthKeys.map((monthName) => {
    const sectionRows = groups.get(monthName)
    const monthAvail = sectionRows.reduce((s, r) => s + (r.availablePlants || 0), 0)
    const { title, subtitle } = formatMonthSectionLabel(monthName, year, sectionRows)
    return {
      id: `${monthName}-${year}`,
      monthName,
      title,
      subtitle,
      monthAvail,
      slotCount: sectionRows.length,
      rows: sectionRows,
    }
  })
}

export const fmt = (n) =>
  n == null || Number.isNaN(Number(n)) ? "—" : Number(n).toLocaleString("en-IN")

export const STOCK_PREFILL_KEY = "nurseryOrderPrefillFromStock"

export function saveStockPrefill(row) {
  if (!row) return
  sessionStorage.setItem(
    STOCK_PREFILL_KEY,
    JSON.stringify({
      initialPlantId: row.plantId,
      initialSubtypeId: row.subtypeId,
      initialSlotId: row.slotId,
      initialStartDay: row.startDay,
    })
  )
}

export function readAndClearStockPrefill() {
  try {
    const raw = sessionStorage.getItem(STOCK_PREFILL_KEY)
    sessionStorage.removeItem(STOCK_PREFILL_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Roll up rows by plant for summary cards */
/** Count slots per availability status for summary chips */
export function countByStatus(rows) {
  const counts = { ok: 0, low: 0, full: 0, overbooked: 0 }
  for (const row of rows || []) {
    const key = counts[row?.status] !== undefined ? row.status : "ok"
    counts[key] += 1
  }
  return counts
}

export function rollupByPlant(rows) {
  const map = new Map()
  for (const row of rows || []) {
    const key = row.plantId || row.plantName
    if (!map.has(key)) {
      map.set(key, {
        plantId: row.plantId,
        plantName: row.plantName,
        available: 0,
        booked: 0,
        capacity: 0,
        slotCount: 0,
        openSlots: 0,
      })
    }
    const agg = map.get(key)
    agg.available += row.availablePlants || 0
    agg.booked += row.bookedPlants || 0
    agg.capacity += row.totalPlants || 0
    agg.slotCount += 1
    if ((row.availablePlants || 0) > 0) agg.openSlots += 1
  }
  return [...map.values()].sort((a, b) => b.available - a.available)
}

export function stockRowsToCsv(rows) {
  const header = [
    "Plant",
    "Subtype",
    "Month",
    "Start",
    "End",
    "Slot Available",
    "Booked",
    "To Dispatch",
    "Actual Plants",
    "Actual Available",
    "In Shed",
    "Ready",
    "Batches",
    "Capacity",
    "Utilization %",
    "Status",
  ]
  const lines = rows.map((r) =>
    [
      r.plantName,
      r.subtypeName,
      r.month,
      formatSlotDate(r.startDay),
      formatSlotDate(r.endDay),
      r.availablePlants,
      r.totalBookedPlants ?? r.bookedPlants,
      r.remainingToDispatch,
      r.actualPlants,
      r.actualAvailable,
      r.shedAvailableInShed,
      r.actualReadyPlants,
      r.linkedBatchCount,
      r.totalPlants,
      r.utilizationPct,
      r.status,
    ]
      .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`)
      .join(",")
  )
  return [header.join(","), ...lines].join("\n")
}

export function downloadStockCsv(rows, year) {
  const blob = new Blob([stockRowsToCsv(rows)], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `available-stock-${year}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const DASHBOARD_TAB_KEY = "dashboardMainTab"
