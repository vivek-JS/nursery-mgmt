export const sowingGapToneStyles = {
  amber: { border: "border-amber-200", bg: "bg-amber-50", chip: "bg-amber-100 text-amber-900" },
  violet: { border: "border-violet-200", bg: "bg-violet-50", chip: "bg-violet-100 text-violet-900" },
  orange: { border: "border-orange-200", bg: "bg-orange-50", chip: "bg-orange-100 text-orange-900" },
  sky: { border: "border-sky-200", bg: "bg-sky-50", chip: "bg-sky-100 text-sky-900" },
  teal: { border: "border-teal-200", bg: "bg-teal-50", chip: "bg-teal-100 text-teal-900" },
}

export function resolveSowingGapSections(slot) {
  const detail = slot?.sowingGapDetail
  if (!detail) return []

  const sections = []

  if ((detail.uncovered?.orders?.length ?? 0) > 0) {
    sections.push({
      id: "uncovered",
      label: "Still need sow",
      subtitle: "Booked on this delivery window — sowing not done yet",
      orders: detail.uncovered.orders,
      orderCount: detail.uncovered.orderCount,
      plants: detail.uncovered.plants,
      tone: "orange",
    })
  }

  for (const bucket of detail.coveredByReadyDate || []) {
    if ((bucket.orders?.length ?? 0) === 0 && !(bucket.plants > 0)) continue
    sections.push({
      id: `ready-${bucket.dateLabel}`,
      label: bucket.dateLabel || "Ready date",
      subtitle: bucket.slotLabel
        ? `Ready slot ${bucket.slotLabel}${bucket.requestNumber ? ` · ${bucket.requestNumber}` : ""}`
        : bucket.requestNumber || "Order cover",
      orders: bucket.orders || [],
      orderCount: bucket.orderCount ?? bucket.orders?.length ?? 0,
      plants: bucket.plants ?? 0,
      tone: "teal",
      showSowingHint: true,
      plantsOnly: !(bucket.orders?.length > 0),
    })
  }

  return sections
}

/** Ready slot: sowing batches covering orders on other delivery windows. */
export function resolveSowedForOtherDeliverySections(slot) {
  const sections = []
  const batches = Array.isArray(slot?.sowingBatches)
    ? slot.sowingBatches
    : Array.isArray(slot?.sowingEntries)
      ? slot.sowingEntries
      : []

  for (const batch of batches) {
    const plants = Math.max(0, Number(batch?.orderCoveredPlants) || 0)
    const linkedCount = batch?.linkedOrderIds?.length ?? 0
    if (plants <= 0 && linkedCount <= 0) continue

    sections.push({
      id: batch.requestNumber || batch._id || `ready-${batch.plantReadyDate}`,
      label: batch.requestNumber || "Sowing batch",
      subtitle: [
        batch.plantReadyDate ? `Ready ${batch.plantReadyDate}` : null,
        linkedCount > 0
          ? `${linkedCount} order${linkedCount === 1 ? "" : "s"} on other delivery dates`
          : `${plants.toLocaleString()} plants for other delivery`,
      ]
        .filter(Boolean)
        .join(" · "),
      orders: [],
      orderCount: linkedCount,
      plants,
      tone: "violet",
      plantsOnly: linkedCount === 0,
      showSowingHint: true,
      requestNumber: batch.requestNumber || "",
    })
  }

  if (sections.length) return sections

  const covered = slot?.sowingGapDetail?.coveredByReadyDate || []
  for (const bucket of covered) {
    const otherOrders = (bucket.orders || []).filter((row) => row.coverType === "other")
    if (!otherOrders.length && !(bucket.plants > 0)) continue
    sections.push({
      id: `cover-${bucket.dateLabel}`,
      label: bucket.dateLabel || "Ready date",
      subtitle: bucket.slotLabel
        ? `Orders delivered elsewhere · ready slot ${bucket.slotLabel}`
        : "Sowing reserved for other delivery windows",
      orders: otherOrders,
      orderCount: bucket.orderCount ?? otherOrders.length,
      plants: bucket.plants ?? 0,
      tone: "violet",
      showSowingHint: true,
      plantsOnly: otherOrders.length === 0,
    })
  }

  return sections
}
