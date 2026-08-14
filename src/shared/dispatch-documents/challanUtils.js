/** @typedef {import('./dispatchDocumentMappers.js').DispatchContext} DispatchContext */

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Strip arrow separators (Banana -> G9 / Banana → G9) for clean PDF labels. */
export function cleanPlantLabel(raw) {
  return String(raw ?? "")
    .replace(/&gt;/gi, ">")
    .replace(/\s*-+\s*>\s*/g, " ")
    .replace(/\s*→\s*/g, " ")
    .replace(/\s*>\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Indian currency for PDFs e.g. ₹80,000 */
export function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₹0";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** Qty for PDFs with en-IN grouping */
export function formatQty(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-IN");
}

function resolveDispatchHistoryId(ref) {
  if (ref == null) return "";
  if (typeof ref === "object" && ref._id != null) return String(ref._id);
  return String(ref);
}

export function resolveChallanInvoiceLabel(order, dispatchMongoId, options = {}) {
  const billable = options?.billable !== false;
  if (!billable) {
    const nb =
      order?.officialNonBillableDeliveryChallanNumber ||
      order?.details?.officialNonBillableDeliveryChallanNumber;
    if (nb) return String(nb).trim();
  }
  const official =
    order?.officialDeliveryChallanNumber ||
    order?.details?.officialDeliveryChallanNumber;
  if (official && billable) return String(official).trim();
  if (!billable) {
    // Non-billable page with no dedicated number — do not fall back to billable DC
    return "";
  }
  const edited =
    order?.deliveryChallanInvoiceNumber ||
    order?.details?.deliveryChallanInvoiceNumber;
  if (edited) return String(edited).trim();
  const hist = order?.details?.dispatchHistory || order?.dispatchHistory || [];
  const dispatchKey = String(dispatchMongoId || "");
  const entry = hist.find(
    (h) =>
      h?.dispatchId &&
      resolveDispatchHistoryId(h.dispatchId) === dispatchKey
  );
  if (entry?.invoiceNumber) return String(entry.invoiceNumber).trim();
  return "";
}

/**
 * Tax-invoice number (separate from DC). Precedence:
 * manual override → official invoice (billable/NB). Does not fall back to DC.
 */
export function resolveTaxInvoiceLabel(order, options = {}) {
  const billable = options?.billable !== false;
  if (!billable) {
    const manualNb = String(
      order?.manualNonBillableInvoiceNumber ??
        order?.details?.manualNonBillableInvoiceNumber ??
        ""
    ).trim();
    if (manualNb) return manualNb;
    const officialNb = String(
      order?.officialNonBillableInvoiceNumber ??
        order?.details?.officialNonBillableInvoiceNumber ??
        ""
    ).trim();
    return officialNb;
  }
  const manual = String(
    order?.manualInvoiceNumber ?? order?.details?.manualInvoiceNumber ?? ""
  ).trim();
  if (manual) return manual;
  const official = String(
    order?.officialInvoiceNumber ?? order?.details?.officialInvoiceNumber ?? ""
  ).trim();
  return official;
}

export function optionalManualDcSeparateFromOfficial(order) {
  const official = String(
    order?.officialDeliveryChallanNumber ??
      order?.details?.officialDeliveryChallanNumber ??
      ""
  ).trim();
  const manual = String(
    order?.deliveryChallanInvoiceNumber ?? order?.details?.deliveryChallanInvoiceNumber ?? ""
  ).trim();
  if (!official || !manual || manual === official) return "";
  return manual;
}

export function resolveOrderFreightCharges(order) {
  return Math.max(
    0,
    Number(order?.freightCharges ?? order?.details?.freightCharges ?? 0) || 0
  );
}

export function getFarmerFromOrder(order) {
  if (order?.farmer && typeof order.farmer === "object") {
    return {
      ...order.farmer,
      name: order.farmer.name || order.farmerName || "",
      mobileNumber: order.farmer.mobileNumber ?? order.farmer.mobile ?? order.contact ?? "",
    };
  }
  if (order?.details?.farmer && typeof order.details.farmer === "object") {
    return {
      ...order.details.farmer,
      name: order.details.farmer.name || order.farmerName || "",
      mobileNumber:
        order.details.farmer.mobileNumber ??
        order.details.farmer.mobile ??
        order.details.contact ??
        order.contact ??
        "",
    };
  }
  if (order?.farmerName) {
    return {
      name: order.farmerName,
      mobileNumber: order.contact ?? order.details?.contact,
      village: order.details?.farmer?.village ?? order.village,
      talukaName: order.details?.farmer?.talukaName ?? order.details?.farmer?.taluka,
      districtName: order.details?.farmer?.districtName ?? order.details?.farmer?.district,
      stateName: order.details?.farmer?.stateName ?? order.details?.farmer?.state,
      aadharNumber: order.details?.farmer?.aadharNumber ?? order.details?.farmer?.aadhaarNumber,
      aadhaarNumber: order.details?.farmer?.aadhaarNumber ?? order.details?.farmer?.aadharNumber,
    };
  }
  return {};
}

export function getPaymentEntries(order) {
  if (Array.isArray(order?.details?.payment)) return order.details.payment;
  if (Array.isArray(order?.payment)) return order.payment;
  return [];
}

export function getDispatchedQty(order, orderDispatchDetails) {
  const rows = Array.isArray(orderDispatchDetails) ? orderDispatchDetails : [];
  const oid = String(order?._id ?? order?.details?.orderid ?? "");
  const row = rows.find((d) => String(d.orderId) === oid);
  if (row && row.dispatchQuantity != null) return Number(row.dispatchQuantity) || 0;
  return Number(order?.quantity ?? order?.numberOfPlants ?? 0) || 0;
}

export function plantDisplayName(order, plantsDetails = [], options = {}) {
  const omitSubtype = Boolean(options?.omitSubtype);
  const list = Array.isArray(plantsDetails) ? plantsDetails : [];
  const orderPlantName = (
    order?.plantDetails?.name ||
    order?.plantType?.name ||
    order?.plantName?.name ||
    ""
  ).toLowerCase();
  let plant = null;
  if (list.length) {
    plant =
      (orderPlantName &&
        list.find((p) => p?.name?.toLowerCase().includes(orderPlantName))) ||
      list[0];
  }
  const raw = cleanPlantLabel(
    plant?.name ||
      order?.plantName?.name ||
      order?.plantType?.name ||
      order?.plantDetails?.name ||
      "—"
  );
  const plantOnly = /papaya/i.test(raw) ? "Papaya" : raw;
  if (omitSubtype) return plantOnly || "—";
  const sub = cleanPlantLabel(
    order?.plantSubtype?.name ||
      order?.plantDetails?.subtype ||
      (order?.plantSubtype &&
        Array.isArray(order?.plantName?.subtypes) &&
        order.plantName.subtypes.find((s) => String(s._id) === String(order.plantSubtype))
          ?.name) ||
      ""
  );
  // Prefer "Banana G9" (no arrow). If plant string already includes subtype, don't duplicate.
  if (sub && !new RegExp(sub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(plantOnly)) {
    return `${plantOnly} ${sub}`.trim();
  }
  return plantOnly || "—";
}

export function plantLineWithSubtype(order) {
  return plantDisplayName(order, []);
}

/** Resolve whether a plant line (or root order) is billable. Default true. */
export function resolveLineIsBillable(line, order = null) {
  if (typeof line?.isBillable === "boolean") return line.isBillable;
  const plant = line?.plantName || order?.plantName;
  const subtypeId = line?.plantSubtype ?? order?.plantSubtype;
  if (plant && Array.isArray(plant.subtypes) && subtypeId != null) {
    const st = plant.subtypes.find((s) => String(s._id) === String(subtypeId?._id ?? subtypeId));
    if (typeof st?.isBillable === "boolean") return st.isBillable;
  }
  if (!line && order && typeof order.isBillable === "boolean") return order.isBillable;
  if (!line && order?.plantName && Array.isArray(order.plantName.subtypes)) {
    const st = order.plantName.subtypes.find(
      (s) => String(s._id) === String(order.plantSubtype?._id ?? order.plantSubtype)
    );
    if (typeof st?.isBillable === "boolean") return st.isBillable;
  }
  return true;
}

/**
 * Split order plant lines into billable / non-billable groups.
 * Root-only orders synthesize a single pseudo-line from root plant fields.
 */
export function partitionOrderLinesByBillable(order) {
  const rawLines = order?.plantLineItems ?? order?.details?.plantLineItems;
  if (Array.isArray(rawLines) && rawLines.length > 0) {
    const billable = [];
    const nonBillable = [];
    for (const line of rawLines) {
      if (resolveLineIsBillable(line, order)) billable.push(line);
      else nonBillable.push(line);
    }
    return { billable, nonBillable };
  }
  const synthetic = {
    plantName: order?.plantName,
    plantSubtype: order?.plantSubtype,
    plantNameSnapshot: order?.plantName?.name || "",
    plantSubtypeSnapshot: order?.plantSubtype?.name || "",
    numberOfPlants: Number(order?.numberOfPlants ?? order?.quantity ?? 0) || 0,
    rate: Number(order?.rate ?? order?.details?.rate ?? 0) || 0,
    isBillable: resolveLineIsBillable(null, order),
  };
  if (synthetic.isBillable) return { billable: [synthetic], nonBillable: [] };
  return { billable: [], nonBillable: [synthetic] };
}

/** Compact multi-plant label for challan header / lists. */
export function multiPlantDisplayName(order, plantsDetails = [], options = {}) {
  const omitSubtype = Boolean(options?.omitSubtype);
  const lines = options?.lines ?? order?.plantLineItems ?? order?.details?.plantLineItems;
  if (!Array.isArray(lines) || lines.length === 0) {
    return plantDisplayName(order, plantsDetails, { omitSubtype });
  }
  const labels = lines.map((line) => {
    const raw = cleanPlantLabel(
      line?.plantNameSnapshot ||
        line?.plantName?.name ||
        line?.plantType?.name ||
        (typeof line?.plantName === "string" ? line.plantName : "") ||
        "—"
    );
    const plant = /papaya/i.test(raw) ? "Papaya" : raw;
    if (omitSubtype) return plant;
    const sub = cleanPlantLabel(
      line?.plantSubtypeSnapshot ||
        line?.plantSubtype?.name ||
        line?.plantDetails?.subtype ||
        (line?.plantSubtype &&
          Array.isArray(line?.plantName?.subtypes) &&
          line.plantName.subtypes.find((s) => String(s._id) === String(line.plantSubtype))
            ?.name) ||
        ""
    );
    if (sub && !new RegExp(sub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(plant)) {
      return `${plant} ${sub}`.trim();
    }
    return plant;
  });
  return labels.filter(Boolean).join(", ") || plantDisplayName(order, plantsDetails, { omitSubtype });
}

export function multiPlantLineAmount(order) {
  const lines = order?.plantLineItems ?? order?.details?.plantLineItems;
  if (!Array.isArray(lines) || lines.length === 0) return null;
  return lines.reduce((sum, line) => {
    const q = Number(line?.numberOfPlants) || 0;
    const r = Number(line?.rate) || 0;
    return sum + q * r;
  }, 0);
}

export function resolveOrderCrates(order, dispatch, plantsDetails) {
  const orderDispatchDetails = Array.isArray(dispatch?.orderDispatchDetails)
    ? dispatch.orderDispatchDetails
    : [];
  const dispatchDetail = orderDispatchDetails.find(
    (d) => String(d.orderId) === String(order._id)
  );
  const hasBreakup = orderDispatchDetails.length > 0;
  const orderPlantName = (
    order?.plantDetails?.name ||
    order?.plantType?.name ||
    ""
  ).toLowerCase();
  const plant =
    (Array.isArray(plantsDetails) &&
      plantsDetails.find((p) => p?.name?.toLowerCase().includes(orderPlantName))) ||
    plantsDetails?.[0];
  if (Array.isArray(dispatchDetail?.crates) && dispatchDetail.crates.length > 0) {
    return dispatchDetail.crates;
  }
  if (!hasBreakup && Array.isArray(plant?.crates)) return plant.crates;
  return [];
}

export function numberToWords(num) {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const n = parseInt(num, 10);
  if (isNaN(n) || n === 0) return "";
  if (n < 20) return a[n];
  if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + numberToWords(n % 10) : "");
  if (n < 1000) {
    return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numberToWords(n % 100) : "");
  }
  if (n < 100000) {
    return (
      numberToWords(Math.floor(n / 1000)) +
      " Thousand" +
      (n % 1000 ? " " + numberToWords(n % 1000) : "")
    );
  }
  if (n < 10000000) {
    return (
      numberToWords(Math.floor(n / 100000)) +
      " Lakh" +
      (n % 100000 ? " " + numberToWords(n % 100000) : "")
    );
  }
  return (
    numberToWords(Math.floor(n / 10000000)) +
    " Crore" +
    (n % 10000000 ? " " + numberToWords(n % 10000000) : "")
  );
}

export function toWordsRupees(num) {
  const raw = String(num ?? "").replace(/,/g, "");
  const n = parseFloat(raw);
  if (isNaN(n)) return "";
  return "Rupees " + numberToWords(Math.round(n)) + " Only";
}

export function formatInrLocale(n) {
  return Math.round(Number(n) || 0).toLocaleString("en-IN");
}
