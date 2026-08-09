import { getCavityIdString } from "utils/cavityDisplay"

const cavityKey = (v) => (v != null && v !== "" ? String(v) : "")

export function getTrayOptionId(tray) {
  if (!tray) return ""
  return String(tray._id ?? tray.id ?? "").trim()
}

export function getTrayOptionLabel(tray) {
  if (!tray) return ""
  const name = tray.name != null ? String(tray.name).trim() : ""
  if (name) return name
  if (tray.cavity != null && String(tray.cavity).trim() !== "") {
    return `${tray.cavity}-cell tray`
  }
  return getTrayOptionId(tray) || "Tray"
}

export function resolveTrayLabelById(trayId, trays) {
  if (!trayId) return "Not set"
  const t = (trays || []).find((x) => getTrayOptionId(x) === String(trayId))
  return t ? getTrayOptionLabel(t) : String(trayId)
}

export function getOrderCavityIdFromRow(order) {
  const d = order?.details
  if (!d) return ""
  return getCavityIdString(d.cavity) || cavityKey(d.cavityId)
}

/** PATCH /order/updateOrder payload for tray change only. */
export function buildOrderCavityPatch(order, newTrayId) {
  const id =
    order?.details?.orderid ||
    order?.details?.orderId ||
    order?._id ||
    order?.id
  const numberOfPlants = Number(
    order?.details?.remainingPlants ?? order?.quantity ?? order?.numberOfPlants ?? 0
  )
  return {
    id,
    cavity: newTrayId || null,
    numberOfPlants,
  }
}

/** Merge tray master row onto dispatch order row details. */
export function applyTrayToOrderDetails(details, tray, getId) {
  if (!details) return details
  const trayId = tray && typeof getId === "function" ? getId(tray) : getTrayOptionId(tray)
  if (!trayId) {
    return {
      ...details,
      cavity: null,
      cavityId: undefined,
      cavityName: "No tray on order",
    }
  }
  return {
    ...details,
    cavity: tray,
    cavityId: trayId,
    cavityName: getTrayOptionLabel(tray),
  }
}

/** Patch one order row in a Map keyed by orderRowKey. */
export function patchOrderInMap(ordersMap, rowKey, updatedOrder) {
  if (!ordersMap || !rowKey || !updatedOrder) return ordersMap
  const next = new Map(ordersMap)
  next.set(rowKey, updatedOrder)
  return next
}

/**
 * After order cavity PATCH, sync matching plant cavityGroup and recalculate crate lines.
 */
export function syncPlantGroupsAfterOrderCavityChange({
  plants,
  orderRowKeyStr,
  oldCavityKey,
  newTray,
  getId,
  buildDisplayCrateLines,
}) {
  if (!Array.isArray(plants) || !newTray || !orderRowKeyStr) return plants

  const newTrayId = typeof getId === "function" ? getId(newTray) : getTrayOptionId(newTray)
  const cavitySize = Number(newTray.cavity) || 1
  const numberPerCrate = Number(newTray.numberPerCrate) || 1
  const cavityName = getTrayOptionLabel(newTray)

  return plants.map((plant) => {
    const hasOrder = (plant.orders || []).some((o) => {
      const id =
        o?.details?.orderid ||
        o?.details?.orderId ||
        o?._id ||
        o?.id
      return id != null && String(id) === String(orderRowKeyStr)
    })
    if (!hasOrder) return plant

    const groups = [...(plant.cavityGroups || [])]
    let groupIndex = groups.findIndex(
      (g) => cavityKey(g.cavity) === cavityKey(oldCavityKey)
    )
    if (groupIndex < 0 && groups.length === 1) {
      groupIndex = 0
    }
    if (groupIndex < 0) return plant

    const group = { ...groups[groupIndex] }
    group.cavity = newTrayId
    group.cavityName = cavityName
    group.cavitySize = cavitySize
    group.numberPerCrate = numberPerCrate

    group.pickupDetails = (group.pickupDetails || []).map((d) => ({
      ...d,
      cavity: newTrayId,
      cavityName: cavityName,
    }))

    const totalQty = group.pickupDetails.reduce(
      (s, d) => s + Number(d.quantity || 0),
      0
    )
    group.crates =
      totalQty > 0
        ? buildDisplayCrateLines(totalQty, cavitySize, numberPerCrate)
        : []

    groups[groupIndex] = group
    return { ...plant, cavityGroups: groups }
  })
}
