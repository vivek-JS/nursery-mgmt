/** Normalize address party for invoice Bill To / Ship To blocks. */
export function normalizeInvoiceParty(raw = {}) {
  const loc = raw.location && typeof raw.location === "object" ? raw.location : {};
  return {
    name: String(raw.name || raw.businessName || "").trim(),
    mobileNumber: String(raw.mobileNumber ?? raw.phoneNumber ?? raw.mobile ?? "").trim(),
    village: String(raw.village ?? loc.village ?? "").trim(),
    talukaName: String(raw.talukaName ?? raw.taluka ?? loc.taluka ?? loc.talukaName ?? "").trim(),
    districtName: String(raw.districtName ?? raw.district ?? loc.district ?? loc.districtName ?? "").trim(),
    stateName: String(raw.stateName ?? raw.state ?? loc.state ?? loc.stateName ?? "Maharashtra").trim(),
  };
}

export function isDealerBookedOrder(order) {
  return Boolean(
    order?.dealerOrder ||
      order?.details?.dealerOrder ||
      order?.dealer ||
      order?.details?.dealer
  );
}

export function getDealerFromOrder(order) {
  if (order?.dealer && typeof order.dealer === "object") {
    return normalizeInvoiceParty(order.dealer);
  }
  if (order?.details?.dealer && typeof order.details.dealer === "object") {
    return normalizeInvoiceParty(order.details.dealer);
  }
  const sp = order?.details?.salesPerson || order?.salesPerson;
  if (sp && typeof sp === "object" && String(sp.jobTitle || "").toUpperCase() === "DEALER") {
    return normalizeInvoiceParty(sp);
  }
  return normalizeInvoiceParty({});
}

export function partyToInvoiceFields(prefix, party) {
  const p = normalizeInvoiceParty(party);
  return {
    [`${prefix}To`]: p.name,
    [`${prefix}Mobile`]: p.mobileNumber,
    [`${prefix}AtPost`]: p.village,
    [`${prefix}Tal`]: p.talukaName,
    [`${prefix}Dist`]: p.districtName,
    [`${prefix}State`]: p.stateName || "Maharashtra",
  };
}
