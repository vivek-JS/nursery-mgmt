/**
 * Resolve populated DispatchBatch from GET /outwards list items (`plantOutward.batchId`).
 * @param {Array<{ batchId?: unknown }>} outwardDocs
 * @param {string|import("mongoose").Types.ObjectId|null|undefined} batchId
 */
export function dispatchBatchFromOutwardList(outwardDocs, batchId) {
  if (batchId == null || !Array.isArray(outwardDocs)) return null;
  const entry = outwardDocs.find(
    (b) => String(b.batchId?._id ?? b.batchId) === String(batchId)
  );
  return entry?.batchId && typeof entry.batchId === "object" ? entry.batchId : null;
}

/**
 * @param {Array<{ batchId?: unknown }>} outwardDocs
 * @param {string|import("mongoose").Types.ObjectId|null|undefined} batchId
 */
export function batchPlantSubtypeLabelFromList(outwardDocs, batchId) {
  return batchPlantSubtypeLabel(dispatchBatchFromOutwardList(outwardDocs, batchId));
}

/**
 * Labels for dispatch batch plant + subtype (from populated GET /outwards batchId).
 * @param {object | null | undefined} batch – DispatchBatch with optional populated plantCmsId { name, subtypes }
 * @param {string|import("mongoose").Types.ObjectId} [batch.plantSubtypeId]
 */
export function batchPlantSubtypeLabel(batch) {
  if (!batch) return { plant: "—", subtype: "—" };
  const plant = batch.plantCmsId;
  const sid = batch.plantSubtypeId;
  if (!plant || typeof plant === "string" || !plant.name) {
    return { plant: "—", subtype: "—" };
  }
  const sub = (plant.subtypes || []).find((s) => String(s._id) === String(sid));
  return {
    plant: plant.name || "—",
    subtype: sub?.name || "—",
  };
}
