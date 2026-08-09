export function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

export function addDaysYmd(ymd, days) {
  if (!ymd) return "—"
  const [y, m, d] = String(ymd).split("-").map((n) => parseInt(n, 10))
  if (!y || !m || !d) return "—"
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + Number(days || 0))
  const dd = String(dt.getDate()).padStart(2, "0")
  const mm = String(dt.getMonth() + 1).padStart(2, "0")
  return `${dd}-${mm}-${dt.getFullYear()}`
}

/** sowDate YMD + days → YMD */
export function addDaysToYmd(ymd, days) {
  if (!ymd) return ""
  const [y, m, d] = String(ymd).split("-").map((n) => parseInt(n, 10))
  if (!y || !m || !d) return ""
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + Number(days || 0))
  const dd = String(dt.getDate()).padStart(2, "0")
  const mm = String(dt.getMonth() + 1).padStart(2, "0")
  return `${dt.getFullYear()}-${mm}-${dd}`
}

export function ymdToDdMm(ymd) {
  if (!ymd) return "—"
  const [y, m, d] = String(ymd).split("-")
  if (!y || !m || !d) return String(ymd)
  return `${d}-${m}-${y}`
}

/** Date | ISO | DD-MM-YYYY → YYYY-MM-DD */
export function toYmd(value) {
  if (!value) return ""
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  if (typeof value === "string") {
    const dmy = value.match(/^(\d{2})-(\d{2})-(\d{4})$/)
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  }
  try {
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return ""
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  } catch {
    return ""
  }
}

/** Whole days from sowYmd → readyYmd (can be 0). */
export function daysBetweenYmd(fromYmd, readyYmd) {
  const a = toYmd(fromYmd)
  const b = toYmd(readyYmd)
  if (!a || !b) return null
  const [y1, m1, d1] = a.split("-").map(Number)
  const [y2, m2, d2] = b.split("-").map(Number)
  const t1 = Date.UTC(y1, m1 - 1, d1)
  const t2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((t2 - t1) / 86400000)
}

export function fmtDeliveryLabel(value) {
  const ymd = toYmd(value)
  if (!ymd) return "No date"
  return ymdToDdMm(ymd)
}

/** Default packets from plants + seed conversion factor (matches admin-direct-sow API). */
export function calcDefaultPacketsUsed(plants, conversionFactor) {
  const p = Math.max(0, Number(plants) || 0)
  if (!p) return ""
  const cf = Number(conversionFactor) || 0
  if (cf > 0) return String(Math.ceil(p / cf))
  return "0"
}

/** Group orders by delivery YMD ascending. */
export function groupOrdersByDeliveryDate(orders = []) {
  const map = new Map()
  for (const o of orders) {
    const key = toYmd(o.deliveryDate) || "_none"
    if (!map.has(key)) {
      map.set(key, {
        deliveryKey: key,
        label: fmtDeliveryLabel(o.deliveryDate),
        orders: [],
        plants: 0,
      })
    }
    const g = map.get(key)
    g.orders.push(o)
    g.plants += Number(o.plants) || 0
  }
  return [...map.values()].sort((a, b) => {
    if (a.deliveryKey === "_none") return 1
    if (b.deliveryKey === "_none") return -1
    return a.deliveryKey.localeCompare(b.deliveryKey)
  })
}

/** YYYY-MM from YMD or _none */
export function monthKeyFromDelivery(key) {
  if (!key || key === "_none") return "_none"
  const ymd = toYmd(key)
  if (!ymd) return "_none"
  return ymd.slice(0, 7)
}

export function fmtMonthLabel(monthKey) {
  if (!monthKey || monthKey === "_none") return "No date"
  const [y, m] = monthKey.split("-").map(Number)
  if (!y || !m) return monthKey
  const dt = new Date(y, m - 1, 1)
  return dt.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

/** Group orders by delivery month (YYYY-MM), days inside each month. */
export function groupOrdersByDeliveryMonth(orders = []) {
  const dayGroups = groupOrdersByDeliveryDate(orders)
  const map = new Map()
  for (const dg of dayGroups) {
    const mk = monthKeyFromDelivery(dg.deliveryKey)
    if (!map.has(mk)) {
      map.set(mk, {
        monthKey: mk,
        label: fmtMonthLabel(mk),
        orders: [],
        plants: 0,
        dayCount: 0,
        days: [],
      })
    }
    const g = map.get(mk)
    g.orders.push(...dg.orders)
    g.plants += dg.plants
    g.dayCount += 1
    g.days.push(dg)
  }
  return [...map.values()].sort((a, b) => {
    if (a.monthKey === "_none") return 1
    if (b.monthKey === "_none") return -1
    return a.monthKey.localeCompare(b.monthKey)
  })
}

/** Sort delivery day buckets ascending (_none last). */
function sortDayGroups(list) {
  return [...list].sort((a, b) => {
    if (a.deliveryKey === "_none") return 1
    if (b.deliveryKey === "_none") return -1
    return a.deliveryKey.localeCompare(b.deliveryKey)
  })
}

/** Roll day buckets into months (includes slot-only days with 0 orders). */
export function rollupDayGroupsToMonths(dayGroups = []) {
  const map = new Map()
  for (const dg of dayGroups) {
    const mk = monthKeyFromDelivery(dg.deliveryKey)
    if (!map.has(mk)) {
      map.set(mk, {
        monthKey: mk,
        label: fmtMonthLabel(mk),
        orders: [],
        plants: 0,
        dayCount: 0,
        days: [],
      })
    }
    const g = map.get(mk)
    g.orders.push(...(dg.orders || []))
    g.plants += Number(dg.plants) || 0
    g.dayCount += 1
    g.days.push(dg)
  }
  return [...map.values()].sort((a, b) => {
    if (a.monthKey === "_none") return 1
    if (b.monthKey === "_none") return -1
    return a.monthKey.localeCompare(b.monthKey)
  })
}

/**
 * Order delivery days + calendar slot days (0-order days for excess sow).
 */
export function mergeOrderAndSlotDays(orders = [], slotDays = []) {
  const map = new Map()
  for (const dg of groupOrdersByDeliveryDate(orders)) {
    map.set(dg.deliveryKey, { ...dg, noOrders: false })
  }
  for (const sd of slotDays) {
    const key = sd.deliveryKey || toYmd(sd.startDay)
    if (!key) continue
    if (!map.has(key)) {
      map.set(key, {
        deliveryKey: key,
        label: fmtDeliveryLabel(key),
        orders: [],
        plants: 0,
        slotId: sd.slotId,
        startDay: sd.startDay,
        endDay: sd.endDay,
        totalBookedPlants: Number(sd.totalBookedPlants) || 0,
        primarySowed: Number(sd.primarySowed) || 0,
        officeSowed: Number(sd.officeSowed) || 0,
        slotReadyDays: Number(sd.plantReadyDays) || 0,
        noOrders: true,
      })
    } else {
      const g = map.get(key)
      if (sd.slotId) g.slotId = sd.slotId
      if (sd.startDay) g.startDay = sd.startDay
      if (sd.endDay) g.endDay = sd.endDay
      g.totalBookedPlants = Number(sd.totalBookedPlants) || g.totalBookedPlants || 0
      g.primarySowed = Number(sd.primarySowed) || 0
      g.officeSowed = Number(sd.officeSowed) || 0
      g.slotReadyDays = Number(sd.plantReadyDays) || g.slotReadyDays || 0
    }
  }
  return sortDayGroups([...map.values()])
}

/** DD-MM-YYYY → YYYY-MM-DD */
export function ddMmToYmd(str) {
  if (!str) return ""
  const m = String(str).match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return toYmd(str)
}

export function fmtSlotLabel(startDay, endDay) {
  const a = ddMmToYmd(startDay)
  const b = ddMmToYmd(endDay || startDay)
  if (!a) return "No slot"
  if (!b || a === b) return ymdToDdMm(a)
  return `${ymdToDdMm(a)} – ${ymdToDdMm(b)}`
}

export function monthKeyFromSlot(startDay) {
  const ymd = ddMmToYmd(startDay)
  if (!ymd) return "_none"
  return ymd.slice(0, 7)
}

/**
 * Slot-wise cards: one card per calendar slot; orders matched by bookingSlot.
 */
export function buildSlotCards(orders = [], slots = []) {
  const map = new Map()

  for (const s of slots) {
    const key = String(s.slotId)
    if (!key || key === "undefined") continue
    map.set(key, {
      slotKey: key,
      slotId: s.slotId,
      deliveryKey: s.deliveryKey || ddMmToYmd(s.startDay),
      startDay: s.startDay,
      endDay: s.endDay || s.startDay,
      label: fmtSlotLabel(s.startDay, s.endDay),
      monthKey: monthKeyFromSlot(s.startDay),
      orders: [],
      plants: 0,
      totalBookedPlants: Number(s.totalBookedPlants) || 0,
      primarySowed: Number(s.primarySowed) || 0,
      officeSowed: Number(s.officeSowed) || 0,
      slotReadyDays: Number(s.plantReadyDays) || 0,
      noOrders: true,
    })
  }

  for (const o of orders) {
    const sid = o.slotId ? String(o.slotId) : ""
    if (sid && map.has(sid)) {
      const g = map.get(sid)
      g.orders.push(o)
      g.plants += Number(o.plants) || 0
      g.noOrders = false
      continue
    }
    const fallbackKey = sid || `ord-${o.orderId}`
    if (!map.has(fallbackKey)) {
      map.set(fallbackKey, {
        slotKey: fallbackKey,
        slotId: o.slotId || null,
        deliveryKey: toYmd(o.deliveryDate) || "_none",
        startDay: null,
        endDay: null,
        label: fmtDeliveryLabel(o.deliveryDate),
        monthKey: monthKeyFromDelivery(toYmd(o.deliveryDate)),
        orders: [],
        plants: 0,
        noOrders: false,
      })
    }
    const g = map.get(fallbackKey)
    g.orders.push(o)
    g.plants += Number(o.plants) || 0
  }

  return [...map.values()].sort((a, b) => {
    const ka = a.deliveryKey || ""
    const kb = b.deliveryKey || ""
    if (ka === "_none") return 1
    if (kb === "_none") return -1
    return ka.localeCompare(kb)
  })
}

export function groupSlotMonths(slotCards = []) {
  const map = new Map()
  for (const sc of slotCards) {
    const mk = sc.monthKey || monthKeyFromDelivery(sc.deliveryKey) || "_none"
    if (!map.has(mk)) {
      map.set(mk, {
        monthKey: mk,
        label: fmtMonthLabel(mk),
        orders: [],
        plants: 0,
        slotCount: 0,
        slots: [],
      })
    }
    const g = map.get(mk)
    g.orders.push(...(sc.orders || []))
    g.plants += Number(sc.plants) || 0
    g.slotCount += 1
    g.slots.push(sc)
  }
  return [...map.values()].sort((a, b) => {
    if (a.monthKey === "_none") return 1
    if (b.monthKey === "_none") return -1
    return a.monthKey.localeCompare(b.monthKey)
  })
}

/** Primary entry: delivery-day sow cards (orders grouped by delivery date). */
export function groupDeliveryDays(orders = [], slotDays = []) {
  return mergeOrderAndSlotDays(orders, slotDays)
}

export function groupDeliveryMonths(orders = [], slotDays = []) {
  return rollupDayGroupsToMonths(mergeOrderAndSlotDays(orders, slotDays))
}

export function summarizeDeliveryMonths(orders = [], slotDays = []) {
  return groupDeliveryMonths(orders, slotDays).filter((m) => m.monthKey !== "_none")
}
