/** Dealer self-order helpers for Ram Agri Input (web ERP). */

export function isAgriDealerSelf(user) {
  if (!user) return false;
  const jt = String(user.jobTitle || "").toUpperCase().trim();
  const role = String(user.role || "").toUpperCase().trim();
  return jt === "DEALER" || role === "DEALER" || jt === "AGRI_INPUT_DEALER" || role === "AGRI_INPUT_DEALER";
}

export function dealerProfileToCustomerFields(user) {
  const mobile = String(user?.phoneNumber || user?.mobile || "")
    .replace(/\D/g, "")
    .slice(-10);
  return {
    customerName: String(user?.name || "").trim(),
    customerMobile: mobile,
    customerVillage: String(user?.defaultVillage || user?.village || "").trim(),
    customerTaluka: String(user?.defaultTaluka || user?.taluka || "").trim(),
    customerDistrict: String(user?.defaultDistrict || user?.district || "").trim(),
    customerState: String(user?.defaultState || user?.state || "Maharashtra").trim(),
  };
}

export function isUserRamAgriSalesRep(user) {
  if (!user) return false;
  const jt = String(user.jobTitle || "").toUpperCase().trim();
  const role = String(user.role || "").toUpperCase().trim();
  return jt === "RAM_AGRI_SALES" || role === "RAM_AGRI_SALES" || jt === "SALES" || role === "SALES";
}

/** Match sales-rep option labeled "RB Office" (B2B default attribution). */
export function resolveRbOfficeSalesPersonId(reps = []) {
  const list = Array.isArray(reps) ? reps : [];
  const hit = list.find((o) => /^RB\s*Office$/i.test(String(o?.label || o?.name || "").trim()));
  return hit?.value || hit?._id || "";
}
