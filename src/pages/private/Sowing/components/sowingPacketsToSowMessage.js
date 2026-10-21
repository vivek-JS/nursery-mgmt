import { cropName, varietyName } from "../readyPlantsMessage"
import { remainingPlantsOf, plantsPerPacket, sumRawGapFromCard } from "./sowingPackingUtils"

const RANK = { late: 3, today: 2, urgent: 1, ok: 0 }

export function urgencyOf(daysUntilSow) {
  const n = Number(daysUntilSow)
  if (!Number.isFinite(n)) return { key: "ok", mr: "", en: "" }
  if (n < 0) {
    const days = Math.abs(Math.trunc(n))
    return {
      key: "late",
      mr: `${days} दिवस उशीर झाला आहे`,
      en: `${days} day${days === 1 ? "" : "s"} late`,
    }
  }
  if (n === 0) return { key: "today", mr: "आज / त्वरित", en: "Today / urgent" }
  if (n <= 2) return { key: "urgent", mr: "त्वरित", en: "Urgent" }
  return { key: "ok", mr: `+${n} दिवस`, en: `+${n} days` }
}

export function worstUrgency(rows = []) {
  let best = { key: "ok", mr: "", en: "" }
  for (const row of rows) {
    const u = urgencyOf(row?.daysUntilSow)
    if ((RANK[u.key] || 0) > (RANK[best.key] || 0)) best = u
  }
  return best
}

function fmt(n) {
  return (Number(n) || 0).toLocaleString("en-IN")
}

function asDate(value) {
  if (value == null || value === "") return null
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const dmy = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12)
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function shortDay(value) {
  const d = asDate(value)
  if (!d) return null
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

export function deliveryWindowOf(rows = []) {
  const starts = []
  const ends = []
  for (const row of rows) {
    const start = shortDay(row.slotStartDay || row.deliveryDate)
    const end = shortDay(row.slotEndDay || row.deliveryDate || row.slotStartDay)
    if (start) starts.push({ label: start, t: asDate(row.slotStartDay || row.deliveryDate)?.getTime() })
    if (end) ends.push({ label: end, t: asDate(row.slotEndDay || row.deliveryDate || row.slotStartDay)?.getTime() })
  }
  if (!starts.length) return ""
  starts.sort((a, b) => a.t - b.t)
  ends.sort((a, b) => a.t - b.t)
  const from = starts[0].label
  const to = ends[ends.length - 1].label
  return from === to ? from : `${from} → ${to}`
}

export function packetsToSowOf(card, rows = []) {
  const remaining = rows.reduce((s, r) => s + remainingPlantsOf(r), 0)
  const cf = plantsPerPacket(card) || 1000
  return {
    remaining,
    packets: cf > 0 ? remaining / cf : remaining,
    cf,
  }
}

function excessPlantsOf(card, rows = []) {
  if (Number(card?.excessPlants) > 0) return Number(card.excessPlants)
  if (card?.isExcessiveSowing) {
    return Math.max(0, sumRawGapFromCard(card) - rows.reduce((s, r) => s + remainingPlantsOf(r), 0))
  }
  const cardGap = Number(card?.totalPlantsToSowRaw) || sumRawGapFromCard(card) || 0
  const linked = rows.reduce((s, r) => s + remainingPlantsOf(r), 0)
  return Math.max(0, Math.round(cardGap - linked))
}

function blockFor({ n, variety, qty, orderLabel, delay, lang }) {
  const qtyLine =
    lang === "mr" ? `${n}. *${variety}* ${fmt(qty)}` : `${n}. *${variety}* ${fmt(qty)}`
  const idLine = orderLabel
    ? lang === "mr"
      ? `   ऑर्डर #${orderLabel}`
      : `   Order #${orderLabel}`
    : lang === "mr"
      ? "   एक्सेस (ऑर्डर लिंक नाही)"
      : "   Excess (no order linked)"
  const delayLine = delay ? `   ${delay}` : ""
  return [qtyLine, idLine, delayLine].filter(Boolean).join("\n")
}

export function buildPacketsToSowMessage({ card, rows = [], lang = "mr" } = {}) {
  const plant = cropName(card?.plantName, lang)
  const variety = varietyName(card?.subtypeName, lang)
  const window = deliveryWindowOf(rows)
  const shed = card?.shedName || rows.find((r) => r.shedName)?.shedName || ""
  const excess = excessPlantsOf(card, rows)

  const items = []
  for (const row of rows) {
    const qty = remainingPlantsOf(row)
    if (qty <= 0) continue
    const delay = Number(row.daysUntilSow) < 0 ? urgencyOf(row.daysUntilSow) : null
    items.push({
      variety: varietyName(row.subtypeName || card?.subtypeName, lang),
      qty,
      orderLabel: row.orderNumber || "",
      delay: delay ? (lang === "mr" ? delay.mr : delay.en) : "",
    })
  }
  if (excess > 0.5 && !items.some((i) => !i.orderLabel)) {
    items.push({ variety, qty: excess, orderLabel: "", delay: "" })
  }

  const body = items.map((item, i) =>
    blockFor({ n: i + 1, lang, ...item })
  )

  if (lang === "en") {
    return [
      "*Sowing needed*",
      `*${plant}* · *${variety}*`,
      window ? `Delivery window: ${window}` : "",
      shed ? `Shed: ${shed}` : "",
      "",
      ...body,
    ]
      .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
      .join("\n")
      .trim()
  }

  return [
    "*लागवड झाली पाहिजे*",
    `*${plant}* · *${variety}*`,
    window ? `Delivery window: ${window}` : "",
    shed ? `शेड: ${shed}` : "",
    "",
    ...body,
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n")
    .trim()
}
