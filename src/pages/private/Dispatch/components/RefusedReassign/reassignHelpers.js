/** Shared helpers for the refused-delivery reassignment stepper. */

export const REASSIGN_MODES = [
  {
    id: "ALL",
    title: "Gaditle sarv rope dusrya shetkaryanna utarli",
    subtitle: "All plants in the vehicle were given to other farmers",
  },
  {
    id: "SOME",
    title: "Gaditle kahi rope dusrya shetkaryanna utarli",
    subtitle: "Some plants given to other farmers, the rest returned to nursery",
  },
  {
    id: "RETURNED",
    title: "Gadi parat aali",
    subtitle: "Vehicle came back — all plants returned to the nursery",
  },
]

export const orderMongoId = (order) => String(order?._id ?? order?.id ?? "")

export const orderDisplayNumber = (order) => {
  const n =
    order?.order ??
    order?.details?.orderid ??
    order?.details?.orderId ??
    order?.orderId
  if (n != null && String(n).trim() !== "") return String(n).trim().replace(/^#/, "")
  if (order?._id) return String(order._id).slice(-8)
  return "—"
}

export const orderFarmerName = (order) =>
  order?.farmerName ||
  order?.details?.farmer?.name ||
  order?.farmer?.name ||
  "—"

export const orderPlantLabel = (order) => {
  if (order?.plantDetails?.name) return String(order.plantDetails.name)
  const pt = order?.plantType?.name
  const st = order?.plantSubtype?.name
  if (pt && st) return `${pt} · ${st}`
  if (pt) return String(pt)
  if (order?.details?.plant?.name) return String(order.details.plant.name)
  return "—"
}

export const orderRate = (order) =>
  Number(order?.rate ?? order?.details?.rate ?? 0) || 0

export const orderVillage = (order) =>
  order?.details?.farmer?.village || order?.farmer?.village || ""

/** Plants physically loaded on the vehicle for one order (total booked minus what stayed at nursery). */
export const onVehicleQty = (order) => {
  const base = Number(order?.details?.numberOfPlants ?? order?.numberOfPlants ?? 0) || 0
  const add = Number(order?.details?.additionalPlants ?? order?.additionalPlants ?? 0) || 0
  const total = base + add
  const remainingRaw = order?.details?.remainingPlants ?? order?.remainingPlants
  const remaining = Number(remainingRaw)
  if (Number.isFinite(remaining)) return Math.max(0, total - remaining)
  return Math.max(0, total)
}

export const round2 = (n) => Math.round(Number(n || 0) * 100) / 100
