export function fmt(n, d = 0) {
  const x = Number(n)
  if (!Number.isFinite(x)) return "0"
  return d === 0 ? String(Math.round(x)) : x.toFixed(d)
}

/** Sowing yield per primary unit packet (not UOM conversionFactor). */
export function plantsPerPacket(p) {
  const tpp = Number(p?.tentativePlantsPerPacket)
  if (Number.isFinite(tpp) && tpp > 0) return tpp
  return Number(p?.conversionFactor) || 1
}

export function packKey(p) {
  return String(p?.productId || p?.code || p?.name || "default")
}

export function packingsOf(card) {
  if (Array.isArray(card?.packings) && card.packings.length) return card.packings
  const pp = plantsPerPacket(card)
  return [
    {
      productId: card?.productId || null,
      name: "Default",
      code: "",
      conversionFactor: pp,
      label: `1 pkt ≈ ${pp} plants`,
      packetsNeeded: Number(card?.packetsNeeded) || 0,
      availablePackets: Number(card?.availablePackets) || 0,
      stockShortfall: Number(card?.stockShortfall) || 0,
      stockCovers:
        Number(card?.availablePackets) >= Number(card?.packetsNeeded) &&
        Number(card?.packetsNeeded) > 0,
      pendingRequest: card?.pendingRequest || null,
    },
  ]
}

/** Soft accent colors for packing rows */
export const PACK_COLORS = [
  { bg: "#e8f5e9", border: "#66bb6a", text: "#1b5e20", bar: "#43a047" },
  { bg: "#e3f2fd", border: "#42a5f5", text: "#0d47a1", bar: "#1e88e5" },
  { bg: "#fff3e0", border: "#ffa726", text: "#e65100", bar: "#fb8c00" },
  { bg: "#fce4ec", border: "#ec407a", text: "#880e4f", bar: "#e91e63" },
  { bg: "#f3e5f5", border: "#ab47bc", text: "#6a1b9a", bar: "#8e24aa" },
  { bg: "#e0f7fa", border: "#26c6da", text: "#006064", bar: "#00acc1" },
]

export function colorForIndex(i) {
  return PACK_COLORS[i % PACK_COLORS.length]
}

/**
 * Split plant gap across selected packings → packet amounts.
 * mode:
 *  - equal: split plants evenly
 *  - stockFirst: cover with stock capacity first, then remainder on largest CF
 *  - single: put all on first packing
 */
export function distributePackets(plantsNeeded, packings, mode = "equal") {
  const list = (packings || []).filter(Boolean)
  const out = {}
  list.forEach((p) => {
    out[packKey(p)] = 0
  })
  if (!list.length || plantsNeeded <= 0) return out

  if (mode === "single" || list.length === 1) {
    const p = list[0]
    const cf = plantsPerPacket(p)
    out[packKey(p)] = Number((plantsNeeded / cf).toFixed(2))
    return out
  }

  if (mode === "stockFirst") {
    let remaining = plantsNeeded
    const byStock = [...list].sort((a, b) => {
      const ap = (Number(a.availablePackets) || 0) * plantsPerPacket(a)
      const bp = (Number(b.availablePackets) || 0) * plantsPerPacket(b)
      return bp - ap
    })
    byStock.forEach((p, idx) => {
      const cf = plantsPerPacket(p)
      const stockPlants = (Number(p.availablePackets) || 0) * cf
      const isLast = idx === byStock.length - 1
      const takePlants = isLast
        ? remaining
        : Math.min(remaining, Math.max(0, stockPlants))
      const pkts = takePlants > 0 ? Number((takePlants / cf).toFixed(2)) : 0
      out[packKey(p)] = pkts
      remaining = Math.max(0, remaining - pkts * cf)
    })
    return out
  }

  // equal plant split
  const share = plantsNeeded / list.length
  list.forEach((p) => {
    const cf = plantsPerPacket(p)
    out[packKey(p)] = Number((share / cf).toFixed(2))
  })
  return out
}

export function plantsFromAlloc(packings, allocMap) {
  return (packings || []).reduce((s, p) => {
    const pkts = Number(allocMap[packKey(p)]) || 0
    const cf = plantsPerPacket(p)
    return s + pkts * cf
  }, 0)
}

/** Sum slot rawGap (no buffer) from a sowing card. */
export function sumRawGapFromCard(card) {
  const explicit = Number(card?.totalPlantsToSowRaw)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  if (Array.isArray(card?.slots) && card.slots.length) {
    return card.slots.reduce((s, slot) => s + (Number(slot.rawGap) || 0), 0)
  }
  return Number(card?.totalPlantsToSowWithBuffer || card?.totalGap) || 0
}

export function applyBufferToPlants(basePlants, bufferPct) {
  const base = Number(basePlants) || 0
  const pct = Number(bufferPct) || 0
  if (base <= 0 || pct <= 0) return base
  return Math.round(base * (1 + pct / 100))
}

/**
 * Request gap for packet dialog: raising portion has no buffer; company portion keeps buffer.
 */
export function computeRequestPlantsGap({
  card,
  raisingPackets = 0,
  conversionFactor,
} = {}) {
  const rawTotal = sumRawGapFromCard(card)
  const bufferedTotal =
    Number(card?.totalPlantsToSowWithBuffer || card?.totalGap) || rawTotal
  const bufferPct = Number(card?.sowingBuffer) || 0
  const cf = Number(conversionFactor) || plantsPerPacket(card) || 1
  const raisingPlants = Math.max(0, Number(raisingPackets) || 0) * cf
  const companyRaw = Math.max(0, rawTotal - raisingPlants)
  const companyBuffered = applyBufferToPlants(companyRaw, bufferPct)
  const requestGap = raisingPlants + companyBuffered
  return {
    rawTotal,
    bufferedTotal,
    bufferPct,
    raisingPlants,
    companyRaw,
    companyBuffered,
    requestGap,
  }
}

/** Flat editable lines for Sowing Roadmap (stock-first + card parity). */
export function buildRoadmapLines(cards = []) {
  const lines = []
  ;(cards || []).forEach((card) => {
    const plants = Number(card.totalPlantsToSowWithBuffer || card.totalGap) || 0
    const packs = packingsOf(card).filter((p) => !p.pendingRequest)
    if (!packs.length || plants <= 0) return
    const summary = card.orderSeedSummary || {}
    const raisingDefault =
      Number(card.raisingInHandPackets) ||
      Number(summary.raisingInHandPackets) ||
      0
    const seedHint =
      (summary.raisingPackets > 0 && summary.companyPackets > 0) ||
      (summary.mixedOrderCount > 0 && summary.companyPackets > 0) ||
      (raisingDefault > 0 && Number(card.availablePackets) > 0)
        ? "MIXED"
        : raisingDefault > 0 ||
            summary.raisingPackets > 0 ||
            summary.mixedOrderCount > 0
          ? "RAISING"
          : "COMPANY"
    // Raise plants off the gap before stock-first company split (same as RequestPacketsDialog)
    const firstCf = plantsPerPacket(packs[0])
    const raisingPlants = raisingDefault * firstCf
    const plantsForCompany = Math.max(0, plants - raisingPlants)
    const alloc = distributePackets(plantsForCompany, packs, "stockFirst")

    packs.forEach((p, idx) => {
      const key = packKey(p)
      const request = Number(alloc[key]) || 0
      const avail = Number(p.availablePackets) || 0
      lines.push({
        id: `${card.plantId}-${card.subtypeId}-${key}`,
        plantId: card.plantId,
        plantName: card.plantName,
        subtypeId: card.subtypeId,
        subtypeName: card.subtypeName,
        plantReadyDays: card.plantReadyDays,
        sowingBuffer: card.sowingBuffer,
        plantsGap: plants,
        orderCount: card.orderCount || 0,
        slotIds: card.slotIds || [],
        slots: card.slots || [],
        packing: p,
        productId: p.productId || null,
        packingName: p.name || p.code || "Seed",
        packingCode: p.code || "",
        conversionFactor: plantsPerPacket(p),
        availablePackets: avail,
        packetsNeeded:
          Number(p.packetsNeeded) ||
          Number((plants / plantsPerPacket(p)).toFixed(2)),
        requestPkts: request,
        excessPkts: 0,
        // One raising field per subtype — stored on first packing row
        raisingPkts: idx === 0 ? raisingDefault : 0,
        isRaisingRow: idx === 0,
        seedHint,
        companyPlanPackets: Number(summary.companyPackets) || 0,
        raisingPlanPackets: Number(summary.raisingPackets) || 0,
        included: request > 0 || packs.length === 1 || (idx === 0 && raisingDefault > 0),
        colorIdx: idx,
      })
    })
  })
  return lines
}

export function maxExcessForLine(line) {
  const avail = Number(line.availablePackets) || 0
  const req = Number(line.requestPkts) || 0
  return Number(Math.max(0, avail - req).toFixed(2))
}

/** Re-run stock-first for one subtype after raising changes (card parity). */
export function redistributeSubtypeLines(allLines, plantId, subtypeId, raisingPkts) {
  const group = allLines.filter(
    (l) => l.plantId === plantId && l.subtypeId === subtypeId
  )
  if (!group.length) return allLines
  const plants = Number(group[0].plantsGap) || 0
  const packs = group.map((l) => l.packing)
  const firstCf = plantsPerPacket(packs[0])
  const raising = Math.max(0, Number(raisingPkts) || 0)
  const alloc = distributePackets(
    Math.max(0, plants - raising * firstCf),
    packs,
    "stockFirst"
  )
  return allLines.map((l) => {
    if (l.plantId !== plantId || l.subtypeId !== subtypeId) return l
    const key = packKey(l.packing)
    const request = Number(alloc[key]) || 0
    return {
      ...l,
      requestPkts: request,
      raisingPkts: l.isRaisingRow ? raising : 0,
      excessPkts: Math.min(Number(l.excessPkts) || 0, Math.max(0, (Number(l.availablePackets) || 0) - request)),
      included: l.included || request > 0,
    }
  })
}
