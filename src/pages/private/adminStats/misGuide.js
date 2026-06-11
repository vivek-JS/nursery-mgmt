import React from "react"

/** English — Joyride tour & column reference. */
export const MIS_COLUMN_GUIDE_EN = {
  date: {
    title: "Date",
    body: "One row per day (IST). Booking = by order booking date. Delivery columns = by delivery date or status rules.",
  },
  booking: {
    title: "Booked",
    body: "Orders booked in this day or range. Top number = plants, bottom = order count. Click a cell to open the order list.",
  },
  deliveryTotal: {
    title: "Delivery total",
    body: "Open pipeline orders in range — excludes DISPATCHED (Out) and COMPLETED (Done). Footer may also include current Farm ready + RFD. With All past due: in-range + older backlog.",
  },
  accepted: {
    title: "Accepted",
    body: "Delivery date in range and status ACCEPTED. Click = orders matching this rule.",
  },
  farmReady: {
    title: "Farm ready",
    body: "All orders currently FARM_READY (no delivery-date filter). Same total on every daily row. Click = all farm-ready orders.",
  },
  readyForDispatch: {
    title: "RFD — Ready for dispatch",
    body: "All orders currently READY_FOR_DISPATCH (no delivery-date filter). Click = all RFD orders.",
  },
  dispatchProcess: {
    title: "In dispatch",
    body: "Orders in DISPATCH_PROCESS — dispatch in progress.",
  },
  partiallyCompleted: {
    title: "Partial",
    body: "Partly dispatched; some plants still remaining on the order.",
  },
  yetToDispatch: {
    title: "Yet to dispatch",
    body: "Sum of Accepted through Partial + Other — not fully Out/Done yet.",
  },
  dispatched: {
    title: "Out / Dispatched",
    body: "Dispatched on this day (IST) from status change / event date. If the same order is also Done that day, it counts only under Done — not here.",
  },
  vehicleDispatched: {
    title: "Vehicle / Out with dispatch",
    body: "Same as Out but only orders with vehicle or dispatch details (driver, vehicle, dispatch record). Out without vehicle info is excluded.",
  },
  completed: {
    title: "Done / Completed",
    body: "Marked completed on this day (IST) from status change / event date.",
  },
  other: {
    title: "Other",
    body: "Pending / Processing / Assigned with delivery in range.",
  },
  unique: {
    title: "Unique orders",
    body: "Distinct orders touching that day (booking or delivery union) — no double count.",
  },
  plant: {
    title: "Plant",
    body: "Plant type — subtypes in rows below.",
  },
  subtype: {
    title: "Subtype",
    body: "Variety under the plant. Click a cell = orders for that plant + subtype.",
  },
  name: {
    title: "Name",
    body: "Sales person or dealer. Row totals for booking and delivery metrics.",
  },
  shipPct: {
    title: "Ship %",
    body: "% of booked plants that are Out, Done, or in dispatch — by plant count.",
  },
}

/** Hinglish — column header hover & cell tooltips (simple mix, not formal Marathi). */
export const MIS_COLUMN_GUIDE_HI = {
  date: {
    title: "Date",
    body: "Har din ki ek line (IST). Booking = order book hone ki date. Delivery columns = delivery date ya status ke hisaab se.",
  },
  booking: {
    title: "Booked",
    body: "Is din / range mein kitni nayi booking hui. Upar plants, niche orders. Click karo → order list side mein khulegi.",
  },
  deliveryTotal: {
    title: "Delivery total",
    body: "Range mein open pipeline — DISPATCHED (Out) aur COMPLETED (Done) yahan count nahi. Footer mein kabhi Farm ready + RFD bhi add. All past due ON = range + purani backlog.",
  },
  accepted: {
    title: "Accepted",
    body: "Delivery date range mein + status ACCEPTED. Click = wahi orders list.",
  },
  farmReady: {
    title: "Farm ready",
    body: "Abhi FARM_READY wale saare orders (date filter nahi). Har daily row mein same number. Click = saari farm ready list.",
  },
  readyForDispatch: {
    title: "RFD",
    body: "Abhi READY_FOR_DISPATCH wale saare orders. Click = saari RFD list.",
  },
  dispatchProcess: {
    title: "Dispatching",
    body: "DISPATCH_PROCESS — abhi dispatch chal raha hai.",
  },
  partiallyCompleted: {
    title: "Partial",
    body: "Kuch dispatch ho chuka, kuch plants abhi baki.",
  },
  yetToDispatch: {
    title: "Yet to dispatch",
    body: "Accepted se Partial + Other ka jod — abhi poora Out/Done nahi hua.",
  },
  dispatched: {
    title: "Out",
    body: "Is din dispatch hua (IST). Agar usi din Done bhi hai to sirf Done column — Out mein double count nahi.",
  },
  vehicleDispatched: {
    title: "Vehicle",
    body: "Out jaisa logic — lekin sirf jahan vehicle / driver / dispatch detail hai. Bina vehicle info wale Out yahan count nahi.",
  },
  completed: {
    title: "Done",
    body: "Is din completed mark hua (IST).",
  },
  other: {
    title: "Other",
    body: "Pending / Processing / Assigned — delivery range mein.",
  },
  unique: {
    title: "Unique orders",
    body: "Us din kitne alag orders touch hue — double count nahi.",
  },
  plant: {
    title: "Plant",
    body: "Plant type — neeche subtype rows.",
  },
  subtype: {
    title: "Subtype",
    body: "Variety. Cell click = us plant + subtype ki orders.",
  },
  name: {
    title: "Name",
    body: "Sales ya dealer. Row = us person ka total.",
  },
  shipPct: {
    title: "Ship %",
    body: "Booked plants ka kitna % Out / Done / dispatch mein chala gaya.",
  },
}

export function getColumnGuide(colKey) {
  return MIS_COLUMN_GUIDE_HI[colKey] || MIS_COLUMN_GUIDE_EN[colKey] || null
}

/** Cell hover — Hinglish. */
export function getCellGuide(colKey, { includeBacklogPlus = false } = {}) {
  const col = getColumnGuide(colKey)
  if (!col) return "Click karo — order list khulegi."
  const dueNote =
    includeBacklogPlus && colKey === "deliveryTotal"
      ? " Range plants + purani backlog (jaise 500 + 700). "
      : ""
  return `${col.title}: ${col.body}${dueNote} Click → drawer.`
}

export const MIS_PAGE_GUIDE_EN = {
  welcome: {
    title: "Admin MIS — Guide",
    body: "This screen shows booking and delivery pipeline by day and variety. Hover column headers for Hinglish tips; this tour is in English.",
  },
  header: {
    title: "Summary chips",
    body: "Top chips = totals for Booked, Delivery, Due, etc. Click a yellow Due chip to open all due orders.",
  },
  filters: {
    title: "Date range",
    body: "Pick From–To dates and Apply. All tables use this range (IST timezone).",
  },
  dueOnly: {
    title: "Due orders only",
    body: "Shows only open pipeline orders (before Out/Done). Count style: plants on top, orders below.",
  },
  pastDue: {
    title: "All past due",
    body: "Adds backlog delivery plants before the range. Total = in-range orders + older due plants.",
  },
  tabs: {
    title: "Tabs",
    body: "Plant, Due, Sales, Dealer, Daily — different views. Due tab = backlog pipeline only.",
  },
  table: {
    title: "Table",
    body: "Hover headers for Hinglish help. Click any number to open the order drawer on the right.",
  },
  drawer: {
    title: "Order drawer",
    body: "Lists matching orders with farmer name, village, district, plant, and vehicle if dispatched. With All past due ON, Delivery drawer has two tabs: In range and Past due. Scroll for more.",
  },
  drawerSplit: {
    title: "In range vs Past due",
    body: "When All past due is enabled, the Delivery drawer splits into two tabs so combined counts are not mixed in one list.",
  },
}

const METRIC_KEYS = [
  "booking",
  "deliveryTotal",
  "accepted",
  "farmReady",
  "readyForDispatch",
  "dispatchProcess",
  "partiallyCompleted",
  "yetToDispatch",
  "dispatched",
  "completed",
]

function columnStepEn(colKey) {
  const g = MIS_COLUMN_GUIDE_EN[colKey]
  if (!g) return null
  return {
    target: `[data-tour="mis-col-${colKey}"]`,
    title: `📊 ${g.title}`,
    content: (
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>{g.body}</p>
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "#666" }}>
          Click a cell → opens the order list.
        </p>
      </div>
    ),
    placement: "top",
  }
}

/** Joyride tour steps (English). */
export function buildMisJoyrideSteps(activeTab) {
  const steps = [
    {
      target: "body",
      title: "🌱 Admin MIS — Welcome",
      content: (
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <p style={{ margin: "0 0 8px" }}>{MIS_PAGE_GUIDE_EN.welcome.body}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#666" }}>
            Press <strong>Next</strong> to continue. <strong>Skip</strong> to close.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="mis-header"]',
      title: "📋 " + MIS_PAGE_GUIDE_EN.header.title,
      content: <p style={{ margin: 0, fontSize: 13 }}>{MIS_PAGE_GUIDE_EN.header.body}</p>,
      placement: "bottom",
    },
    {
      target: '[data-tour="mis-filters"]',
      title: "📅 " + MIS_PAGE_GUIDE_EN.filters.title,
      content: <p style={{ margin: 0, fontSize: 13 }}>{MIS_PAGE_GUIDE_EN.filters.body}</p>,
      placement: "bottom",
    },
    {
      target: '[data-tour="mis-toggle-due"]',
      title: "⏳ " + MIS_PAGE_GUIDE_EN.dueOnly.title,
      content: <p style={{ margin: 0, fontSize: 13 }}>{MIS_PAGE_GUIDE_EN.dueOnly.body}</p>,
      placement: "bottom",
    },
    {
      target: '[data-tour="mis-toggle-backlog"]',
      title: "📦 " + MIS_PAGE_GUIDE_EN.pastDue.title,
      content: <p style={{ margin: 0, fontSize: 13 }}>{MIS_PAGE_GUIDE_EN.pastDue.body}</p>,
      placement: "bottom",
    },
    {
      target: '[data-tour="mis-tabs"]',
      title: "🗂️ " + MIS_PAGE_GUIDE_EN.tabs.title,
      content: <p style={{ margin: 0, fontSize: 13 }}>{MIS_PAGE_GUIDE_EN.tabs.body}</p>,
      placement: "bottom",
    },
    {
      target: '[data-tour="mis-table-wrap"]',
      title: "📊 " + MIS_PAGE_GUIDE_EN.table.title,
      content: <p style={{ margin: 0, fontSize: 13 }}>{MIS_PAGE_GUIDE_EN.table.body}</p>,
      placement: "top",
    },
  ]

  const TAB_DAILY = 4
  const TAB_PLANT = 0
  const TAB_DUE = 1
  const keys =
    activeTab === TAB_DAILY || activeTab === TAB_DUE
      ? ["date", ...METRIC_KEYS, "unique"]
      : activeTab === TAB_PLANT
        ? ["plant", "subtype", ...METRIC_KEYS, "shipPct"]
        : ["name", ...METRIC_KEYS, "shipPct"]

  for (const k of keys) {
    const s = columnStepEn(k)
    if (s) steps.push(s)
  }

  steps.push({
    target: "body",
    title: "✅ Tour complete",
    content: (
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
        <p style={{ margin: "0 0 8px" }}>{MIS_PAGE_GUIDE_EN.drawer.body}</p>
        <p style={{ margin: 0, fontSize: 11, color: "#666" }}>
          Run again anytime with the <strong>Guide</strong> button above.
        </p>
      </div>
    ),
    placement: "center",
    disableBeacon: true,
  })

  return steps
}

/** @deprecated use getColumnGuide */
export const getColumnGuideMr = getColumnGuide
/** @deprecated use getCellGuide */
export const getCellGuideMr = getCellGuide
