export const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString())

/**
 * Range delivery plants + backlog before range start (e.g. 500 + 700).
 * @param {number} inRangePlants — plants shown in table for selected date range
 */
export function formatRangePlusBacklogPlants(inRangePlants, dueSummary) {
  const range = Number(inRangePlants) || 0
  const backlog = Number(dueSummary?.pastDue?.plants) || 0
  if (!dueSummary?.pastDue) return fmt(range)
  if (range === 0 && backlog === 0) return "—"
  return `${fmt(range)} + ${fmt(backlog)}`
}

/** Summary chip / due chip primary text. */
export function formatDuePlus(dueSummary, { includeAllPastDue = false, inRangePlants } = {}) {
  if (!dueSummary?.inRange) return "—"
  const rangePlants = inRangePlants ?? dueSummary.inRange.plants
  if (includeAllPastDue && dueSummary.pastDue) {
    return formatRangePlusBacklogPlants(rangePlants, dueSummary)
  }
  return fmt(rangePlants)
}

export function duePlusCaption(dueSummary, { includeAllPastDue = false, inRangePlants } = {}) {
  if (!dueSummary?.inRange) return ""
  const rangePlants = inRangePlants ?? dueSummary.inRange.plants
  if (includeAllPastDue && dueSummary.pastDue) {
    return `${fmt(rangePlants)} plants in range · ${fmt(dueSummary.pastDue.plants)} plants backlog (before range)`
  }
  return `${fmt(dueSummary.inRange.orders)} orders · ${fmt(rangePlants)} plants in range`
}

/** Coerce API values (string or populated `{ id, name }`) to a safe render string. */
/** Mongo / API id: string, ObjectId, or `{ _id }` / `{ id }`. */
export function coerceMongoId(value) {
  if (value == null || value === "") return null
  if (typeof value === "string") {
    const s = value.trim()
    return /^[a-f\d]{24}$/i.test(s) ? s : null
  }
  if (typeof value === "object") {
    if (value.$oid && typeof value.$oid === "string") return coerceMongoId(value.$oid)
    return coerceMongoId(value._id ?? value.id)
  }
  return null
}

export function asDisplayLabel(value, fallback = "—") {
  if (value == null || value === "") return fallback
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (typeof value === "object") {
    if (typeof value.name === "string" && value.name) return value.name
    if (typeof value.label === "string" && value.label) return value.label
  }
  return fallback
}

export const DELIVERY_BUCKETS = [
  "accepted",
  "farmReady",
  "readyForDispatch",
  "dispatchProcess",
  "partiallyCompleted",
  "dispatched",
  "completed",
]

/** Pre-dispatch pipeline buckets summed into "Yet to dispatch". */
export const YET_TO_DISPATCH_BUCKETS = [
  "accepted",
  "farmReady",
  "readyForDispatch",
  "dispatchProcess",
  "partiallyCompleted",
  "other",
]

export function sumYetToDispatch(delivery) {
  if (!delivery) return { orders: 0, plants: 0 }
  let orders = 0
  let plants = 0
  for (const key of YET_TO_DISPATCH_BUCKETS) {
    orders += delivery[key]?.orders || 0
    plants += delivery[key]?.plants || 0
  }
  return { orders, plants }
}

export const DAILY_COLUMNS = [
  { key: "date", label: "Date", bgcolor: "#eceff1", width: 108 },
  { key: "booking", label: "Booking", bgcolor: "#e3f2fd", group: "booking" },
  { key: "deliveryTotal", label: "Delivery", bgcolor: "#e8f5e9", group: "delivery" },
  { key: "accepted", label: "Accepted", bgcolor: "#f1f8e9", group: "delivery" },
  { key: "farmReady", label: "Farm ready", bgcolor: "#fff8e1", group: "delivery" },
  { key: "readyForDispatch", label: "RFD", bgcolor: "#fff3e0", group: "delivery" },
  { key: "dispatchProcess", label: "In dispatch", bgcolor: "#fce4ec", group: "delivery" },
  { key: "partiallyCompleted", label: "Partial", bgcolor: "#f3e5f5", group: "delivery" },
  { key: "yetToDispatch", label: "Yet to dispatch", bgcolor: "#fff9c4", group: "delivery" },
  { key: "dispatched", label: "Dispatched", bgcolor: "#e0f2f1", group: "delivery" },
  { key: "vehicleDispatched", label: "Vehicle", bgcolor: "#c8e6c9", group: "delivery" },
  { key: "completed", label: "Completed", bgcolor: "#e8eaf6", group: "delivery" },
  { key: "unique", label: "Unique", bgcolor: "#ede7f6", width: 72 },
]

export const PLANT_ACCENT = [
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
  const s = asDisplayLabel(name, "Unknown")
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) % PLANT_ACCENT.length
  return PLANT_ACCENT[h]
}

export function getMetricForColumn(row, colKey) {
  if (colKey === "booking") return row.booking
  if (colKey === "deliveryTotal") return row.delivery?.total
  if (colKey === "yetToDispatch") return sumYetToDispatch(row.delivery)
  if (colKey === "vehicleDispatched") return row.delivery?.vehicleDispatched
  if (DELIVERY_BUCKETS.includes(colKey)) return row.delivery?.[colKey]
  return null
}

/** Per-row backlog metric for a delivery column (includeAllPastDue). */
export function getPastDueMetricForColumn(row, colKey) {
  if (!row?.pastDue) return null
  if (colKey === "deliveryTotal") return row.pastDue?.total
  if (colKey === "yetToDispatch") return sumYetToDispatch(row.pastDue)
  if (colKey === "vehicleDispatched") return row.pastDue?.vehicleDispatched
  if (DELIVERY_BUCKETS.includes(colKey)) return row.pastDue[colKey]
  return null
}

/** Cell-level range + backlog for delivery columns (not global dueSummary). */
export function buildCellDuePlus(row, colKey, inRangeMetric) {
  const pastDueMetric = getPastDueMetricForColumn(row, colKey)
  if (!pastDueMetric) return null
  const backlogPlants = Number(pastDueMetric.plants) || 0
  const backlogOrders = Number(pastDueMetric.orders) || 0
  if (backlogPlants === 0 && backlogOrders === 0) return null
  return {
    pastDue: pastDueMetric,
    inRange: { orders: inRangeMetric?.orders ?? 0 },
  }
}

/** Footer totals row: in-range delivery + backlog bucket from totals.pastDue. */
export function buildTotalsDuePlus(totals, colKey) {
  if (!totals?.pastDue) return null
  const inRange =
    colKey === "deliveryTotal"
      ? totals.delivery?.total
      : colKey === "yetToDispatch"
        ? sumYetToDispatch(totals.delivery)
        : colKey === "vehicleDispatched"
          ? totals.delivery?.vehicleDispatched
          : totals.delivery?.[colKey]
  const pastDue =
    colKey === "deliveryTotal"
      ? totals.pastDue?.total
      : colKey === "yetToDispatch"
        ? sumYetToDispatch(totals.pastDue)
        : colKey === "vehicleDispatched"
          ? totals.pastDue?.vehicleDispatched
          : totals.pastDue?.[colKey]
  if (!pastDue) return null
  const backlogPlants = Number(pastDue.plants) || 0
  const backlogOrders = Number(pastDue.orders) || 0
  if (backlogPlants === 0 && backlogOrders === 0) return null
  return { pastDue, inRange: { orders: inRange?.orders ?? 0 } }
}

export function isDeliveryMetricCol(colKey) {
  return colKey !== "booking" && colKey !== "unique" && colKey !== "date"
}

/** Daily / breakdown table delivery columns in display order (includes computed yetToDispatch). */
export const TABLE_DELIVERY_COL_KEYS = [
  "accepted",
  "farmReady",
  "readyForDispatch",
  "dispatchProcess",
  "partiallyCompleted",
  "yetToDispatch",
  "dispatched",
  "vehicleDispatched",
  "completed",
]

/** Delivery cell: in-range plants + backlog (global dueSummary or per-row buildCellDuePlus). */
export function formatDeliveryTotalDuePlus(duePlus, inRangePlants) {
  if (!duePlus?.pastDue) return null
  const range = Number(inRangePlants) || 0
  const backlog = Number(duePlus.pastDue.plants ?? duePlus.pastDue.total?.plants) || 0
  if (range === 0 && backlog === 0) return null
  const pastDueOrders = Number(duePlus.pastDue.orders ?? duePlus.pastDue.total?.orders) || 0
  const isPerCell =
    duePlus.inRange != null &&
    duePlus.pastDue.total == null &&
    typeof duePlus.pastDue.plants === "number"
  const secondary = isPerCell
    ? `${fmt(duePlus.inRange.orders)} in range · ${fmt(pastDueOrders)} backlog`
    : `${fmt(duePlus.inRange?.orders ?? 0)} due orders in range`
  return {
    primary: `${fmt(range)} + ${fmt(backlog)}`,
    secondary,
  }
}

export const BREAKDOWN_METRIC_COLS = [
  { key: "booking", label: "Booked", bgcolor: "#e3f2fd" },
  { key: "deliveryTotal", label: "Delivery", bgcolor: "#e8f5e9" },
  { key: "accepted", label: "Accepted", bgcolor: "#f1f8e9" },
  { key: "farmReady", label: "Farm ready", bgcolor: "#fff8e1" },
  { key: "readyForDispatch", label: "RFD", bgcolor: "#fff3e0" },
  { key: "dispatchProcess", label: "Dispatching", bgcolor: "#fce4ec" },
  { key: "partiallyCompleted", label: "Partial", bgcolor: "#f3e5f5" },
  { key: "yetToDispatch", label: "Yet to dispatch", bgcolor: "#fff9c4" },
  { key: "dispatched", label: "Out", bgcolor: "#e0f2f1" },
  { key: "vehicleDispatched", label: "Vehicle", bgcolor: "#c8e6c9" },
  { key: "completed", label: "Done", bgcolor: "#e8eaf6" },
]
