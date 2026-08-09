/** Shared slot/subtype number helpers — capacity = available + booked (not the other way around). */

export const parseSlotNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const getBookedPlants = (slotOrSubtype) => Number(slotOrSubtype?.totalBookedPlants) || 0

export const getBufferAmount = (slot) => Math.floor(Number(slot?.bufferAmount) || 0)

export const getEffectiveBufferPct = (slot) =>
  Number(slot?.effectiveBuffer ?? slot?.buffer ?? 0) || 0

export const isSlotBufferMaterialized = (slot) => {
  if (slot?.bufferMaterialized === true) return true
  const original = Number(slot?.originalTotalPlants) || 0
  if (original > 0) return true
  if (getBufferAmount(slot) > 0) return true
  const slotPct = Number(slot?.buffer) || 0
  return slotPct > 0
}

export const isAvailablePlantsMaterialized = (slot) => {
  if (slot?.availablePlantsMaterialized === true) return true
  if (slot?.availablePlantsMaterialized === false) return false
  if (Array.isArray(slot?.slotTrail)) {
    return slot.slotTrail.some((t) => t?.action === "AVAILABLE_PLANTS_UPDATED")
  }
  return false
}

/** Available: materialized stored value, else legacy formula for old slots. */
export const getAvailablePlants = (slot) => {
  const booked = getBookedPlants(slot)
  const stored =
    slot?.availablePlants === undefined ||
    slot?.availablePlants === null ||
    slot?.availablePlants === ""
      ? null
      : parseSlotNumber(slot.availablePlants, null)

  if (isAvailablePlantsMaterialized(slot)) {
    return stored ?? 0
  }

  // Negative stored = overbook — keep in sync with card + edit modal (don't re-derive from capacity).
  if (stored !== null && stored < 0) {
    return stored
  }

  if (stored !== null && stored > 0) {
    return stored
  }

  const legacyTotal = Number(slot?.originalTotalPlants ?? slot?.totalPlants) || 0
  if (legacyTotal > 0) {
    const bufferAmt =
      getBufferAmount(slot) > 0
        ? getBufferAmount(slot)
        : Math.round((legacyTotal * getEffectiveBufferPct(slot)) / 100)
    return Math.max(0, legacyTotal - booked - bufferAmt)
  }

  return stored ?? 0
}

/** Capacity = available + booked (always derived). */
export const getTotalCapacity = (slotOrSubtype) => {
  return getAvailablePlants(slotOrSubtype) + getBookedPlants(slotOrSubtype)
}

/** Inherited plant/subtype reserve — only for slots not yet saved/migrated/released */
export const getInheritedBufferReserve = (slot) => {
  if (isSlotBufferMaterialized(slot)) return 0
  const inherited = Number(slot?.inheritedBufferAmount)
  if (!Number.isNaN(inherited) && inherited > 0) return Math.round(inherited)
  return getComputedBufferReserve(slot)
}

/** Shown in UI — DB reserve, or inherited preview before first save */
export const getDisplayBufferAmount = (slot) => {
  const fromApi = Number(slot?.displayBufferAmount)
  if (Number.isFinite(fromApi) && fromApi >= 0) {
    if (fromApi > 0 || isSlotBufferMaterialized(slot)) return Math.round(fromApi)
  }
  const stored = getBufferAmount(slot)
  if (stored > 0) return stored
  return getInheritedBufferReserve(slot)
}

/** Plants reserved in DB — only this can be released via release-buffer */
export const getReleasableBuffer = (slot) => getBufferAmount(slot)

/** Theoretical reserve from effective % of (available + booked). */
export const getComputedBufferReserve = (slot) => {
  const computed = Number(slot?.computedBufferAmount)
  if (!Number.isNaN(computed) && computed > 0) return Math.round(computed)
  const capacity = getTotalCapacity(slot)
  const pct = getEffectiveBufferPct(slot)
  if (pct > 0 && capacity > 0) return Math.round((capacity * pct) / 100)
  return 0
}

export const hasInheritedBufferOnly = (slot) => {
  if (slot?.inheritedBufferOnly === true) return true
  if (slot?.inheritedBufferOnly === false) return false
  return (
    !isSlotBufferMaterialized(slot) &&
    getReleasableBuffer(slot) === 0 &&
    getInheritedBufferReserve(slot) > 0
  )
}

/** Sellable headroom = capacity minus buffer reserve (display only). */
export const getSellableCapacity = (slot) => {
  const capacity = getTotalCapacity(slot)
  const bufferAmt = isSlotBufferMaterialized(slot)
    ? getReleasableBuffer(slot)
    : getDisplayBufferAmount(slot)
  if (bufferAmt > 0) return Math.max(0, capacity - bufferAmt)
  return capacity
}

export const getUtilizationPct = (booked, capacity) => {
  const b = Number(booked) || 0
  const c = Number(capacity) || 0
  if (c === 0) return b > 0 ? 100 : 0
  return Math.round((b / c) * 100)
}

export const getSowingGap = (slot) => {
  const booked = getBookedPlants(slot)
  const primarySowed = Number(slot?.primarySowed) || 0
  return booked - primarySowed
}

export const isSlotOverbooked = (slot) => getAvailablePlants(slot) < 0

/** Subtype-level rollup: sum available + booked across slots when present, else API totals. */
export const getSubtypeAvailable = (subtype) => {
  if (Array.isArray(subtype?.slots) && subtype.slots.length > 0) {
    return subtype.slots.reduce((sum, slot) => sum + getAvailablePlants(slot), 0)
  }
  const total = Number(subtype?.totalPlants) || 0
  const booked = getBookedPlants(subtype)
  return Math.max(0, total - booked)
}

export const isSubtypeOverbooked = (subtype) => {
  if (Array.isArray(subtype?.slots) && subtype.slots.length > 0) {
    return subtype.slots.some((slot) => isSlotOverbooked(slot))
  }
  return getBookedPlants(subtype) > (Number(subtype?.totalPlants) || 0)
}

/** Rolled-in plants currently booked on this slot (not subtype-wide total). */
export const getRolledInPlantsOnCurrentSlot = (slot) =>
  Number(slot?.pastDueDetail?.rolledInOnCurrentSlot?.plants) || 0

export const getRolledInOrdersOnCurrentSlot = (slot) =>
  Number(slot?.pastDueDetail?.rolledInOnCurrentSlot?.orderCount) || 0

/** Stored available (includes rolled-in bookings on this slot). */
export const getRealAvailablePlants = (slot) => getAvailablePlants(slot)

/** Stored available minus rolled-in plants on this slot (real avail − rolled). */
export const getAvailableMinusRolledIn = (slot) =>
  getAvailablePlants(slot) - getRolledInPlantsOnCurrentSlot(slot)

/** Card / pill primary available — real headroom when rolled-in sits on this slot. */
export const getDisplayAvailablePlants = (slot) => {
  if (slotShowDualAvailableCards(slot)) return getAvailableMinusRolledIn(slot)
  return getAvailablePlants(slot)
}

/** @deprecated use getAvailableMinusRolledIn */
export const getAvailableExcludingRolledIn = getAvailableMinusRolledIn

/** Original bookings on this slot (API totalBookedPlants — excludes past-due rolled-in). */
export const getNativeBookedPlantsOnSlot = (slot) => getBookedPlants(slot)

/** Today's slot has both rolled-in and originally booked-on-this-window orders. */
export const slotHasMixedRolledAndNativeOrders = (slot) =>
  Boolean(slot?.isCurrentDateSlot) &&
  getRolledInOrdersOnCurrentSlot(slot) > 0 &&
  getNativeBookedPlantsOnSlot(slot) > 0

export const slotHasPendingPastDueOnSubtype = (slot) =>
  Boolean(slot?.isCurrentDateSlot) && (Number(slot?.pastDuePendingOnSlot) || 0) > 0

export const slotShowDualAvailableCards = (slot) =>
  Boolean(slot?.isCurrentDateSlot) && getRolledInPlantsOnCurrentSlot(slot) > 0

/** Remaining to dispatch on this slot (ACCEPTED / FARM_READY / READY_FOR_DISPATCH). */
export const getRemainingToDispatch = (slot) => Number(slot?.remainingToDispatch) || 0

/** Pre-dispatch queue plants from past-due rolled-in orders on this slot. */
export const getRemainingRolledIn = (slot) => Number(slot?.remainingRolledIn) || 0

/** Pre-dispatch queue plants from native (non–rolled-in) orders on this slot. */
export const getRemainingNative = (slot) => Number(slot?.remainingNative) || 0

/** @deprecated use getRemainingNative — was incorrectly subtracting booked rolled-in from remaining */
export const getRemainingMinusRolledIn = getRemainingNative

export const slotShowDualRemainingPipeline = (slot) =>
  getRemainingRolledIn(slot) > 0 ||
  (Boolean(slot?.isCurrentDateSlot) && getRolledInPlantsOnCurrentSlot(slot) > 0)

/** Native delivery-window dispatched (excl. rolled-in) — matches booked / remaining native. */
export const getDispatchedNativePlants = (slot) =>
  Number(slot?.dispatchedNativePlants ?? slot?.totalDispatchedPlants) || 0

export const getDispatchedRolledInPlants = (slot) =>
  Number(slot?.dispatchedRolledInPlants) || 0

export const getDispatchedCrossSlotInPlants = (slot) =>
  Number(slot?.dispatchedCrossSlotInPlants) || 0

/** Rolled + cross-slot early-in dispatched (not in native cohort). */
export const getDispatchedOtherPlants = (slot) => {
  if (slot?.dispatchedOtherPlants != null) {
    return Number(slot.dispatchedOtherPlants) || 0
  }
  return getDispatchedRolledInPlants(slot) + getDispatchedCrossSlotInPlants(slot)
}

export const getTotalAllDispatchedPlants = (slot) => {
  if (slot?.totalAllDispatchedPlants != null) {
    return Number(slot.totalAllDispatchedPlants) || 0
  }
  return getDispatchedNativePlants(slot) + getDispatchedOtherPlants(slot)
}

export const slotShowDualDispatchedCards = (slot) => getDispatchedOtherPlants(slot) > 0

/** booked excl rolled ≈ remainingNative + native dispatched (delivery-window cohort). */
export const slotNativeBookedIdentityHolds = (slot) => {
  const booked = getBookedPlants(slot)
  const rhs = getRemainingNative(slot) + getDispatchedNativePlants(slot)
  return booked === rhs
}

/** Full pre-dispatch queue on slot = native delivery window + rolled-in. */
export const getActualRemainingToDispatch = (slot) =>
  getRemainingNative(slot) + getRemainingRolledIn(slot)

/** Alias — plants still to dispatch (native + rolled queue). */
export const getActualRemainingPlants = (slot) => getActualRemainingToDispatch(slot)

/** Physical sellable headroom after dispatch queue. */
export const getActualAvailablePlants = (slot) => {
  if (slot?.actualAvailable != null && Number.isFinite(Number(slot.actualAvailable))) {
    return Math.max(0, Number(slot.actualAvailable))
  }
  return Math.max(
    0,
    (Number(slot?.actualPlants) || 0) - (Number(slot?.remainingToDispatch) || 0)
  )
}

/** Shortfall: dispatch queue exceeds physical stock (positive = need more actual). */
export const getActualGapPlants = (slot) => {
  if (slot?.actualGapPlants != null && Number.isFinite(Number(slot.actualGapPlants))) {
    const gap = Number(slot.actualGapPlants)
    const surplus = Number(slot.actualSurplusPlants) || 0
    return surplus > 0 ? -surplus : gap
  }
  return getActualRemainingPlants(slot) - (Number(slot?.actualPlants) || 0)
}

export const getActualGapPlantsPositive = (slot) => Math.max(0, getActualGapPlants(slot))

/** Gap % relative to actualPlants (not booked). */
export const getActualGapPct = (slot) => {
  if (slot?.actualGapPct != null && Number.isFinite(Number(slot.actualGapPct))) {
    return Number(slot.actualGapPct)
  }
  const actual = Number(slot?.actualPlants) || 0
  const gap = getActualGapPlantsPositive(slot)
  if (actual <= 0) return gap > 0 ? 100 : 0
  return Math.round((gap / actual) * 100)
}

export const getActualSurplusPlants = (slot) => {
  if (slot?.actualSurplusPlants != null && Number.isFinite(Number(slot.actualSurplusPlants))) {
    return Math.max(0, Number(slot.actualSurplusPlants))
  }
  return Math.max(0, -getActualGapPlants(slot))
}

export const getRolledInAvailablePlants = (slot) =>
  Number(slot?.rolledInAvailablePlants) || 0

/** Month-level rollup across all slots in a tab. */
export const rollupMonthSlotMetrics = (slots) => {
  const list = Array.isArray(slots) ? slots : []
  let totalPlants = 0
  let totalBookedPlants = 0
  let totalAvailablePlants = 0
  let totalRealAvailablePlants = 0
  let totalPrimarySowed = 0
  let totalDispatchedPlants = 0
  let totalDispatchedNative = 0
  let totalDispatchedOther = 0
  let totalAllDispatchedPlants = 0
  let totalRemainingToDispatch = 0
  let totalRemainingNative = 0
  let totalRemainingRolled = 0
  let totalActualPlants = 0
  let totalActualRemaining = 0
  let totalActualAvailable = 0
  let totalRolledInAvailable = 0
  let hasDualAvailable = false

  for (const slot of list) {
    totalPlants += getTotalCapacity(slot)
    totalBookedPlants += getBookedPlants(slot)
    const storedAvail = getAvailablePlants(slot)
    totalAvailablePlants += storedAvail
    const dual = slotShowDualAvailableCards(slot)
    if (dual) hasDualAvailable = true
    totalRealAvailablePlants += dual ? getAvailableMinusRolledIn(slot) : storedAvail
    totalPrimarySowed += Number(slot?.primarySowed) || 0
    totalDispatchedPlants += getDispatchedNativePlants(slot)
    totalDispatchedNative += getDispatchedNativePlants(slot)
    totalDispatchedOther += getDispatchedOtherPlants(slot)
    totalAllDispatchedPlants += getTotalAllDispatchedPlants(slot)
    totalRemainingToDispatch += Number(slot?.remainingToDispatch) || 0
    totalRemainingNative += getRemainingNative(slot)
    totalRemainingRolled += getRemainingRolledIn(slot)
    totalActualPlants += Number(slot?.actualPlants) || 0
    totalActualRemaining += getActualRemainingPlants(slot)
    totalActualAvailable += getActualAvailablePlants(slot)
    totalRolledInAvailable += getRolledInAvailablePlants(slot)
  }

  const gapRaw = totalActualRemaining - totalActualPlants
  const actualGapPlants = Math.max(0, gapRaw)
  const actualSurplusPlants = Math.max(0, -gapRaw)
  const actualGapPct =
    totalActualPlants <= 0
      ? actualGapPlants > 0
        ? 100
        : 0
      : Math.round((actualGapPlants / totalActualPlants) * 100)
  const sowingGap = totalBookedPlants - totalPrimarySowed

  return {
    totalPlants,
    totalBookedPlants,
    totalAvailablePlants,
    totalRealAvailablePlants,
    hasDualAvailable,
    totalPrimarySowed,
    totalDispatchedPlants,
    totalDispatchedNative,
    totalDispatchedOther,
    totalAllDispatchedPlants,
    totalRemainingToDispatch,
    totalRemainingNative,
    totalRemainingRolled,
    totalActualPlants,
    totalActualRemaining,
    totalActualAvailable,
    actualGapPlants,
    actualGapPct,
    actualSurplusPlants,
    totalRolledInAvailable,
    sowingGap,
  }
}

/** Plant total shown on slot card for each stat tile (matches backend slotDispatchStats). */
export const getSlotStatPlantsTotal = (slot, statKey) => {
  if (!slot) return 0
  switch (statKey) {
    case "available":
      return getAvailablePlants(slot)
    case "booked":
      return getBookedPlants(slot)
    case "dispatched":
    case "dispatchedNative":
      return getDispatchedNativePlants(slot)
    case "dispatchedRolled":
      return getDispatchedRolledInPlants(slot)
    case "dispatchedOther":
      return getDispatchedOtherPlants(slot)
    case "dispatchedAll":
      return getTotalAllDispatchedPlants(slot)
    case "remaining":
      return getActualRemainingPlants(slot)
    case "remainingNative":
      return getRemainingNative(slot)
    case "remainingRolled":
      return getRemainingRolledIn(slot)
    case "crossSlotEarlyIn":
      return Number(slot?.crossSlotDetail?.earlyDispatchIn?.plants) || 0
    case "crossSlotReleased":
      return Number(slot?.crossSlotDetail?.releasedOut?.plants) || 0
    default:
      return 0
  }
}

export const openSlotManageTab = (plantId, subtypeId, year) => {
  if (!plantId || !subtypeId) return
  const y = year || new Date().getFullYear()
  const url = `${window.location.origin}/u/slots/${plantId}/${subtypeId}?year=${y}`
  window.open(url, "_blank", "noopener,noreferrer")
}
