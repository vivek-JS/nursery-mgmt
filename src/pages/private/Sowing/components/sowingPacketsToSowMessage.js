import { cropName, varietyName } from "../readyPlantsMessage"
import { remainingPlantsOf, plantsPerPacket } from "./sowingPackingUtils"

const RANK = { late: 3, today: 2, urgent: 1, ok: 0 }

export function urgencyOf(daysUntilSow) {
  const n = Number(daysUntilSow)
  if (!Number.isFinite(n)) return { key: "ok", mr: "", en: "" }
  if (n < 0) return { key: "late", mr: "उशीर", en: "Late" }
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

function sowDateLabel() {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
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

export function buildPacketsToSowMessage({ card, rows = [], lang = "mr" } = {}) {
  const plant = cropName(card?.plantName, lang)
  const variety = varietyName(card?.subtypeName, lang)
  const { remaining, packets } = packetsToSowOf(card, rows)
  const urgency = worstUrgency(rows)
  const orderBits = rows
    .map((o) => `#${o.orderNumber} ${fmt(remainingPlantsOf(o))}`)
    .join(" · ")
  const pkt = packets.toFixed(packets < 10 ? 2 : 1).replace(/\.0$/, "")
  if (lang === "en") {
    const tag = urgency.en ? `${urgency.en}\n` : ""
    const ask =
      urgency.key === "late"
        ? "Please sow these packets today — late."
        : urgency.key === "today" || urgency.key === "urgent"
          ? "Please sow these packets today."
          : "Please sow these packets."
    return [
      `Sowing — ${plant} · ${variety}`,
      tag.trim(),
      `Packets: ~${pkt}  (${fmt(remaining)} plants)`,
      orderBits ? `Orders: ${orderBits}` : "",
      `Sow date: ${sowDateLabel()}`,
      "",
      ask,
    ]
      .filter((l, i, a) => l !== "" || a[i - 1] !== "")
      .join("\n")
      .trim()
  }
  const ask =
    urgency.key === "late"
      ? "कृपया आज पॅकेट लावा — उशीर झाला आहे"
      : urgency.key === "today" || urgency.key === "urgent"
        ? "कृपया आज पॅकेट लावा"
        : "कृपया पॅकेट लावा"
  return [
    `लागवड — ${plant} · ${variety}`,
    urgency.mr,
    "",
    `पॅकेट: ~${pkt}  (रोपे ${fmt(remaining)})`,
    orderBits ? `ऑर्डर: ${orderBits}` : "",
    `लागवड तारीख: ${sowDateLabel()}`,
    "",
    ask,
  ]
    .filter((l) => l !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
