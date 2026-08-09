/**
 * Normalize plantLineItems from API order / FarmerOrdersTable row.
 * @returns {Array<{ plant: string, subtype: string, qty: number, rate: number, amount: number, deliveryDate?: string }>}
 */
export function getPlantLineItemsFromOrder(order) {
  const raw =
    order?.details?.plantLineItems ||
    order?.plantLineItems ||
    order?.details?.lineItems?.plantLineItems ||
    null
  if (!Array.isArray(raw) || raw.length === 0) return []

  return raw.map((line, idx) => {
    const plant =
      line?.plantNameSnapshot ||
      line?.plantName?.name ||
      (typeof line?.plantName === "string" && !/^[a-f\d]{24}$/i.test(line.plantName)
        ? line.plantName
        : "") ||
      "—"
    const subtype =
      line?.plantSubtypeSnapshot ||
      line?.plantSubtype?.name ||
      line?.plantSubtype?.subtypeName ||
      ""
    const qty = Number(line?.numberOfPlants) || 0
    const rate = Number(line?.rate) || 0
    return {
      key: String(line?._id || idx),
      plant: String(plant).trim() || "—",
      subtype: String(subtype).trim(),
      qty,
      rate,
      amount: qty * rate,
      deliveryDate: line?.deliveryDate || null,
      label: [plant, subtype].filter(Boolean).join(" · ") || "—",
    }
  })
}

export function plantLineItemsSummaryLabel(order, fallback = "") {
  const lines = getPlantLineItemsFromOrder(order)
  if (!lines.length) return fallback
  const head = lines[0].label
  return lines.length > 1 ? `${head} +${lines.length - 1} more` : head
}

export function plantLineItemsTotalAmount(order) {
  const lines = getPlantLineItemsFromOrder(order)
  if (!lines.length) return null
  return lines.reduce((s, l) => s + l.amount, 0)
}
