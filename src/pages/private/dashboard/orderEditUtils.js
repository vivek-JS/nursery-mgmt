import moment from "moment"
import { getCavityIdString } from "utils/cavityDisplay"

export const ORDER_DATE_DISPLAY = "DD-MMMM-YYYY"

export function startOfTodayMoment() {
  return moment().startOf("day")
}

/** True when the calendar day is strictly before today (local). */
export function isPastCalendarDate(date) {
  if (date == null || date === "") return false
  const m = moment(date)
  if (!m.isValid()) return false
  return m.startOf("day").isBefore(startOfTodayMoment())
}

/** Earliest selectable day within a slot period: max(slot start, today). */
export function initialDeliveryDateFromSlotStart(startDay) {
  if (!startDay || !moment(startDay, "DD-MM-YYYY", true).isValid()) return null
  const slotStart = moment(startDay, "DD-MM-YYYY").startOf("day")
  return moment.max(slotStart, startOfTodayMoment()).toDate()
}

/** Slot still has at least one future/today delivery day. */
export function isSlotEndOnOrAfterToday(slot) {
  if (!slot?.endDay || !moment(slot.endDay, "DD-MM-YYYY", true).isValid()) return false
  return moment(slot.endDay, "DD-MM-YYYY").startOf("day").isSameOrAfter(startOfTodayMoment())
}

export function emptyOrderForEditShape() {
  return {
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

  const curDate = selectedOrder?.details?.deliveryDate
    ? moment(selectedOrder.details.deliveryDate).format(ORDER_DATE_DISPLAY)
    : "Not set"
  const nextDate = updatedObject?.deliveryDate
    ? moment(updatedObject.deliveryDate).format(ORDER_DATE_DISPLAY)
    : curDate
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
  if (date == null || date === "") return ""
  const m = moment(date)
  return m.isValid() ? m.format("YYYY-MM-DD") : ""
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
