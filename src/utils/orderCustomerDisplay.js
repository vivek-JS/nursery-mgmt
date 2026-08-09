/** Book-for-someone-else display helpers (web + mobile aligned). */

export function normalizeOrderFor(orderFor) {
  if (orderFor == null) return null
  if (typeof orderFor === "object" && !Array.isArray(orderFor)) return orderFor
  if (typeof orderFor === "string") {
    const t = orderFor.trim()
    if (!t) return null
    try {
      const parsed = JSON.parse(t)
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

export function resolveOrderFarmerObject(order) {
  const f = order?.farmer ?? order?.details?.farmer
  if (f && typeof f === "object" && !Array.isArray(f)) return f
  if (Array.isArray(f) && f[0] && typeof f[0] === "object") return f[0]
  return null
}

export function normalizeOrderForCustomer(orderFor) {
  const of = normalizeOrderFor(orderFor)
  if (!of) return null
  const name = String(of.name || "").trim()
  if (!name) return null
  return {
    name,
    mobileNumber: of.mobileNumber,
    village: String(of.village || of.villageName || "").trim(),
    taluka: String(of.talukaName || of.taluka || "").trim(),
    district: String(of.districtName || of.district || "").trim(),
  }
}

export function formatOrderCustomerLocation(person) {
  if (!person || typeof person !== "object") return ""
  const parts = [person.village, person.district].filter((x) => x != null && String(x).trim() !== "")
  return parts.join(", ")
}

export function resolveBookedByName(bookingFarmer, fallbackName) {
  if (bookingFarmer && typeof bookingFarmer === "object" && !Array.isArray(bookingFarmer)) {
    const n = String(bookingFarmer.name || "").trim()
    if (n) return n
  }
  if (Array.isArray(bookingFarmer) && bookingFarmer[0] && typeof bookingFarmer[0] === "object") {
    const n = String(bookingFarmer[0].name || "").trim()
    if (n) return n
  }
  const fb = String(fallbackName || "").trim()
  return fb || "Unknown"
}

/** Single-line label: beneficiary · Booking: booked-by farmer. */
export function formatOrderFarmerDisplayName(order) {
  const orderFor = normalizeOrderFor(order?.orderFor ?? order?.details?.orderFor)
  const farmer = resolveOrderFarmerObject(order)
  if (orderFor?.name) {
    const bookedBy = resolveBookedByName(farmer, order?.farmerName)
    return `${String(orderFor.name).trim()} · Booking: ${bookedBy}`
  }
  if (order?.dealerOrder) {
    const sp = order?.salesPerson ?? order?.details?.salesPerson
    const nm = typeof sp === "object" && sp != null ? String(sp.name || "").trim() : ""
    if (nm) return `via ${nm}`
    if (typeof order?.farmerName === "string" && order.farmerName.trim()) return order.farmerName.trim()
    return "Dealer"
  }
  if (farmer?.name) return String(farmer.name).trim()
  if (typeof order?.farmerName === "string" && order.farmerName.trim()) return order.farmerName.trim()
  return ""
}

/** Primary customer name + optional booking farmer line for tables. */
export function resolveOrderCustomerCell({ orderFor, farmer }) {
  const of = normalizeOrderForCustomer(orderFor)
  const f = farmer && typeof farmer === "object" ? farmer : null
  if (of) {
    const bookingName = resolveBookedByName(f, "")
    return {
      primaryName: of.name,
      secondaryLine: bookingName && bookingName !== "Unknown" ? `Booking: ${bookingName}` : "",
      locationLine: formatOrderCustomerLocation(of) || formatOrderCustomerLocation(f),
      orderFor: of,
      bookingFarmer: f,
    }
  }
  return {
    primaryName: String(f?.name || "—").trim() || "—",
    secondaryLine: "",
    locationLine: formatOrderCustomerLocation(f),
    orderFor: null,
    bookingFarmer: f,
  }
}
