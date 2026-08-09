/** Helpers to prefill Ram Agri order form for edit and check edit eligibility. */

/** UI label for Ram Agri order # — uses displayOrderKey when set. */
export function formatAgriDisplayOrderKey(row) {
  const key = row?.details?.displayOrderKey ?? row?.displayOrderKey
  if (key != null && key !== "") return String(key).padStart(5, "0")
  const fallback = row?.details?.orderNumber ?? row?.order ?? ""
  if (/^AGR-/i.test(String(fallback))) return String(fallback)
  return String(fallback).padStart(5, "0")
}

export function isRamAgriOrderRow(row) {
  if (!row) return false
  if (row.isAgriSalesOrder || row?.details?.isRamAgriProduct) return true
  const orderNo = String(row?.order ?? row?.details?.orderNumber ?? "").trim()
  return /^AGR-/i.test(orderNo)
}

export function canEditAgriSalesOrderRow(
  row,
  { canEditOrderCore, isRamAgriSalesUser, isRamAgriMasterUser } = {}
) {
  const status = String(row?.orderStatus || row?.details?.orderStatus || "").toUpperCase()
  if (status === "COMPLETED" || status === "CANCELLED") return false
  return Boolean(canEditOrderCore || isRamAgriSalesUser || isRamAgriMasterUser)
}

export function buildProductLinesFromAgriLineItems(lineItems, fallback = {}) {
  const items = Array.isArray(lineItems) ? lineItems : []
  if (!items.length) {
    return [
      {
        ramAgriCropId: fallback.ramAgriCropId || "",
        ramAgriCropName: fallback.ramAgriCropName || fallback.productName || "",
        varietySlots: [
          {
            ramAgriVarietyId: fallback.ramAgriVarietyId || "",
            ramAgriVarietyName: fallback.ramAgriVarietyName || "",
            quantity: fallback.quantity != null ? String(fallback.quantity) : "",
            rate: fallback.rate != null ? String(fallback.rate) : "",
          },
        ],
      },
    ]
  }

  const byCrop = new Map()
  items.forEach((li) => {
    const cropId = li?.ramAgriCropId ? String(li.ramAgriCropId) : "__legacy__"
    if (!byCrop.has(cropId)) {
      byCrop.set(cropId, {
        ramAgriCropId: li?.ramAgriCropId || "",
        ramAgriCropName: li?.ramAgriCropName || "",
        varietySlots: [],
      })
    }
    byCrop.get(cropId).varietySlots.push({
      ramAgriVarietyId: li?.ramAgriVarietyId || "",
      ramAgriVarietyName: li?.ramAgriVarietyName || li?.productName || "",
      quantity: li?.quantity != null ? String(li.quantity) : "",
      rate: li?.rate != null ? String(li.rate) : "",
    })
  })
  return Array.from(byCrop.values())
}

export function buildAgriEditFormStateFromOrderRow(row) {
  const d = row?.details || {}
  const lineItems = d.lineItems?.length
    ? d.lineItems
    : d.productId || d.productName
      ? [
          {
            ramAgriCropId: d.ramAgriCropId,
            ramAgriCropName: d.ramAgriCropName || d.productName,
            ramAgriVarietyId: d.ramAgriVarietyId,
            ramAgriVarietyName: d.ramAgriVarietyName,
            quantity: d.quantity ?? row?.quantity,
            rate: d.rate ?? row?.rate,
          },
        ]
      : []

  return {
    formData: {
      customerName: d.customerName || row?.farmerName || "",
      customerMobile: d.customerMobile ? String(d.customerMobile) : "",
      customerVillage: d.customerVillage || "",
      customerTaluka: d.customerTaluka || "",
      customerDistrict: d.customerDistrict || "",
      customerState: d.customerState || "Maharashtra",
      orderDate: d.orderDate ? new Date(d.orderDate) : d.createdAt ? new Date(d.createdAt) : new Date(),
      deliveryDate: d.deliveryDate ? new Date(d.deliveryDate) : null,
      notes: d.notes || "",
    },
    productLines: buildProductLinesFromAgriLineItems(lineItems, {
      productName: d.productName || row?.plantType,
      quantity: d.quantity ?? row?.quantity,
      rate: d.rate ?? row?.rate,
    }),
    agriSalesPersonId: d.salesPerson?._id || d.salesPerson || d.createdBy || "",
    productType: inferAgriProductTypeFromLineItems(lineItems),
  }
}

function inferAgriProductTypeFromLineItems(lineItems) {
  const first = Array.isArray(lineItems) ? lineItems[0] : null
  const pt = String(first?.productType || first?.ramAgriProductType || "").toLowerCase()
  if (pt.includes("chem")) return "chemical"
  if (pt.includes("gift")) return "gift"
  return "seed"
}
