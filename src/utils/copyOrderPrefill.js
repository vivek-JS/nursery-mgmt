import moment from "moment"
import { getCavityIdString } from "utils/cavityDisplay"

export const COPY_ORDER_PREFILL_KEY = "nurseryCopyOrderPrefill"
export const COPY_ORDER_OPEN_EVENT = "nursery-open-copy-order"

function normalizeOrderFor(orderFor) {
  if (!orderFor || typeof orderFor !== "object" || Array.isArray(orderFor)) return null
  const o = { ...orderFor }
  for (const key of ["state", "district", "taluka", "village"]) {
    const v = o[key]
    if (v != null && typeof v === "object") {
      o[key] = String(v.stateName ?? v.name ?? v.label ?? "").trim()
    }
  }
  return o
}

function parseDeliveryDateToJsDate(deliveryDate, bookingSlot) {
  if (deliveryDate != null && deliveryDate !== "") {
    if (typeof deliveryDate === "object" && deliveryDate.year != null && deliveryDate.month != null) {
      const day = deliveryDate.day ?? deliveryDate.startDay ?? 1
      const m = moment(
        `${deliveryDate.year}-${String(deliveryDate.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        "YYYY-MM-DD"
      )
      if (m.isValid()) return m.toDate()
    }
    const parsed = moment(deliveryDate)
    if (parsed.isValid()) return parsed.toDate()
  }
  const startDay = bookingSlot?.startDay
  if (startDay) {
    const m = moment(startDay, "DD-MM-YYYY", true)
    if (m.isValid()) return m.toDate()
  }
  return null
}

function resolveSalesAttribution(salesPerson, dealerOrder) {
  if (!salesPerson || typeof salesPerson !== "object") return { sales: null, dealer: null }
  const spId = salesPerson._id ?? salesPerson.id
  if (spId == null || spId === "") return { sales: null, dealer: null }
  const id = typeof spId === "string" ? spId : String(spId)
  const job = String(salesPerson.jobTitle || salesPerson.role || "").toUpperCase()
  if (dealerOrder || job === "DEALER") return { sales: null, dealer: id }
  return { sales: id, dealer: null }
}

/**
 * Build AddOrderForm prefill from a dashboard / place-order list row.
 * Clears farmer name and payment; copies plant, slot, qty, rate, location, order-for, dealer flags.
 */
export function buildCopyOrderPrefillFromRow(row) {
  if (!row) return null
  if (row.isAgriSalesOrder || row.details?.isRamAgriProduct) return null

  const d = row.details || {}
  const farmer = d.farmer && typeof d.farmer === "object" ? d.farmer : {}
  const orderFor = normalizeOrderFor(d.orderFor || row.orderFor)
  const plantId = d.plantID ?? row.plantId ?? row.plantID
  const subtypeId = d.plantSubtypeID ?? row.subtypeId ?? row.plantSubtypeID
  if (!plantId || !subtypeId) return null

  const bookingSlot = d.bookingSlot || row.bookingSlot
  const slotId =
    bookingSlot?.slotId ?? bookingSlot?._id ?? bookingSlot?.id ?? bookingSlot?.value ?? null
  const orderDate = parseDeliveryDateToJsDate(d.deliveryDate ?? row.deliveryDateRaw, bookingSlot)
  const cavityId = getCavityIdString(d.cavity ?? row.cavity) || (d.cavityId ? String(d.cavityId) : "")

  const dealerOrder = Boolean(d.dealerOrder ?? row.dealerOrder)
  const { sales, dealer } = resolveSalesAttribution(d.salesPerson, dealerOrder)
  const qty = row.quantity ?? d.numberOfPlants ?? row.totalPlants
  const rateVal = row.rate ?? d.rate

  const componyQuota = d.componyQuota ?? row.componyQuota
  let quotaType = null
  if (dealerOrder) {
    quotaType =
      componyQuota === true || componyQuota === "true" || componyQuota === "True" ? "company" : "dealer"
  }

  const loc = (key, nameKey) => {
    const raw = farmer[key]
    const nameRaw = farmer[nameKey]
    if (raw != null && typeof raw === "object") {
      return String(raw.stateName ?? raw.name ?? raw.label ?? "").trim()
    }
    if (nameRaw != null && typeof nameRaw === "object") {
      return String(nameRaw.stateName ?? nameRaw.name ?? "").trim()
    }
    return String(farmer[nameKey] ?? farmer[key] ?? row[`farmer${key.charAt(0).toUpperCase()}${key.slice(1)}`] ?? "").trim()
  }

  const formData = {
    date: new Date(),
    name: "",
    village: String(farmer.village ?? row.farmerVillage ?? "").trim(),
    taluka: loc("taluka", "talukaName"),
    district: loc("district", "districtName"),
    state: loc("state", "stateName") || "Maharashtra",
    stateName: loc("state", "stateName") || "Maharashtra",
    districtName: loc("district", "districtName"),
    talukaName: loc("taluka", "talukaName"),
    mobileNumber: "",
    noOfPlants: qty != null && qty !== "" ? String(qty) : "",
    typeOfPlant: String(d.typeOfPlants ?? row.typeOfPlants ?? "").trim(),
    rate: rateVal != null && rateVal !== "" ? String(rateVal) : "",
    plant: plantId,
    subtype: subtypeId,
    orderDate,
    transferredSlotId: slotId != null && slotId !== "" ? String(slotId) : null,
    cavity: cavityId,
    sales,
    dealer,
    orderForEnabled: Boolean(String(orderFor?.name || "").trim()),
    orderForName: orderFor?.name || "",
    orderForAddress: orderFor?.address || "",
    orderForMobileNumber: orderFor?.mobileNumber != null ? String(orderFor.mobileNumber) : "",
    orderForState: orderFor?.state || orderFor?.stateName || "Maharashtra",
    orderForStateName: orderFor?.stateName || orderFor?.state || "Maharashtra",
    orderForDistrict: orderFor?.district || orderFor?.districtName || "",
    orderForDistrictName: orderFor?.districtName || orderFor?.district || "",
    orderForTaluka: orderFor?.taluka || orderFor?.talukaName || "",
    orderForTalukaName: orderFor?.talukaName || orderFor?.taluka || "",
    orderForVillage: orderFor?.village || "",
    screenshots: [],
    productName: d.productName ?? row.productName ?? "",
    productMappingId: d.productMappingId ?? row.productMappingId ?? "",
  }

  return {
    formData,
    bulkOrder: dealerOrder,
    quotaType,
    initialPlantId: plantId,
    initialSubtypeId: subtypeId,
    initialSlotId: slotId != null && slotId !== "" ? String(slotId) : null,
    initialStartDay: bookingSlot?.startDay || null,
  }
}

export function saveCopyOrderPrefill(prefill) {
  if (!prefill) return
  sessionStorage.setItem(COPY_ORDER_PREFILL_KEY, JSON.stringify(prefill))
}

export function readAndClearCopyOrderPrefill() {
  try {
    const raw = sessionStorage.getItem(COPY_ORDER_PREFILL_KEY)
    sessionStorage.removeItem(COPY_ORDER_PREFILL_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function dispatchCopyOrderOpen() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COPY_ORDER_OPEN_EVENT))
  }
}
