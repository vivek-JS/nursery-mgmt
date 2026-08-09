/** Build and open WhatsApp share for a Purchase Order (supplier phone). */

export function normalizeSupplierPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return null;
}

function lineLabel(item) {
  if (item?.isRamAgriProduct) {
    const crop = item.ramAgriCropName || item.ramAgriCropId?.cropName || "Crop";
    const variety = item.ramAgriVarietyName || "Variety";
    return `${crop} — ${variety}`;
  }
  const name = item?.product?.name || item?.productName || "Product";
  const code = item?.product?.code ? ` (${item.product.code})` : "";
  return `${name}${code}`;
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function fmtQty(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/**
 * Highlighted purchase-order WhatsApp body (PO #, delivery, quantities).
 */
export function buildPurchaseOrderWhatsAppMessage(po) {
  if (!po) return "";
  const supplierName =
    po.supplier?.name || po.supplier?.displayName || "Supplier";
  const delivery = fmtDate(po.expectedDeliveryDate);
  const status = String(po.status || "").replace(/_/g, " ").toUpperCase();

  const lines = [];
  lines.push(`🛒 *PURCHASE ORDER*`);
  lines.push(`*${po.poNumber || "PO"}*`);
  lines.push("");
  lines.push(`Supplier: *${supplierName}*`);
  lines.push(`📅 Delivery: *${delivery}*`);
  lines.push(`Status: ${status || "—"}`);
  if (po.supplierInvoiceNumber) {
    lines.push(`Invoice #: ${po.supplierInvoiceNumber}`);
  }
  lines.push("");
  lines.push(`*Items / Quantity:*`);

  const items = Array.isArray(po.items) ? po.items : [];
  items.forEach((item, i) => {
    const unit =
      item.unit?.abbreviation ||
      item.unit?.name ||
      item.unitName ||
      "";
    const qty = fmtQty(item.quantity);
    const rate = Number(item.rate);
    const amt = Number(item.amount);
    let row = `${i + 1}. *${lineLabel(item)}*`;
    row += `\n   Qty: *${qty}*${unit ? ` ${unit}` : ""}`;
    if (Number.isFinite(rate) && rate > 0) {
      row += ` · Rate ₹${rate.toLocaleString("en-IN")}`;
    }
    if (Number.isFinite(amt) && amt > 0) {
      row += ` · Amt ₹${amt.toLocaleString("en-IN")}`;
    }
    lines.push(row);
  });

  if (Number.isFinite(Number(po.totalAmount))) {
    lines.push("");
    lines.push(`*Total: ₹${Number(po.totalAmount).toLocaleString("en-IN")}*`);
  }

  if (po.notes) {
    lines.push("");
    lines.push(`Notes: ${po.notes}`);
  }

  lines.push("");
  lines.push("— Ram Biotech / Ram Agri");
  return lines.join("\n");
}

export function openPurchaseOrderWhatsApp(po) {
  const phone = normalizeSupplierPhone(
    po?.supplier?.phone ||
      po?.supplier?.contact ||
      po?.supplier?.mobile ||
      po?.supplier?.contactPersonPhone
  );
  const message = buildPurchaseOrderWhatsAppMessage(po);
  if (!message) {
    return { ok: false, error: "Nothing to share" };
  }
  if (!phone) {
    return { ok: false, error: "Supplier phone not found (need 10-digit number)" };
  }
  const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return { ok: true, phone, url };
}
