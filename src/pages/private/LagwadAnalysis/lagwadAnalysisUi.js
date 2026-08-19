/**
 * Presentation helpers for the lagwad analysis screen.
 * The three pools (sellable 90%, expected mortality 10%, ready to dispatch) always keep
 * the same colour language here so they are never read as one number.
 */

export const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN")

export const MONTH_ORDER = [
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
  "December"
]

export const MONTH_SHORT = {
  January: "Jan",
  February: "Feb",
  March: "Mar",
  April: "Apr",
  May: "May",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Oct",
  November: "Nov",
  December: "Dec"
}

export const WINDOW_STATE_UI = {
  current: {
    label: "Live",
    chip: "border-cyan-200 bg-cyan-50 text-cyan-700",
    dot: "bg-cyan-500",
    ring: "border-cyan-300"
  },
  expired: {
    label: "Expired",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    ring: "border-rose-200"
  },
  upcoming: {
    label: "Upcoming",
    chip: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
    ring: "border-slate-200"
  }
}

export const getWindowStateUi = (state) => WINDOW_STATE_UI[state] || WINDOW_STATE_UI.upcoming

/** Ready age buckets — anything a week past its ready date needs to be unmissable. */
export const getOverdueUi = (days) => {
  const d = Number(days) || 0
  if (d <= 0) {
    return { label: "on time", className: "border-slate-200 bg-slate-50 text-slate-500" }
  }
  if (d >= 7) {
    return {
      label: `+${d}d`,
      className: "border-rose-300 bg-rose-50 text-rose-700 font-semibold"
    }
  }
  if (d >= 3) {
    return { label: `+${d}d`, className: "border-orange-200 bg-orange-50 text-orange-700" }
  }
  return { label: `+${d}d`, className: "border-amber-200 bg-amber-50 text-amber-700" }
}

export const READY_STATUS_UI = {
  ready: { label: "Ready for sell", className: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  awaiting: { label: "Awaiting", className: "border-slate-200 bg-slate-50 text-slate-500" },
  legacy_bypass: {
    label: "Legacy bypass",
    className: "border-violet-200 bg-violet-50 text-violet-700"
  }
}

export const getReadyStatusUi = (line) => {
  const base = READY_STATUS_UI[line?.readyStatus] || READY_STATUS_UI.awaiting
  if (line?.readyStatus === "awaiting" && line?.expectedReadyLabel) {
    return { ...base, label: `Awaiting ${line.expectedReadyLabel.replace(/ \d{4}$/u, "")}` }
  }
  return base
}

export const SYNC_STATUS_UI = {
  synced: { label: "Synced", className: "text-emerald-600" },
  partial: { label: "Partial sync", className: "text-amber-600" },
  pending: { label: "Not synced", className: "text-rose-600" }
}

/** Shared MUI overrides so portalled dialogs / tooltips match the page. */
export const dialogPaperSx = {
  backgroundColor: "#ffffff",
  border: "1px solid rgba(15,23,42,0.08)",
  borderRadius: "16px",
  color: "#0f172a"
}

export const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: "rgba(15, 23, 42, 0.94)",
      color: "#f8fafc",
      fontSize: 11,
      maxWidth: 280,
      borderRadius: "8px",
      padding: "6px 10px"
    }
  },
  arrow: { sx: { color: "rgba(15, 23, 42, 0.94)" } }
}

/**
 * Collapse the per-slot payload into one row per month. The page reads month-wise; the
 * individual windows stay attached under `slots` for the month detail popup.
 */
export const rollupSlotsByMonth = (slots) => {
  const byMonth = new Map()

  for (const slot of slots || []) {
    const month = slot.month || "Unscheduled"
    if (!byMonth.has(month)) {
      byMonth.set(month, {
        month,
        label: MONTH_SHORT[month] || month,
        slots: [],
        slotCount: 0,
        sellable: 0,
        mortality: 0,
        ready: 0,
        delivery: 0,
        booked: 0,
        dispatched: 0,
        capacity: 0,
        available: 0,
        activeAvailable: 0,
        activeReady: 0,
        rolledInReady: 0,
        rolledInOrders: 0,
        lineCount: 0,
        batchCount: 0,
        overdueLineCount: 0,
        maxOverdueDays: 0,
        overdueDaySum: 0,
        hasCurrent: false,
        hasExpired: false,
        expiredReady: 0,
        isOverbooked: false
      })
    }

    const m = byMonth.get(month)
    m.slots.push(slot)
    m.slotCount += 1
    m.sellable += slot.actualPlants
    m.mortality += slot.expectedMortality
    m.ready += slot.actualReadyPlants
    m.delivery += slot.remainingToDispatch
    m.booked += slot.totalBookedPlants
    m.dispatched += slot.totalDispatchedPlants
    m.capacity += slot.availablePlants + slot.totalBookedPlants
    m.available += slot.availablePlants
    m.rolledInReady += slot.rolledInActualReadyPlants
    m.rolledInOrders += slot.rolledInOrderPlants
    m.lineCount += slot.lineCount
    m.batchCount += slot.batchCount
    m.overdueLineCount += slot.overdueLineCount
    m.overdueDaySum += slot.avgOverdueDays * slot.overdueLineCount
    m.maxOverdueDays = Math.max(m.maxOverdueDays, slot.maxOverdueDays)
    if (slot.isOverbooked) m.isOverbooked = true

    if (slot.windowState === "current") m.hasCurrent = true
    if (slot.windowState === "expired") {
      m.hasExpired = true
      m.expiredReady += slot.actualReadyPlants
    } else {
      m.activeAvailable += slot.availablePlants
      m.activeReady += slot.actualReadyPlants
    }
  }

  return MONTH_ORDER.filter((name) => byMonth.has(name))
    .concat([...byMonth.keys()].filter((name) => !MONTH_ORDER.includes(name)))
    .map((name) => {
      const m = byMonth.get(name)
      return {
        ...m,
        readyGap: Math.max(0, m.delivery - m.ready),
        physicalGap: Math.max(0, m.delivery - m.sellable),
        futureNeed: Math.max(0, m.delivery - m.ready),
        futureStock: Math.max(0, m.sellable - m.ready),
        avgOverdueDays: m.overdueLineCount
          ? Math.round(m.overdueDaySum / m.overdueLineCount)
          : 0
      }
    })
}

/**
 * Four series on one axis: delivery owed, actual sellable, ready to load, and the
 * leftover need (delivery minus ready). Cumulative mode is a running total so the
 * first month where delivery overtakes ready is the true crossover.
 */
export const buildLagwadLineSeries = (months, { cumulative = false } = {}) => {
  let ready = 0
  let actual = 0
  let delivery = 0

  return (months || []).map((m) => {
    const r = cumulative ? (ready += m.ready) : m.ready
    const a = cumulative ? (actual += m.sellable) : m.sellable
    const d = cumulative ? (delivery += m.delivery) : m.delivery
    const futureNeed = Math.max(0, d - r)
    return {
      label: m.label,
      month: m.month,
      full: m.month,
      delivery: d,
      actual: a,
      ready: r,
      futureNeed,
      shortfall: futureNeed,
      surplus: Math.max(0, r - d),
      shortBand: d > r ? [r, d] : [r, r],
      surplusBand: r > d ? [d, r] : [d, d]
    }
  })
}

export const firstWhereAbove = (rows, aboveKey, belowKey) =>
  (rows || []).find((row) => row[aboveKey] > row[belowKey]) || null

export const GROUP_MODES = [
  { key: "month", label: "By month" },
  { key: "slot", label: "By slot window" },
  { key: "batch", label: "By batch" },
  { key: "shed", label: "By shed" },
  { key: "readyDate", label: "By ready date" }
]

/**
 * Group lagwad lines for the breakdown table. Slot-wise is the default because a
 * lagwad date alone does not tell you which delivery window the stock belongs to.
 */
export const groupLagwadLines = (lines, mode) => {
  const groups = new Map()

  const push = (key, title, subtitle, line, sortValue) => {
    if (!groups.has(key)) {
      groups.set(key, { key, title, subtitle, sortValue, lines: [] })
    }
    groups.get(key).lines.push(line)
  }

  for (const line of lines || []) {
    if (mode === "month") {
      const month = line.month || "Unscheduled"
      push(month, month, "all windows in this month", line, MONTH_ORDER.indexOf(month))
    } else if (mode === "batch") {
      push(line.batchId || line.batchNumber, line.batchNumber || "Unknown batch", line.subtypeLabel, line, line.batchNumber)
    } else if (mode === "shed") {
      const shed = line.pollyhouse || "Unassigned shed"
      push(shed, shed, null, line, shed)
    } else if (mode === "readyDate") {
      const label = line.expectedReadyLabel || "No ready date"
      push(label, label, "expected ready", line, line.expectedReadyDate || "")
    } else {
      push(line.slotId, line.slotLabel || "Unlinked slot", line.month, line, line.slotLabel)
    }
  }

  return [...groups.values()]
    .map((group) => {
      const sell = group.lines.reduce((s, l) => s + (Number(l.sell90) || 0), 0)
      const mort = group.lines.reduce((s, l) => s + (Number(l.mort10) || 0), 0)
      const gross = group.lines.reduce((s, l) => s + (Number(l.totalQuantity) || 0), 0)
      const overdue = group.lines.filter((l) => l.overdueDays > 0)
      return {
        ...group,
        sell,
        mort,
        gross,
        overdueCount: overdue.length,
        avgOverdue: overdue.length
          ? Math.round(overdue.reduce((s, l) => s + l.overdueDays, 0) / overdue.length)
          : 0
      }
    })
    .sort((a, b) => String(a.sortValue ?? "").localeCompare(String(b.sortValue ?? ""), undefined, { numeric: true }))
}
