import {
  getDispatchedQty,
  getFarmerFromOrder,
  getPaymentEntries,
  plantDisplayName,
  resolveChallanInvoiceLabel,
  resolveOrderCrates,
  resolveOrderFreightCharges,
  toWordsRupees,
  formatInrLocale,
} from "./challanUtils.js";
import {
  INVOICE_DBT_BANANA,
  INVOICE_LIC_BANANA,
  INVOICE_LIC_DEFAULT,
  buildInvoiceGoodsDescription,
  formatAadharDisplay,
  isBananaPlantOrder,
  resolveLotOrBatchNo,
} from "./invoicePlantConfig.js";
import {
  getDealerFromOrder,
  isDealerBookedOrder,
  partyToInvoiceFields,
} from "./invoicePartyUtils.js";

/**
 * @typedef {object} DispatchContext
 * @property {string} [_id]
 * @property {string|number} [transportId]
 * @property {string} [driverName]
 * @property {string} [vehicleName]
 * @property {string} [vehicleNumber]
 * @property {Array} [orderDispatchDetails]
 * @property {Array} [plantsDetails]
 * @property {Array} [orderIds]
 */

function formatDateMr(d = new Date()) {
  try {
    return new Date(d).toLocaleDateString("mr-IN");
  } catch {
    return String(d);
  }
}

function lotNoForOrder(order) {
  return (
    order?.lotNumber ||
    order?.lotNo ||
    order?.bookingSlot?.month ||
    order?.details?.lotNumber ||
    ""
  );
}

/** Map one order → delivery challan page props. */
export function mapOrderToChallanPage(order, dispatch, today = formatDateMr()) {
  const dispatchMongoId = dispatch?._id;
  const farmer = getFarmerFromOrder(order);
  const dispatchQty = getDispatchedQty(order, dispatch?.orderDispatchDetails);
  const rate = Number(order?.rate ?? order?.details?.rate ?? 0);
  const freightCharges = resolveOrderFreightCharges(order);
  const plantAmount = dispatchQty * rate;
  const dispatchTotal = plantAmount + freightCharges;
  const paymentEntries = getPaymentEntries(order);
  const totalPaid = paymentEntries.reduce((s, p) => s + (Number(p?.paidAmount) || 0), 0);
  const remaining = Math.max(0, dispatchTotal - totalPaid);
  const plantName = plantDisplayName(order, dispatch?.plantsDetails);
  const invoiceLabel = resolveChallanInvoiceLabel(order, dispatchMongoId);
  const orderNum =
    order?.order != null
      ? String(order.order)
      : order?.orderId != null
        ? String(order.orderId)
        : order?.details?.orderid != null
          ? String(order.details.orderid)
          : "";
  const legacyRef = [dispatch?.transportId, orderNum && `Order #${orderNum}`]
    .filter(Boolean)
    .join(" · ");

  return {
    today,
    driverName: dispatch?.driverName || "—",
    vehicleName: dispatch?.vehicleName || "—",
    invoiceLabel: invoiceLabel || legacyRef || "—",
    optionalManualDc: (() => {
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
    })(),
    farmerName: farmer?.name || "N/A",
    farmerMobile: farmer?.mobileNumber ?? farmer?.mobile ?? "N/A",
    village: farmer?.village || "N/A",
    delivery: order?.Delivery || order?.details?.Delivery || "निर्दिष्ट नाही",
    plantName,
    dispatchQty,
    rate,
    plantAmount,
    freightCharges,
    dispatchTotal,
    paymentEntries,
    totalPaid,
    remaining,
    orderCrates: resolveOrderCrates(order, dispatch, dispatch?.plantsDetails),
  };
}

/** Map one order → Ram Biotech invoice page props (one page = one farmer / order). */
export function mapOrderToRamInvoicePage(order, dispatch, today = formatDateMr(), options = {}) {
  const dispatchMongoId = dispatch?._id;
  const farmer = getFarmerFromOrder(order);
  const dealerOrder = isDealerBookedOrder(order);
  const dealer = dealerOrder ? getDealerFromOrder(order) : null;
  const orderKey = String(order?._id ?? order?.details?.orderid ?? "");
  const aadharOverride = options?.aadharByOrderId?.[orderKey];
  const dispatchQty = getDispatchedQty(order, dispatch?.orderDispatchDetails);
  const rate = Number(order?.rate ?? order?.details?.rate ?? 0);
  const freightCharges = resolveOrderFreightCharges(order);
  const plantAmount = dispatchQty * rate;
  const totalAmount = plantAmount + freightCharges;
  const totalStr = totalAmount
    ? totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
    : "";
  const dcNo = resolveChallanInvoiceLabel(order, dispatchMongoId);
  const isBanana = isBananaPlantOrder(order);
  const goodsDesc = buildInvoiceGoodsDescription(order, isBanana);
  const lotOrBatch = resolveLotOrBatchNo(order, isBanana);
  const aadhar = isBanana ? formatAadharDisplay(farmer, order, aadharOverride) : "";

  const billParty = dealerOrder && dealer?.name ? dealer : farmer;
  const shipParty = farmer;

  const base = {
    isBanana,
    useBillToShipTo: Boolean(dealerOrder && dealer?.name),
    licNo: isBanana ? INVOICE_LIC_BANANA : INVOICE_LIC_DEFAULT,
    dbtNo: isBanana ? INVOICE_DBT_BANANA : "",
    aadhar,
    lotLabel: isBanana ? "Batch No." : "Lot No.",
    invoiceNo: dcNo || "",
    dated: today,
    farmerName: farmer?.name || "",
    items: [
      {
        srNo: 1,
        description: goodsDesc,
        lotNo: lotOrBatch,
        quantity: dispatchQty ? String(dispatchQty) : "",
        rate: rate ? String(rate) : "",
        unitPer: "Plant.",
        amount: plantAmount
          ? plantAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
          : "",
      },
      ...(freightCharges > 0
        ? [
            {
              srNo: 2,
              description: "Freight / वाहतूक",
              lotNo: "",
              quantity: "1",
              rate: String(freightCharges),
              unitPer: "",
              amount: freightCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
            },
          ]
        : []),
    ],
    totalAmount: totalStr,
    amountInWords: toWordsRupees(totalStr),
    ...partyToInvoiceFields("bill", billParty),
    ...partyToInvoiceFields("ship", shipParty),
    billTo: billParty?.name || "",
    mobile: billParty?.mobileNumber ?? billParty?.mobile ?? "",
    atPost: billParty?.village || "",
    tal: billParty?.talukaName || billParty?.taluka || "",
    dist: billParty?.districtName || billParty?.district || "",
    state: billParty?.stateName || billParty?.state || "Maharashtra",
  };

  return base;
}

export function mapDispatchToChallanPages(dispatch, today) {
  const orders = Array.isArray(dispatch?.orderIds) ? dispatch.orderIds : [];
  const dateStr = today || formatDateMr(dispatch?.createdAt || new Date());
  return orders.map((order) => mapOrderToChallanPage(order, dispatch, dateStr));
}

export function mapDispatchToRamInvoicePages(dispatch, today, options = {}) {
  const orders = Array.isArray(dispatch?.orderIds) ? dispatch.orderIds : [];
  const dateStr = today || formatDateMr(new Date());
  return orders.map((order) => mapOrderToRamInvoicePage(order, dispatch, dateStr, options));
}

export { formatInrLocale };
