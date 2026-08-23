/** Mirrors DISPATCH_EXTRA_QTY_BY_ROLE in FINAL_NURSERY_BE/utility/dispatchOrderStatus.util.js */
export const DISPATCH_EXTRA_QTY_BY_ROLE = {
  DISPATCH_MANAGER: 1000,
  SUPER_ADMIN: 1000,
  SUPERADMIN: 1000,
  OFFICE_ADMIN: 500,
  OFFICEADMIN: 500,
};

function normalizeRoleKey(r) {
  if (r == null || r === "") return "";
  return String(r).trim().toUpperCase().replace(/\s+/g, "_");
}

/** Extra plants beyond an order's remaining that this user may dispatch, 0 when none. */
export function dispatchExtraQtyForUser(user) {
  if (!user) return 0;
  const fromJobTitle = DISPATCH_EXTRA_QTY_BY_ROLE[normalizeRoleKey(user.jobTitle)] ?? 0;
  const fromRole = DISPATCH_EXTRA_QTY_BY_ROLE[normalizeRoleKey(user.role)] ?? 0;
  return Math.max(fromJobTitle, fromRole);
}

/** Remaining plants left to dispatch — mirrors backend orderRemainingOrBookable. */
export function orderRemainingForDispatch(order) {
  const rem = order?.details?.remainingPlants ?? order?.remainingPlants;
  if (rem != null && Number.isFinite(Number(rem))) return Number(rem);
  return Number(order?.quantity ?? order?.details?.numberOfPlants ?? 0) || 0;
}

/**
 * Highest dispatch quantity the input may accept.
 * In edit mode `savedDispatchQty` must be the quantity already persisted on this dispatch,
 * never the value currently being typed, or the ceiling drifts with every keystroke.
 */
export function getMaxDispatchQty(remainingQty, extraQty, { isEditMode = false, savedDispatchQty = 0 } = {}) {
  const base = Number(remainingQty) || 0;
  const extra = Number(extraQty) || 0;
  if (isEditMode) {
    return base + (Number(savedDispatchQty) || 0) + extra;
  }
  return base + extra;
}
