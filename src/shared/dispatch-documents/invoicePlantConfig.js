/** Papaya / general nursery invoice licence (no DBT). */
export const INVOICE_LIC_DEFAULT = "LCSD1220240806JLG";

/** Banana tissue-culture invoice licence + DBT registration. */
export const INVOICE_LIC_BANANA = "LCSD2021119028";
export const INVOICE_DBT_BANANA = "TC2023/C020/1";

export function isBananaPlantOrder(order) {
  const plant =
    order?.plantName?.name ||
    order?.plantType?.name ||
    order?.plantDetails?.name ||
    order?.plantName ||
    "";
  const sub =
    order?.plantSubtype?.name ||
    order?.plantDetails?.subtype ||
    order?.plantSubtype ||
    "";
  return /banana|keli|केळ/i.test(`${plant} ${sub}`);
}

function subtypeName(order) {
  return (
    order?.plantSubtype?.name ||
    order?.plantDetails?.subtype ||
    (order?.plantSubtype &&
      Array.isArray(order?.plantName?.subtypes) &&
      order.plantName.subtypes.find((s) => String(s._id) === String(order.plantSubtype))?.name) ||
    ""
  ).trim();
}

function basePlantName(order) {
  return (
    order?.plantName?.name ||
    order?.plantType?.name ||
    order?.plantDetails?.name ||
    "Plants"
  ).trim();
}

/** e.g. "Banana G-9 Plants", "Papaya Red Lady Plants" */
export function buildInvoiceGoodsDescription(order, isBanana) {
  const sub = subtypeName(order);
  const rawPlant = basePlantName(order);
  let plantLabel = rawPlant;
  if (isBanana) {
    plantLabel = "Banana";
  } else if (/papaya/i.test(rawPlant)) {
    plantLabel = "Papaya";
  }
  if (sub) return `${plantLabel} ${sub} Plants`;
  return `${plantLabel} Plants`;
}

export function resolveLotOrBatchNo(order, isBanana) {
  const candidates = isBanana
    ? [
        order?.batchNumber,
        order?.details?.batchNumber,
        order?.lotNumber,
        order?.lotNo,
        order?.details?.lotNumber,
        order?.bookingSlot?.month,
      ]
    : [
        order?.lotNumber,
        order?.lotNo,
        order?.details?.lotNumber,
        order?.bookingSlot?.month,
        order?.batchNumber,
        order?.details?.batchNumber,
      ];
  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s) return s;
  }
  return "";
}

export function formatAadharDisplay(farmer, order, override) {
  const raw =
    override !== undefined && override !== null
      ? override
      : farmer?.aadharNumber ??
        farmer?.aadhaarNumber ??
        farmer?.aadhar ??
        farmer?.aadhaar ??
        order?.aadharNumber ??
        order?.details?.aadharNumber ??
        "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
  }
  return String(raw).trim();
}
