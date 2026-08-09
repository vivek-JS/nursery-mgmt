const IST = "Asia/Kolkata";

export function toYmd(date = new Date()) {
  return new Date(date).toLocaleDateString("en-CA", { timeZone: IST });
}

export function formatDispatchDateLabel(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDispatchTimeLabel(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function getDispatchDateKey(dispatch) {
  const raw = dispatch?.createdAt || dispatch?.updatedAt;
  if (!raw) return "unknown";
  return toYmd(new Date(raw));
}

export const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
];

export function resolveDatePresetRange(presetId) {
  const today = new Date();
  const end = toYmd(today);
  if (presetId === "today") return { startDate: end, endDate: end };
  if (presetId === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const ymd = toYmd(y);
    return { startDate: ymd, endDate: ymd };
  }
  if (presetId === "last7") {
    const s = new Date(today);
    s.setDate(s.getDate() - 6);
    return { startDate: toYmd(s), endDate: end };
  }
  if (presetId === "last30") {
    const s = new Date(today);
    s.setDate(s.getDate() - 29);
    return { startDate: toYmd(s), endDate: end };
  }
  return { startDate: end, endDate: end };
}

/** Group dispatches by IST dispatch date (newest date first). */
export function groupDispatchesByDate(dispatches = []) {
  const map = new Map();
  for (const dispatch of dispatches) {
    const key = getDispatchDateKey(dispatch);
    if (!map.has(key)) {
      map.set(key, {
        dateKey: key,
        label: key === "unknown" ? "Unknown date" : formatDispatchDateLabel(dispatch.createdAt),
        rows: [],
      });
    }
    map.get(key).rows.push(dispatch);
  }
  return [...map.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

/** Summarize dispatch row for table display. */
export function summarizeDispatchRow(dispatch) {
  const orders = Array.isArray(dispatch?.orderIds) ? dispatch.orderIds : [];
  let plantTotal = 0;
  let amountTotal = 0;
  let paidTotal = 0;
  const farmerNames = [];
  const orderRows = [];

  for (const entry of orders) {
    const det = entry?.details || {};
    const farmer = det.farmer || entry?.farmer || {};
    const name = entry?.farmerName || farmer?.name || "—";
    if (name && name !== "—") farmerNames.push(name);
    const qty = Number(
      dispatch?.orderDispatchDetails?.find((d) => String(d.orderId) === String(entry?._id))
        ?.dispatchQuantity ?? entry?.quantity ?? entry?.numberOfPlants ?? 0
    );
    const rate = Number(entry?.rate ?? det?.rate ?? 0);
    const freight = Math.max(0, Number(entry?.freightCharges ?? det?.freightCharges ?? 0) || 0);
    const lineTotal = qty * rate + freight;
    const paid = Number(entry?.["Paid Amt"] ?? entry?.PaidAmt ?? 0) || 0;
    plantTotal += qty;
    amountTotal += lineTotal;
    paidTotal += paid;
    orderRows.push({
      orderId: entry?.order ?? entry?.orderId ?? det?.orderid ?? "—",
      farmerName: name,
      village: farmer?.village || "",
      quantity: qty,
      rate,
      dcNo:
        entry?.officialDeliveryChallanNumber ||
        entry?.deliveryChallanInvoiceNumber ||
        det?.officialDeliveryChallanNumber ||
        det?.deliveryChallanInvoiceNumber ||
        "",
      due: Math.max(0, lineTotal - paid),
      paid,
      lineTotal,
    });
  }

  const uniqueFarmers = [...new Set(farmerNames)];
  const dispatchAt = dispatch?.createdAt || dispatch?.updatedAt || null;
  return {
    transportId: dispatch?.transportId ?? "—",
    dispatchName: dispatch?.name || "",
    dispatchDate: dispatchAt,
    dispatchDateLabel: formatDispatchDateLabel(dispatchAt),
    dispatchTimeLabel: formatDispatchTimeLabel(dispatchAt),
    vehicleLabel: [dispatch?.vehicleNumber, dispatch?.vehicleName].filter(Boolean).join(" · ") || "—",
    driverName: dispatch?.driverName || "—",
    driverMobile: dispatch?.driverMobile || "",
    status: dispatch?.transportStatus || dispatch?.dispatchStatus || "PENDING",
    orderCount: orders.length,
    plantTotal,
    amountTotal,
    paidTotal,
    dueTotal: Math.max(0, amountTotal - paidTotal),
    routeNotes: dispatch?.routeNotes || "",
    driverRemark: dispatch?.driverRemark || "",
    vehicleRemark: dispatch?.vehicleRemark || "",
    farmersLabel:
      uniqueFarmers.length > 2
        ? `${uniqueFarmers.slice(0, 2).join(", ")} +${uniqueFarmers.length - 2}`
        : uniqueFarmers.join(", ") || "—",
    dcPdfUrl: String(dispatch?.deliveryChallanPdfUrl || "").trim(),
    invPdfUrl: String(dispatch?.completeInvoicePdfUrl || "").trim(),
    orderRows,
    raw: dispatch,
  };
}

export const STATUS_TABS = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Loading" },
  { id: "LOADED", label: "Loaded" },
  { id: "IN_TRANSIT", label: "In transit" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "CANCELLED", label: "Cancelled" },
];

export function computeDispatchStats(dispatches = []) {
  let orders = 0;
  let plants = 0;
  let delivered = 0;
  let inTransit = 0;
  for (const d of dispatches) {
    const row = summarizeDispatchRow(d);
    orders += row.orderCount;
    plants += row.plantTotal;
    const s = String(row.status).toUpperCase();
    if (s === "DELIVERED") delivered += 1;
    if (s === "IN_TRANSIT" || s === "LOADED") inTransit += 1;
  }
  return {
    vehicles: dispatches.length,
    orders,
    plants,
    delivered,
    inTransit,
  };
}

export function normalizeDispatchSearchHit(entry, dispatch) {
  const det = entry?.details || {};
  const farmer = det.farmer || entry?.farmer || {};
  const qty = Number(entry?.quantity ?? entry?.numberOfPlants ?? 0);
  const rate = Number(entry?.rate ?? det?.rate ?? 0);
  return {
    orderMongoId: String(entry._id ?? det.orderid ?? ""),
    orderId: entry?.order ?? entry?.orderId ?? "—",
    farmerName: entry?.farmerName || farmer?.name || "—",
    farmerMobile: entry?.contact || farmer?.mobileNumber || "",
    dispatchId: String(dispatch?._id || ""),
    transportId: dispatch?.transportId ?? "—",
    driverName: dispatch?.driverName || "",
    quantity: qty,
    amount: qty * rate,
  };
}

export function collectDispatchSearchHits(dispatches = []) {
  const hits = [];
  const seen = new Set();
  for (const dispatch of dispatches) {
    for (const entry of dispatch.orderIds || []) {
      const row = normalizeDispatchSearchHit(entry, dispatch);
      if (!row.orderMongoId || seen.has(row.orderMongoId)) continue;
      seen.add(row.orderMongoId);
      hits.push(row);
    }
  }
  return hits;
}

/** Invoice only after Complete Order form (transport DELIVERED). */
export function canShowInvoice(dispatch) {
  const s = String(dispatch?.transportStatus || dispatch?.dispatchStatus || "PENDING").toUpperCase();
  return s === "DELIVERED";
}

export function statusChipClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DELIVERED") return "bg-green-100 text-green-800 border-green-200";
  if (s === "IN_TRANSIT") return "bg-sky-100 text-sky-800 border-sky-200";
  if (s === "CANCELLED") return "bg-red-100 text-red-800 border-red-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}
