import moment from "moment"
import { getCavityIdString } from "utils/cavityDisplay"
import {
  formatIstYmd,
  formatOrderDateDisplay,
  istTodayMoment,
  momentInIst,
  ORDER_DATE_DISPLAY_FORMAT,
} from "utils/istCalendar"
import { slotDayEndMoment, slotDayStartMoment } from "utils/istSlotDate"

export const ORDER_DATE_DISPLAY = ORDER_DATE_DISPLAY_FORMAT

export function startOfTodayMoment() {
  return istTodayMoment()
}

/** True when the calendar day is strictly before today (IST). */
export function isPastCalendarDate(date) {
  const m = momentInIst(date)
  if (!m) return false
  return m.startOf("day").isBefore(istTodayMoment())
}

/** Earliest selectable day within a slot period: max(slot start, today) — IST. */
export function initialDeliveryDateFromSlotStart(startDay) {
  const slotStart = slotDayStartMoment(startDay)
  if (!slotStart) return null
  return moment.max(slotStart, istTodayMoment()).toDate()
}

/** Slot still has at least one future/today delivery day (IST). */
export function isSlotEndOnOrAfterToday(slot) {
  const end = slotDayEndMoment(slot?.endDay)
  if (!end) return false
  return end.isSameOrAfter(istTodayMoment(), "day")
}

export function emptyOrderForEditShape() {
  return {
    farmerId: "",
    name: "",
    village: "",
    mobileNumber: "",
    taluka: "",
    district: "",
    state: "",
    stateName: "",
    districtName: "",
    talukaName: "",
    address: ""
  }
}

export function normalizeOrderFor(orderFor) {
  if (orderFor == null) return null
  if (typeof orderFor === "object" && !Array.isArray(orderFor)) return orderFor
  if (typeof orderFor === "string") {
    try {
      const parsed = JSON.parse(orderFor)
      return typeof parsed === "object" && parsed !== null ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

function normalizeOrderForMobileForCompare(m) {
  if (m == null || m === "") return ""
  const d = String(m).replace(/\D/g, "")
  return d.length >= 10 ? d.slice(-10) : d
}

export function orderForEditMeaningfullyChanged(prevRaw, nextRaw) {
  const a = prevRaw ? { ...emptyOrderForEditShape(), ...normalizeOrderFor(prevRaw) } : { ...emptyOrderForEditShape() }
  const b = nextRaw ? { ...emptyOrderForEditShape(), ...nextRaw } : { ...emptyOrderForEditShape() }
  const keys = [
    "name",
    "village",
    "address",
    "state",
    "stateName",
    "district",
    "districtName",
    "taluka",
    "talukaName"
  ]
  for (const k of keys) {
    if (String(a[k] ?? "").trim() !== String(b[k] ?? "").trim()) return true
  }
  if (normalizeOrderForMobileForCompare(a.mobileNumber) !== normalizeOrderForMobileForCompare(b.mobileNumber)) {
    return true
  }
  return false
}

export function compactOrderForForPatch(raw) {
  if (!raw || typeof raw !== "object") return undefined
  const o = { ...raw }
  Object.keys(o).forEach((k) => {
    const v = o[k]
    if (v === "" || v === null || v === undefined) delete o[k]
  })
  const name = String(o.name || "").trim()
  const village = String(o.village || "").trim()
  const mobDigits = String(o.mobileNumber ?? "").replace(/\D/g, "")
  const hasAddress = String(o.address || "").trim()
  const hasLoc = village || String(o.district || "").trim() || String(o.taluka || "").trim()
  if (!name && !hasLoc && mobDigits.length < 10 && !hasAddress) return undefined
  if (mobDigits.length === 10) {
    o.mobileNumber = parseInt(mobDigits.slice(-10), 10)
  } else if (o.mobileNumber !== undefined) {
    delete o.mobileNumber
  }
  return o
}

export function applyOrderForToPatch(patch, prevOrderForRaw) {
  if (patch == null || patch.orderFor === undefined) return
  const prev = normalizeOrderFor(prevOrderForRaw)
  if (!orderForEditMeaningfullyChanged(prev, patch.orderFor)) {
    delete patch.orderFor
    return
  }
  const compact = compactOrderForForPatch(patch.orderFor)
  if (compact) {
    patch.orderFor = compact
  } else if (prev) {
    patch.orderFor = null
  } else {
    delete patch.orderFor
  }
}

export function classifyOrderForChange(prevRaw, nextRaw) {
  const prev = prevRaw ? { ...emptyOrderForEditShape(), ...normalizeOrderFor(prevRaw) } : { ...emptyOrderForEditShape() }
  const next = nextRaw ? { ...emptyOrderForEditShape(), ...nextRaw } : { ...emptyOrderForEditShape() }
  const nameChanged = String(prev.name ?? "").trim() !== String(next.name ?? "").trim()
  const mobileChanged =
    normalizeOrderForMobileForCompare(prev.mobileNumber) !==
    normalizeOrderForMobileForCompare(next.mobileNumber)
  const locKeys = ["village", "address", "state", "stateName", "district", "districtName", "taluka", "talukaName"]
  const locationChanged = locKeys.some(
    (k) => String(prev[k] ?? "").trim() !== String(next[k] ?? "").trim()
  )
  return { nameChanged, mobileChanged, locationChanged }
}

function hasFullOrderForLocation(orderFor) {
  if (!orderFor || typeof orderFor !== "object") return false
  const name = String(orderFor.name || "").trim()
  const village = String(orderFor.village || "").trim()
  const taluka = String(orderFor.taluka || orderFor.talukaName || "").trim()
  const district = String(orderFor.district || orderFor.districtName || "").trim()
  const state = String(orderFor.state || orderFor.stateName || "").trim()
  return Boolean(name && village && taluka && district && state)
}

/** Booking farmer display name (split book-for preview + order list). */
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
  if (fb && fb !== "—") return fb
  return "Unknown"
}

export function formatBookForLocationLine(draft) {
  return [draft?.village, draft?.talukaName || draft?.taluka, draft?.districtName || draft?.district]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(", ")
}

export function mapFarmerToOrderFor(farmer) {
  if (!farmer || typeof farmer !== "object") return { ...emptyOrderForEditShape() }
  const state = farmer.stateName || farmer.state || ""
  const district = farmer.districtName || farmer.district || ""
  const taluka = farmer.talukaName || farmer.taluka || ""
  const mobDigits = String(farmer.mobileNumber ?? "").replace(/\D/g, "")
  return {
    ...emptyOrderForEditShape(),
    farmerId: farmer._id ? String(farmer._id) : "",
    name: farmer.name || "",
    village: farmer.village || "",
    taluka,
    talukaName: taluka,
    district,
    districtName: district,
    state,
    stateName: state,
    ...(mobDigits.length === 10 ? { mobileNumber: mobDigits.slice(-10) } : {})
  }
}

export function validateOrderForBeneficiaryEdit(prevRaw, nextRaw, options = {}) {
  const prev = prevRaw ? { ...emptyOrderForEditShape(), ...normalizeOrderFor(prevRaw) } : { ...emptyOrderForEditShape() }
  const next = nextRaw ? { ...emptyOrderForEditShape(), ...nextRaw } : { ...emptyOrderForEditShape() }
  const { mode = "new" } = options
  const change = classifyOrderForChange(prev, next)

  if (!change.nameChanged && !change.mobileChanged && !change.locationChanged) {
    return { ok: false, noChanges: true, message: "No beneficiary changes to save" }
  }

  if (mode === "existing" || hasFullOrderForLocation(next)) {
    if (!hasFullOrderForLocation(next)) {
      return {
        ok: false,
        message:
          "Farmer record is incomplete. Use New farmer mode to enter name, village, taluka, district, and state."
      }
    }
    return { ok: true, editType: "existing_farmer" }
  }

  const nextMobile = normalizeOrderForMobileForCompare(next.mobileNumber)
  const prevMobile = normalizeOrderForMobileForCompare(prev.mobileNumber)
  const mobileEnteredOrChanged = nextMobile.length === 10 && nextMobile !== prevMobile

  if (mobileEnteredOrChanged) {
    if (!hasFullOrderForLocation(next)) {
      return {
        ok: false,
        message:
          "When mobile number is set, beneficiary name, village, taluka, district, and state are required."
      }
    }
    return { ok: true, editType: "new_farmer_full" }
  }

  if (!String(next.name || "").trim()) {
    return { ok: false, message: "Beneficiary name is required." }
  }

  return { ok: true, editType: "name_only" }
}

export function buildOrderForPatchForSplitBeneficiary(prevRaw, draft, options = {}) {
  const prev = normalizeOrderFor(prevRaw)
  const next = { ...emptyOrderForEditShape(), ...draft }
  const { mode = "new" } = options
  const validation = validateOrderForBeneficiaryEdit(prev, next, { mode })
  if (!validation.ok) return { ok: false, ...validation }

  let orderFor
  if (mode === "existing" || validation.editType === "existing_farmer" || validation.editType === "new_farmer_full") {
    orderFor = compactOrderForForPatch(next)
  } else {
    orderFor = { name: String(next.name || "").trim() }
  }

  if (!orderFor) {
    return { ok: false, message: "Invalid beneficiary details" }
  }

  return { ok: true, orderFor, editType: validation.editType }
}

export function newFarmerRequiresLocation(draft, prevRaw) {
  const prev = prevRaw ? { ...emptyOrderForEditShape(), ...normalizeOrderFor(prevRaw) } : { ...emptyOrderForEditShape() }
  const next = { ...emptyOrderForEditShape(), ...draft }
  const nextMobile = normalizeOrderForMobileForCompare(next.mobileNumber)
  const prevMobile = normalizeOrderForMobileForCompare(prev.mobileNumber)
  return nextMobile.length === 10 && nextMobile !== prevMobile
}

/** Book-for draft: copy booking farmer location; user enters beneficiary name only. */
export function bookForDraftFromBookingFarmer(bookingFarmer) {
  const base =
    bookingFarmer && typeof bookingFarmer === "object"
      ? mapFarmerToOrderFor(bookingFarmer)
      : { ...emptyOrderForEditShape() }
  return { ...base, name: "", farmerId: "", mobileNumber: "" }
}

/** Split assign: existing | new (full location + mobile) | bookfor (AddOrderForm-style). */
export function validateSplitAssignMode(assignMode, draft) {
  const next = { ...emptyOrderForEditShape(), ...draft }

  if (assignMode === "bookfor") {
    if (!String(next.name || "").trim()) {
      return { ok: false, message: "Please enter name for the person the order is for." }
    }
    const mob = normalizeOrderForMobileForCompare(next.mobileNumber)
    if (mob.length > 0 && mob.length !== 10) {
      return { ok: false, message: "If entered, book-for mobile must be exactly 10 digits." }
    }
    const orderFor = compactOrderForForPatch(next)
    if (!orderFor) return { ok: false, message: "Invalid book-for details." }
    return { ok: true, orderFor, editType: "bookfor" }
  }

  if (assignMode === "new") {
    if (!hasFullOrderForLocation(next)) {
      return {
        ok: false,
        message: "New farmer requires name, village, taluka, district, and state.",
      }
    }
    const mob = normalizeOrderForMobileForCompare(next.mobileNumber)
    if (mob.length !== 10) {
      return { ok: false, message: "New farmer requires a 10-digit mobile number." }
    }
    const orderFor = compactOrderForForPatch(next)
    if (!orderFor) return { ok: false, message: "Invalid new farmer details." }
    return { ok: true, orderFor, editType: "new_farmer_full" }
  }

  if (assignMode === "existing") {
    if (!String(next.farmerId || "").trim()) {
      return { ok: false, message: "Search and select an existing farmer." }
    }
    return { ok: true, farmerId: String(next.farmerId).trim(), editType: "existing_farmer" }
  }

  return { ok: false, message: "Invalid assign mode." }
}

/** Build POST /order/:id/split body including optional beneficiary assign. */
function buildSplitAttributionSlice(order) {
  const details = order?.details || order || {}
  const dealerOrder = Boolean(details.dealerOrder ?? order?.dealerOrder)
  const dealerRaw = details.dealer ?? order?.dealer
  const salesRaw = details.salesPerson ?? order?.salesPerson
  const dealerId = dealerRaw?._id ?? dealerRaw ?? ""
  const salesPersonId = salesRaw?._id ?? salesRaw ?? ""
  const dealerName = dealerRaw?.name ?? details.dealerName ?? ""
  const salesName = salesRaw?.name ?? details.salesPersonName ?? ""

  if (dealerOrder && dealerId) {
    return {
      attributionMode: "dealer",
      attributionId: String(dealerId),
      attributionLabel: dealerName || "Dealer",
      dealerOrder: true,
      dealer: String(dealerId),
      salesPerson: salesPersonId ? String(salesPersonId) : String(dealerId),
    }
  }
  if (salesPersonId) {
    return {
      attributionMode: "sales",
      attributionId: String(salesPersonId),
      attributionLabel: salesName || "Sales person",
      dealerOrder: false,
      dealer: "",
      salesPerson: String(salesPersonId),
    }
  }
  return {
    attributionMode: "sales",
    attributionId: "",
    attributionLabel: "—",
    dealerOrder: false,
    dealer: "",
    salesPerson: "",
  }
}

export function resolveSplitAttributionFromOrder(order) {
  const originalAttribution = buildSplitAttributionSlice(order)
  return {
    useOriginalAttribution: true,
    originalAttribution,
    childAttribution: { ...originalAttribution },
    ...originalAttribution,
  }
}

/** Human-readable split attribution from splitHistory audit snapshot. */
export function formatSplitAttributionLineage(entry) {
  if (!entry || typeof entry !== "object") return ""
  const parts = []
  if (entry.performedByName) parts.push(`By ${entry.performedByName}`)
  const orig =
    entry.originalDealerOrder && entry.originalDealerName
      ? entry.originalDealerName
      : entry.originalSalesPersonName || entry.originalDealerName || ""
  const child =
    entry.childDealerOrder && entry.childDealerName
      ? entry.childDealerName
      : entry.childSalesPersonName || entry.childDealerName || ""
  if (orig && child && orig !== child) {
    parts.push(`Original: ${orig} → Child: ${child}`)
  } else if (child) {
    parts.push(`Booked by: ${child}`)
  }
  return parts.join(" · ")
}

export function buildSplitOrderRequestPayload({
  splitQuantity,
  notes,
  assignEnabled,
  assignMode,
  assignDraft,
  useOriginalAttribution = true,
  attributionMode,
  attributionId,
  dealerOrder,
}) {
  const payload = {
    splitQuantity,
    ...(String(notes || "").trim() ? { notes: String(notes).trim() } : {}),
  }

  if (!useOriginalAttribution) {
    if (attributionMode === "dealer" && attributionId) {
      payload.dealer = attributionId
      payload.dealerOrder = true
      payload.salesPerson = attributionId
    } else if (attributionMode === "sales" && attributionId) {
      payload.salesPerson = attributionId
      payload.dealerOrder = Boolean(dealerOrder)
    }
  }

  if (!assignEnabled) {
    return { ok: true, payload }
  }

  const assignCheck = validateSplitAssignMode(assignMode, assignDraft)
  if (!assignCheck.ok) {
    return { ok: false, message: assignCheck.message || "Complete farmer details" }
  }

  payload.assignMode = assignMode
  if (assignCheck.farmerId) payload.farmerId = assignCheck.farmerId
  if (assignCheck.orderFor) payload.orderFor = assignCheck.orderFor
  return { ok: true, payload }
}

export function parseDeltaInput(raw) {
  const txt = (raw ?? "").toString().trim()
  if (!txt) return { valid: true, delta: 0, display: "0" }

  if (!/^[+-]?\d+$/.test(txt)) {
    return { valid: false, delta: 0, error: "Enter delta like +500 or -300" }
  }

  const delta = Number(txt.startsWith("+") || txt.startsWith("-") ? txt : `+${txt}`)
  if (!Number.isFinite(delta)) {
    return { valid: false, delta: 0, error: "Invalid delta value" }
  }

  return {
    valid: true,
    delta,
    display: `${delta > 0 ? "+" : ""}${delta.toLocaleString("en-IN")}`
  }
}

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

export function buildOrderEditState(selectedOrder, { resolvePlantCounts, canEditPlantSubtype }) {
  if (!selectedOrder?.details?.orderid) return null
  const { base } = resolvePlantCounts(selectedOrder)
  const rof = normalizeOrderFor(selectedOrder.details?.orderFor)
  return {
    rate: selectedOrder.rate,
    quantity: base,
    bookingSlot: selectedOrder?.details?.bookingSlot?.slotId,
    deliveryDate: selectedOrder?.details?.deliveryDate
      ? new Date(selectedOrder.details.deliveryDate)
      : null,
    salesPerson: selectedOrder?.details?.salesPerson?._id
      ? String(selectedOrder.details.salesPerson._id)
      : "",
    orderFor: rof ? { ...emptyOrderForEditShape(), ...rof } : { ...emptyOrderForEditShape() },
    expectedNursery: selectedOrder?.details?.expectedNursery
      ? String(selectedOrder.details.expectedNursery).trim().toUpperCase()
      : "RB",
    cavity: getCavityIdString(selectedOrder.details?.cavity) || "",
    ...(canEditPlantSubtype &&
    selectedOrder?.details?.plantSubtypeID &&
    !selectedOrder?.isAgriSalesOrder &&
    !selectedOrder?.details?.isRamAgriProduct
      ? { plantSubtype: String(selectedOrder.details.plantSubtypeID) }
      : {})
  }
}

export function hasOrderEditChanges(
  selectedOrder,
  updatedObject,
  quantityDeltaInput,
  { canEditPlantSubtype }
) {
  if (!selectedOrder || !updatedObject) return false

  const parsed = parseDeltaInput(quantityDeltaInput)
  if (parsed.valid && parsed.delta !== 0) return true

  const currentRate = Number(selectedOrder?.rate || 0)
  const nextRate = Number(
    updatedObject?.rate !== undefined ? updatedObject.rate : selectedOrder?.rate
  )
  if (Number.isFinite(nextRate) && nextRate !== currentRate) return true

  const origCavity = getCavityIdString(selectedOrder.details?.cavity) || ""
  const nextCavity =
    updatedObject?.cavity != null ? String(updatedObject.cavity) : origCavity
  if (nextCavity !== origCavity) return true

  const curDate = selectedOrder?.details?.deliveryDate
    ? moment(selectedOrder.details.deliveryDate).format("YYYY-MM-DD")
    : ""
  const nextDate = updatedObject?.deliveryDate
    ? moment(updatedObject.deliveryDate).format("YYYY-MM-DD")
    : ""
  if (curDate !== nextDate) return true

  const curSlot = String(selectedOrder?.details?.bookingSlot?.slotId || "")
  const nextSlot =
    updatedObject?.bookingSlot != null ? String(updatedObject.bookingSlot) : curSlot
  if (nextSlot !== curSlot) return true

  const origSub = String(selectedOrder?.details?.plantSubtypeID || "")
  const nextSub =
    updatedObject?.plantSubtype != null
      ? String(updatedObject.plantSubtype)
      : origSub
  if (canEditPlantSubtype && origSub && nextSub && origSub !== nextSub) return true

  const origExpectedNursery = selectedOrder?.details?.expectedNursery
    ? String(selectedOrder.details.expectedNursery).trim().toUpperCase()
    : "RB"
  const nextExpectedNursery =
    updatedObject?.expectedNursery != null && String(updatedObject.expectedNursery).trim() !== ""
      ? String(updatedObject.expectedNursery).trim().toUpperCase()
      : "RB"
  if (origExpectedNursery !== nextExpectedNursery) return true

  const curSpId = String(selectedOrder?.details?.salesPerson?._id || "")
  const nextSpId = updatedObject?.salesPerson != null ? String(updatedObject.salesPerson) : curSpId
  if (nextSpId && nextSpId !== curSpId) return true

  if (
    orderForEditMeaningfullyChanged(selectedOrder?.details?.orderFor, updatedObject?.orderFor)
  ) {
    return true
  }

  return false
}

/** Structured diff rows for the edit panel preview. */
export function computeOrderEditChangeItems({
  selectedOrder,
  updatedObject,
  quantityDeltaInput,
  editBaseQuantity,
  editFinalQuantity,
  orderEditSubtypes,
  orderEditTrays,
  salesPeople,
  canEditPlantSubtype,
  canReassignSalesPerson,
  getSlotDetailsForDate
}) {
  if (!selectedOrder || !updatedObject) return []

  const items = []
  const parsed = parseDeltaInput(quantityDeltaInput)

  const currentRate = Number(selectedOrder?.rate || 0)
  const nextRate = Number(
    updatedObject?.rate !== undefined ? updatedObject.rate : selectedOrder?.rate
  )
  if (nextRate !== currentRate) {
    items.push({
      key: "rate",
      label: "Rate",
      from: `₹${currentRate}`,
      to: `₹${nextRate}`
    })
  }

  if (parsed.valid && parsed.delta !== 0) {
    const deltaSign = parsed.delta > 0 ? "+" : ""
    items.push({
      key: "qty",
      label: "Quantity",
      from: editBaseQuantity.toLocaleString("en-IN"),
      to: `${editBaseQuantity.toLocaleString("en-IN")} ${deltaSign}${parsed.delta.toLocaleString("en-IN")} → ${editFinalQuantity.toLocaleString("en-IN")}`
    })
  }

  const origCavity = getCavityIdString(selectedOrder.details?.cavity) || ""
  const nextCavity =
    updatedObject?.cavity != null ? String(updatedObject.cavity) : origCavity
  if (origCavity !== nextCavity) {
    items.push({
      key: "cavity",
      label: "Tray / cavity",
      from: resolveTrayLabelById(origCavity, orderEditTrays),
      to: resolveTrayLabelById(nextCavity, orderEditTrays)
    })
  }

  const curDate = formatOrderDateDisplay(selectedOrder?.details?.deliveryDate, "Not set")
  const nextDate = formatOrderDateDisplay(updatedObject?.deliveryDate, curDate)
  if (updatedObject?.deliveryDate && curDate !== nextDate) {
    const slotDetails = getSlotDetailsForDate?.(updatedObject.deliveryDate)
    const period = slotDetails ? `${slotDetails.startDay} – ${slotDetails.endDay}` : ""
    items.push({
      key: "delivery",
      label: "Delivery date",
      from: curDate,
      to: period ? `${nextDate} (${period})` : nextDate
    })
  }

  const origSub = String(selectedOrder?.details?.plantSubtypeID || "")
  const nextSub =
    updatedObject?.plantSubtype != null ? String(updatedObject.plantSubtype) : origSub
  if (canEditPlantSubtype && origSub && nextSub && origSub !== nextSub) {
    const prevName =
      orderEditSubtypes?.find((s) => String(s.value) === origSub)?.label ||
      (selectedOrder?.plantType || "").split(" -> ")[1]?.trim() ||
      "—"
    const nextName =
      orderEditSubtypes?.find((s) => String(s.value) === nextSub)?.label || "—"
    items.push({ key: "subtype", label: "Subtype", from: prevName, to: nextName })
  }

  const origNursery = selectedOrder?.details?.expectedNursery
    ? String(selectedOrder.details.expectedNursery).trim().toUpperCase()
    : "RB"
  const nextNursery =
    updatedObject?.expectedNursery != null && String(updatedObject.expectedNursery).trim() !== ""
      ? String(updatedObject.expectedNursery).trim().toUpperCase()
      : "RB"
  if (origNursery !== nextNursery) {
    items.push({ key: "nursery", label: "Nursery", from: origNursery, to: nextNursery })
  }

  const curSpId = selectedOrder?.details?.salesPerson?._id
  const nextSpId = updatedObject?.salesPerson
  if (canReassignSalesPerson && nextSpId && String(nextSpId) !== String(curSpId || "")) {
    const curName = selectedOrder?.details?.salesPerson?.name || "—"
    const nextOpt = (salesPeople || []).find((s) => String(s.value) === String(nextSpId))
    items.push({
      key: "sales",
      label: "Sales person",
      from: curName,
      to: nextOpt?.label || "—"
    })
  }

  if (
    orderForEditMeaningfullyChanged(selectedOrder?.details?.orderFor, updatedObject?.orderFor)
  ) {
    items.push({
      key: "bookfor",
      label: "Book-for",
      from: "Previous",
      to: "Updated beneficiary details"
    })
  }

  return items
}

export function formatOrderEditDeliveryDateKey(date) {
  return formatIstYmd(date)
}

/** True when the user changed delivery date vs what is saved on the order. */
export function orderEditDeliveryDateChanged(selectedOrder, updatedObject) {
  const cur = formatOrderEditDeliveryDateKey(selectedOrder?.details?.deliveryDate)
  const next = formatOrderEditDeliveryDateKey(updatedObject?.deliveryDate)
  return cur !== next
}

/** Drop unchanged delivery/slot/qty from PATCH payload (avoids spurious API validation). */
export function stripUnchangedOrderEditFields(payload, selectedOrder, parsedDelta) {
  if (!payload || !selectedOrder) return payload

  if (Number(parsedDelta?.delta || 0) === 0) {
    delete payload.quantity
  }

  const curSlot = String(selectedOrder?.details?.bookingSlot?.slotId || "")
  const nextSlot = payload.bookingSlot != null ? String(payload.bookingSlot) : curSlot
  if (nextSlot === curSlot) {
    delete payload.bookingSlot
  }

  if (!orderEditDeliveryDateChanged(selectedOrder, payload)) {
    delete payload.deliveryDate
  }

  return payload
}

export function validateOrderEditSave({
  selectedOrder,
  updatedObject,
  quantityDeltaInput,
  editBaseQuantity,
  canEditOrderPlantQuantity,
  canEditPlantSubtype,
  canReassignSalesPerson,
  orderEditSubtypes,
  orderEditTrays,
  salesPeople,
  getSlotDetailsForDate
}) {
  const parsedDelta = parseDeltaInput(quantityDeltaInput)
  if (!parsedDelta.valid) {
    return { ok: false, message: parsedDelta.error || "Invalid quantity delta" }
  }

  if (
    !canEditOrderPlantQuantity(selectedOrder?.orderStatus) &&
    Number(parsedDelta.delta || 0) !== 0
  ) {
    return {
      ok: false,
      message:
        "Plant quantity cannot be changed after Ready for dispatch or for completed/cancelled orders."
    }
  }

  const finalQuantity = Number(editBaseQuantity) + Number(parsedDelta.delta || 0)
  const isDealerBulkEdit = Boolean(selectedOrder?.details?.dealerOrder)
  if (!Number.isFinite(finalQuantity) || finalQuantity < 0) {
    return { ok: false, message: "Invalid quantity" }
  }
  if (finalQuantity <= 0 && !isDealerBulkEdit) {
    return { ok: false, message: "Final quantity must be greater than 0" }
  }

  const currentRate = Number(selectedOrder?.rate || 0)
  const nextRate = Number(
    updatedObject?.rate !== undefined ? updatedObject.rate : selectedOrder?.rate
  )
  if (!Number.isFinite(nextRate) || nextRate < 0) {
    return { ok: false, message: "Rate cannot be negative" }
  }
  if (!isDealerBulkEdit && nextRate <= 0) {
    return { ok: false, message: "Rate must be greater than 0" }
  }

  if (
    selectedOrder?.details?.isSplit &&
    orderForEditMeaningfullyChanged(selectedOrder?.details?.orderFor, updatedObject?.orderFor)
  ) {
    const beneficiaryCheck = validateOrderForBeneficiaryEdit(
      selectedOrder?.details?.orderFor,
      updatedObject?.orderFor,
      { mode: "new" }
    )
    if (!beneficiaryCheck.ok && !beneficiaryCheck.noChanges) {
      return { ok: false, message: beneficiaryCheck.message || "Invalid beneficiary details" }
    }
  }

  const payloadForSave = {
    id: selectedOrder?.details?.orderid,
    ...updatedObject,
    rate: nextRate,
    quantity: finalQuantity
  }
  applyOrderForToPatch(payloadForSave, selectedOrder?.details?.orderFor)
  if (!canReassignSalesPerson) {
    delete payloadForSave.salesPerson
  }

  const origCavity = getCavityIdString(selectedOrder.details?.cavity) || ""
  const nextCavity =
    updatedObject?.cavity != null ? String(updatedObject.cavity) : origCavity
  if (nextCavity !== origCavity) {
    payloadForSave.cavity = nextCavity || null
  } else {
    delete payloadForSave.cavity
  }

  const origSub = String(selectedOrder?.details?.plantSubtypeID || "")
  const nextSub =
    updatedObject?.plantSubtype != null ? String(updatedObject.plantSubtype) : origSub
  if (
    canEditPlantSubtype &&
    origSub &&
    nextSub &&
    origSub !== nextSub &&
    (!updatedObject?.bookingSlot || !updatedObject?.deliveryDate)
  ) {
    return {
      ok: false,
      message: "Select a delivery date and slot for the new plant subtype before saving."
    }
  }

  if (
    orderEditDeliveryDateChanged(selectedOrder, updatedObject) &&
    updatedObject?.deliveryDate &&
    isPastCalendarDate(updatedObject.deliveryDate)
  ) {
    return { ok: false, message: "Delivery date cannot be in the past." }
  }

  stripUnchangedOrderEditFields(payloadForSave, selectedOrder, parsedDelta)

  const changeItems = computeOrderEditChangeItems({
    selectedOrder,
    updatedObject,
    quantityDeltaInput,
    editBaseQuantity,
    editFinalQuantity: finalQuantity,
    orderEditSubtypes,
    orderEditTrays,
    salesPeople,
    canEditPlantSubtype,
    canReassignSalesPerson,
    getSlotDetailsForDate
  })

  if (changeItems.length === 0) {
    return { ok: false, message: "No changes to save", noChanges: true }
  }

  const changeLines = changeItems.map((c) => `${c.label}: ${c.from} → ${c.to}`)

  return { ok: true, payload: payloadForSave, changeItems, changeLines }
}
