import { fmt, packingsOf } from "./sowingPackingUtils"

/** Shared metrics / status for Inventory Requests rows & legacy cards. */
export function getEasyRequestRowMetrics(card) {
  const plants = card.totalPlantsToSowWithBuffer || card.totalGap || 0
  const packs = packingsOf(card)
  const multi = packs.length > 1
  const openPacks = packs.filter((p) => !p.pendingRequest && !p.activeRequest)
  const coStock = Number(card.availablePackets) || 0
  const summary = card.orderSeedSummary || {}
  const raising =
    Number(card.raisingInHandPackets) ||
    Number(summary.raisingInHandPackets) ||
    0
  const raisingOrders =
    Number(card.raisingOrderCount) > 0
      ? Number(card.raisingOrderCount)
      : Number(summary.mixedOrderCount) > 0
        ? Number(summary.mixedOrderCount)
        : (Number(summary.raisingOrderCount) || 0) +
          (Number(summary.pureMixedOrderCount) || 0)
  const raisingAvailable = raising > 0
  const raisingPendingCollect = raisingOrders > 0 && raising <= 0
  const isRaisingPlan =
    raisingOrders > 0 || raising > 0 || Number(summary.raisingPackets) > 0
  const availPlants = Number(card.availablePlants) || 0
  const coverPct =
    plants > 0 ? Math.min(100, Math.round((availPlants / plants) * 100)) : 100
  const stockOk = availPlants >= plants && plants > 0

  const activeReq = card.activeRequest || card.pendingRequest || null
  const inProgress =
    Boolean(card.sowingInProgress) ||
    activeReq?.displayStatus === "sowing_in_progress" ||
    activeReq?.status === "issued"
  const requestPending =
    Boolean(card.requestPending) ||
    activeReq?.displayStatus === "pending" ||
    activeReq?.displayStatus === "processing" ||
    activeReq?.status === "pending" ||
    activeReq?.status === "processing"
  const statusLocked = inProgress || (requestPending && openPacks.length === 0)

  const reqId = activeReq?._id || activeReq?.id
  const reqStatus = String(activeReq?.status || activeReq?.displayStatus || "").toLowerCase()
  const canCancel =
    Boolean(reqId) &&
    !inProgress &&
    reqStatus !== "cancelled" &&
    reqStatus !== "rejected" &&
    (requestPending || reqStatus === "pending" || reqStatus === "processing")

  const primaryPack = packs[0]
  const packingLabel = primaryPack
    ? `${primaryPack.name || primaryPack.code || "Seed"} · ≈${primaryPack.conversionFactor || "?"}`
    : "—"

  const needPkt = primaryPack
    ? Number(primaryPack.packetsNeeded) || plants / (Number(primaryPack.conversionFactor) || 1)
    : plants
  const stockPkt = primaryPack
    ? Number(primaryPack.availablePackets) || coStock
    : coStock

  let statusKind = "ok"
  let statusLabel = "Stock OK"
  if (inProgress) {
    statusKind = "progress"
    statusLabel = "In progress"
  } else if (requestPending && openPacks.length === 0) {
    statusKind = "pending"
    statusLabel = "Request pending"
  } else if (raisingPendingCollect) {
    statusKind = "raising"
    statusLabel = "Collect raising"
  } else if (isRaisingPlan && raisingAvailable) {
    statusKind = "raisingOk"
    statusLabel = "Raising ready"
  } else if (!stockOk && plants > 0) {
    statusKind = "gap"
    statusLabel = "Need stock"
  }

  const sku =
    card.subtypeCode ||
    card.sku ||
    card.varietyCode ||
    primaryPack?.code ||
    (card.subtypeId ? String(card.subtypeId).slice(-6).toUpperCase() : "")

  return {
    plants,
    packs,
    multi,
    openPacks,
    coStock,
    raising,
    raisingOrders,
    raisingAvailable,
    raisingPendingCollect,
    isRaisingPlan,
    availPlants,
    coverPct,
    stockOk,
    activeReq,
    inProgress,
    requestPending,
    statusLocked,
    canCancel,
    packingLabel,
    needPkt,
    stockPkt,
    statusKind,
    statusLabel,
    sku,
    ageDays: card.plantReadyDays || "—",
    orderCount: card.orderCount || 0,
    dueGap: Number(card.dueGap) || 0,
    todayGap: Number(card.todayGap) || 0,
    fmt,
  }
}

export function groupCardsByPlant(cards = []) {
  const map = new Map()
  for (const card of cards) {
    const key = String(card.plantId || card.plantName || "unknown")
    if (!map.has(key)) {
      map.set(key, {
        plantId: card.plantId,
        plantName: card.plantName || "Plant",
        cards: [],
      })
    }
    map.get(key).cards.push(card)
  }
  return [...map.values()].sort((a, b) =>
    String(a.plantName).localeCompare(String(b.plantName))
  )
}
