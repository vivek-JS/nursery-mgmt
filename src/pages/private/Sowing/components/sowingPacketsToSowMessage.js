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

export function plantKeyOf(card) {
  return String(card?.plantId || card?.plantName || "plant")
}

export function varietyKeyOf(card) {
  return `${plantKeyOf(card)}::${card?.subtypeId || card?.subtypeName || "var"}`
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

function varietyItems(card, rows, lang) {
  const variety = varietyName(card?.subtypeName, lang)
  const items = []
  for (const row of rows) {
    const qty = remainingPlantsOf(row)
    if (qty <= 0) continue
    const delay = Number(row.daysUntilSow) < 0 ? urgencyOf(row.daysUntilSow) : null
    items.push({
      qty,
      orderLabel: row.orderNumber || "",
      delay: delay ? (lang === "mr" ? delay.mr : delay.en) : "",
    })
  }
  const excess = excessPlantsOf(card, rows)
  if (excess > 0.5 && !items.some((i) => !i.orderLabel)) {
    items.push({ qty: excess, orderLabel: "", delay: "" })
  }
  return { variety, items, total: items.reduce((s, i) => s + i.qty, 0) }
}

function varietyBlock(card, rows, lang) {
  const { variety, items, total } = varietyItems(card, rows, lang)
  if (!items.length) return ""
  const window = deliveryWindowOf(rows)
  const lines = [
    `*${variety}* — *${fmt(total)}*`,
    window ? (lang === "mr" ? `Delivery window: ${window}` : `Delivery window: ${window}`) : "",
  ]
  items.forEach((item, i) => {
    const who = item.orderLabel
      ? lang === "mr"
        ? `ऑर्डर #${item.orderLabel}`
        : `Order #${item.orderLabel}`
      : lang === "mr"
        ? "एक्सेस (ऑर्डर लिंक नाही)"
        : "Excess (no order linked)"
    lines.push(`${i + 1}. ${who} · ${fmt(item.qty)}`)
    if (item.delay) lines.push(`   ${item.delay}`)
  })
  return lines.filter(Boolean).join("\n")
}

function cropBlock(plantName, bundles, lang) {
  const plant = cropName(plantName, lang)
  const sections = bundles
    .map(({ card, rows }) => varietyBlock(card, rows || [], lang))
    .filter(Boolean)
  if (!sections.length) return ""
  const allRows = bundles.flatMap((b) => b.rows || [])
  const total = bundles.reduce((s, b) => s + varietyItems(b.card, b.rows || [], lang).total, 0)
  const window = deliveryWindowOf(allRows)
  const sheds = [
    ...new Set(
      bundles
        .map((b) => b.card?.shedName || (b.rows || []).find((r) => r.shedName)?.shedName)
        .filter(Boolean)
    ),
  ]
  const nVar = sections.length
  const summary =
    lang === "mr"
      ? `एकूण *${fmt(total)}* रोपे · ${nVar} वाण`
      : `Total *${fmt(total)}* plants · ${nVar} ${nVar === 1 ? "variety" : "varieties"}`
  return [
    `*${plant}*`,
    summary,
    window ? `Delivery window: ${window}` : "",
    sheds.length
      ? lang === "mr"
        ? `शेड: ${sheds.join(", ")}`
        : `Shed: ${sheds.join(", ")}`
      : "",
    "",
    sections.join("\n\n"),
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n")
    .trim()
}

function groupBundles(bundles = []) {
  const map = new Map()
  for (const b of bundles) {
    if (!b?.card) continue
    const name = b.card.plantName || "Plant"
    const key = plantKeyOf(b.card)
    if (!map.has(key)) map.set(key, { plantName: name, bundles: [] })
    map.get(key).bundles.push(b)
  }
  return [...map.values()].sort((a, b) =>
    String(a.plantName).localeCompare(String(b.plantName))
  )
}

/** Crop-wise (then variety / order) sowing-needed WhatsApp text. */
export function buildSowNeededMessage({ bundles = [], lang = "mr" } = {}) {
  const crops = groupBundles(bundles)
    .map((g) => cropBlock(g.plantName, g.bundles, lang))
    .filter(Boolean)
  if (!crops.length) return ""
  const title = lang === "mr" ? "*लागवड झाली पाहिजे*" : "*Sowing needed*"
  return [title, "", crops.join("\n\n────────\n\n")].join("\n").trim()
}

export function buildPacketsToSowMessage({ card, rows = [], lang = "mr" } = {}) {
  if (!card) return buildSowNeededMessage({ bundles: [], lang })
  return buildSowNeededMessage({ bundles: [{ card, rows }], lang })
}
