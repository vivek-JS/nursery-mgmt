/** Match backend DISPATCH_MANAGER_EXTRA_QTY */
export const DISPATCH_MANAGER_EXTRA_QTY = 1000;

/** Remaining plants left to dispatch — mirrors backend orderRemainingOrBookable. */
export function orderRemainingForDispatch(order) {
  const rem = order?.details?.remainingPlants ?? order?.remainingPlants;
  if (rem != null && Number.isFinite(Number(rem))) return Number(rem);
  return Number(order?.quantity ?? order?.details?.numberOfPlants ?? 0) || 0;
}

export function getMaxDispatchQty(remainingQty, isDispatchManager, { isEditMode = false, currentDispatchQty = 0 } = {}) {
  const base = Number(remainingQty) || 0;
  if (isEditMode) {
    return base + (Number(currentDispatchQty) || 0) + (isDispatchManager ? DISPATCH_MANAGER_EXTRA_QTY : 0);
  }
  return base + (isDispatchManager ? DISPATCH_MANAGER_EXTRA_QTY : 0);
}
