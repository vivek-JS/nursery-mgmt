/** Resolve plant + subtype labels and CMS ids from list or detail order shapes. */

export const resolveMongoId = (v) => {
  if (v == null || v === "") return ""
  if (typeof v === "object") return String(v._id ?? v.id ?? "").trim()
  return String(v).trim()
}

export function orderPlantSubtypeNames(entry) {
  const det = entry?.details || {}
  const line0 = Array.isArray(entry?.plantLineItems) ? entry.plantLineItems[0] : null
  const pn = entry?.plantName
  const plantFromPopulated =
    typeof pn === "object" && pn !== null && !Array.isArray(pn) ? String(pn.name || "").trim() : ""
  const plant =
    entry?.plantType?.name ||
    plantFromPopulated ||
    (typeof entry?.plantName === "string" ? entry.plantName : "") ||
    entry?.plantDetails?.name ||
    line0?.plantNameSnapshot ||
    entry?.plantNameSnapshot ||
    det?.plant?.name ||
    ""
  let subtype =
    entry?.plantSubtype?.name ||
    entry?.plantDetails?.subtypeName ||
    line0?.plantSubtypeSnapshot ||
    entry?.plantSubtypeSnapshot ||
    (typeof det?.plantSubtype === "string" ? det.plantSubtype : det?.plantSubtype?.name) ||
    ""
  if (!subtype && plantFromPopulated && typeof pn === "object" && Array.isArray(pn.subtypes)) {
    const stId = resolveMongoId(entry?.plantSubtype)
    if (stId) {
      subtype =
        pn.subtypes.find((s) => String(s?._id) === stId)?.name ||
        pn.subtypes.find((s) => String(s?.id) === stId)?.name ||
        ""
    }
  }
  return {
    plant: String(plant || "").trim(),
    subtype: String(subtype || "").trim(),
  }
}

export function orderPlantIds(entry) {
  const det = entry?.details || {}
  const line0 = Array.isArray(entry?.plantLineItems) ? entry.plantLineItems[0] : null
  const plantCmsId =
    resolveMongoId(entry?.plantType) ||
    resolveMongoId(entry?.plantNameId) ||
    resolveMongoId(entry?.plantName) ||
    resolveMongoId(line0?.plantName) ||
    resolveMongoId(det?.plantID) ||
    resolveMongoId(det?.plant) ||
    resolveMongoId(entry?.plantId)
  const plantSubtypeId =
    resolveMongoId(entry?.plantSubtype) ||
    resolveMongoId(entry?.plantSubtypeId) ||
    resolveMongoId(line0?.plantSubtype) ||
    resolveMongoId(det?.plantSubtypeID) ||
    resolveMongoId(det?.plantSubtype) ||
    resolveMongoId(entry?.subtypeId) ||
    resolveMongoId(det?.bookingSlot?.subtypeId)
  return { plantCmsId, plantSubtypeId }
}

export function orderPlantDisplayLabel(entry) {
  const { plant, subtype } = orderPlantSubtypeNames(entry)
  if (plant && subtype) return `${plant} · ${subtype}`
  return plant || subtype || "—"
}

/** Unify list-row, GET /dispatched/:id, and nested `details` order shapes for UI + shed APIs. */
export function normalizeDispatchOrderPlantFields(order) {
  if (!order || typeof order !== "object") return order
  const o = { ...order }
  const { plant, subtype } = orderPlantSubtypeNames(o)
  let { plantCmsId, plantSubtypeId } = orderPlantIds(o)

  const pn = o.plantName
  if (typeof pn === "object" && pn !== null && !Array.isArray(pn)) {
    plantCmsId = plantCmsId || resolveMongoId(pn)
    if (!plantSubtypeId) plantSubtypeId = resolveMongoId(o.plantSubtype)
  }
  if (o.plantNameId && !plantCmsId) plantCmsId = resolveMongoId(o.plantNameId)
  if (o.plantSubtypeId && !plantSubtypeId) plantSubtypeId = resolveMongoId(o.plantSubtypeId)

  if (plantCmsId && !o.plantType?._id && !o.plantType?.name) {
    o.plantType = { _id: plantCmsId, name: plant || o.plantType?.name || "" }
  } else if (plantCmsId && o.plantType && !o.plantType._id) {
    o.plantType = { ...o.plantType, _id: plantCmsId, name: o.plantType.name || plant }
  }
  if (plantSubtypeId && !o.plantSubtype?.name) {
    o.plantSubtype = {
      _id: plantSubtypeId,
      name: subtype || (typeof o.plantSubtype === "object" ? o.plantSubtype?.name : "") || "",
    }
  }
  o.plantDetails = {
    ...(o.plantDetails || {}),
    name: plant || o.plantDetails?.name || "",
    subtypeName: subtype || o.plantDetails?.subtypeName || "",
  }
  o.details = {
    ...(o.details || {}),
    plantID: o.details?.plantID || plantCmsId || undefined,
    plantSubtypeID: o.details?.plantSubtypeID || plantSubtypeId || undefined,
    plant: plant ? { name: plant } : o.details?.plant,
    plantSubtype: subtype
      ? { name: subtype }
      : o.details?.plantSubtype,
  }
  return o
}
