import moment from "moment";

export const safeTrunc = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

export const availPlantsPrimaryOutward = (po) =>
  safeTrunc(po.availableQuantity ?? po.totalQuantity);

/** Full trays implied by remaining plants ÷ cavity (same rule as FIFO lagawd). */
export const fullTraysAvailablePrimaryOutward = (po) => {
  const cav = Math.max(1, safeTrunc(po?.cavity));
  const plants = availPlantsPrimaryOutward(po);
  return Math.floor(plants / cav);
};

/** Match primary inward → primary outward via transfer history (same day + quantity). */
export const resolveSourcePrimaryInwardForOutward = (batchDoc, outward) => {
  if (!batchDoc || !outward) return null;
  const inwardList = batchDoc.primaryInward || [];
  const outDay = moment(outward.primaryOutwardDate).startOf("day");
  const qty = safeTrunc(outward.totalQuantity);
  for (const pi of inwardList) {
    for (const t of pi.transferHistory || []) {
      if (!t?.transferDate) continue;
      if (!moment(t.transferDate).startOf("day").isSame(outDay)) continue;
      if (safeTrunc(t.quantityTransferred) === qty) return pi;
    }
  }
  return null;
};

/** Lab line snapshot for timeline (batchDoc.outward subdocs). */
export const labLineSummary = (batchDoc, sourceLabId) => {
  if (!batchDoc?.outward?.length || !sourceLabId) return null;
  const lab = batchDoc.outward.find((l) => String(l._id) === String(sourceLabId));
  if (!lab) return null;
  return {
    outwardDate: lab.outwardDate,
    size: lab.size,
    bottles: safeTrunc(lab.bottles),
    plants: safeTrunc(lab.plants),
  };
};

export const formatStageDate = (raw) =>
  raw && moment(raw).isValid() ? moment(raw).format("DD MMM YYYY") : "—";

/**
 * FIFO by primaryOutwardDate (oldest first), full trays only.
 * Returns rows with { row, plants, trays, cavity } where plants = trays * cavity.
 */
export const allocateLagwadFifoFullTrays = (primaryOutwardRows, totalPlantsRequested) => {
  const budgetIn = Math.max(0, safeTrunc(totalPlantsRequested));
  const sorted = [...primaryOutwardRows].sort((a, b) => {
    const da = moment(a.primaryOutwardDate).valueOf();
    const db = moment(b.primaryOutwardDate).valueOf();
    if (da !== db) return da - db;
    return String(a._id).localeCompare(String(b._id));
  });
  let budget = budgetIn;
  const allocations = [];
  for (const row of sorted) {
    const cav = Math.max(1, safeTrunc(row.cavity));
    const avail = availPlantsPrimaryOutward(row);
    const maxFullTrays = Math.floor(avail / cav);
    const maxPlantsThisLine = maxFullTrays * cav;
    const take = Math.min(budget, maxPlantsThisLine);
    const trays = cav > 0 ? Math.floor(take / cav) : 0;
    const plants = trays * cav;
    if (plants > 0) {
      allocations.push({ row, plants, trays, cavity: cav });
      budget -= plants;
    }
    if (budget <= 0) break;
  }
  return { allocations, budgetRemaining: budget, requested: budgetIn };
};

/**
 * Lagawd multi-select: same batch only. R1+R2 may combine; R3 only with other R3 lines (never with R1/R2).
 */
export const lagawdRowCompatibleWithSelection = (candidateRow, selectedRows) => {
  if (!candidateRow || !selectedRows?.length) return true;
  const b0 = String(selectedRows[0]._batchId);
  if (String(candidateRow._batchId) !== b0) return false;
  const sizes = new Set(selectedRows.map((r) => r.size));
  const cand = candidateRow.size;
  if (sizes.has("R3") || cand === "R3") {
    return cand === "R3" && [...sizes].every((s) => s === "R3");
  }
  return cand === "R1" || cand === "R2";
};

export const secondaryMortalityRecordedTotal = (po) =>
  Array.isArray(po?.secondaryMortalityLog)
    ? po.secondaryMortalityLog.reduce((s, x) => s + safeTrunc(x?.quantity), 0)
    : 0;

/** Max plants movable with full trays only, summed across selected lines. */
export const maxLagwadPlantsFullTrays = (rows) =>
  rows.reduce((sum, row) => {
    const cav = Math.max(1, safeTrunc(row.cavity));
    const avail = availPlantsPrimaryOutward(row);
    const maxFullTrays = Math.floor(avail / cav);
    return sum + maxFullTrays * cav;
  }, 0);
