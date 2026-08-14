import {
  getDispatchedQty,
  getFarmerFromOrder,
  getPaymentEntries,
  multiPlantDisplayName,
  multiPlantLineAmount,
  partitionOrderLinesByBillable,
  plantDisplayName,
  resolveChallanInvoiceLabel,
  resolveTaxInvoiceLabel,
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
  buildInvoiceGoodsDescriptionForLine,
  formatAadharDisplay,
  getOrderPlantLineItems,
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

function lineAmountSum(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return 0;
  return lines.reduce((sum, line) => {
    const q = Number(line?.numberOfPlants) || 0;
    const r = Number(line?.rate) || 0;
    return sum + q * r;
  }, 0);
}

/**
 * Map one order → delivery challan page props.
 * @param {object} [pageOptions]
 * @param {'billable'|'nonBillable'|null} [pageOptions.billableMode]
 * @param {Array|null} [pageOptions.lineItems]
 */
export function mapOrderToChallanPage(order, dispatch, today = formatDateMr(), pageOptions = {}) {
  const dispatchMongoId = dispatch?._id;
  const farmer = getFarmerFromOrder(order);
  const billableMode = pageOptions?.billableMode || null;
  const isNonBillablePage = billableMode === "nonBillable";
  const allLineItems = getOrderPlantLineItems(order);
  const lineItems =
    pageOptions?.lineItems != null ? pageOptions.lineItems : allLineItems;
  const omitSubtype = isNonBillablePage;
  const dispatchQty = getDispatchedQty(order, dispatch?.orderDispatchDetails);
  const rate = Number(order?.rate ?? order?.details?.rate ?? 0);
  const includeMoney = !isNonBillablePage;
  const freightCharges = includeMoney ? resolveOrderFreightCharges(order) : 0;
  const scopedAmount =
    Array.isArray(lineItems) && lineItems.length ? lineAmountSum(lineItems) : null;
  const multiAmount =
    scopedAmount != null
      ? scopedAmount
      : billableMode
        ? null
        : multiPlantLineAmount(order);
  const plantAmount =
    multiAmount != null && (lineItems?.length || allLineItems?.length)
      ? multiAmount
      : isNonBillablePage
        ? lineAmountSum(lineItems || [])
        : dispatchQty * rate;
  const dispatchTotal = plantAmount + freightCharges;
  const paymentEntries = includeMoney ? getPaymentEntries(order) : [];
  const totalPaid = paymentEntries.reduce((s, p) => s + (Number(p?.paidAmount) || 0), 0);
  const remaining = Math.max(0, dispatchTotal - totalPaid);
  const plantName =
    Array.isArray(lineItems) && lineItems.length
      ? multiPlantDisplayName(order, dispatch?.plantsDetails, {
          omitSubtype,
          lines: lineItems,
        })
      : plantDisplayName(order, dispatch?.plantsDetails, { omitSubtype });
  const plantLines =
    Array.isArray(lineItems) && lineItems.length
      ? lineItems.map((line) => ({
          label: buildInvoiceGoodsDescriptionForLine(line, { omitSubtype }),
          qty: Number(line?.numberOfPlants) || 0,
          rate: Number(line?.rate) || 0,
          amount:
            (Number(line?.numberOfPlants) || 0) * (Number(line?.rate) || 0),
        }))
      : null;
  const invoiceLabel = resolveChallanInvoiceLabel(order, dispatchMongoId, {
    billable: !isNonBillablePage,
  });
  const orderNum =
    order?.order != null
      ? String(order.order)
      : order?.orderId != null
        ? String(order.orderId)
        : order?.details?.orderid != null
          ? String(order.details.orderid)
          : "";
  const orderRef = orderNum ? `Order #${orderNum}` : "";

  const scopedQty =
    Array.isArray(lineItems) && lineItems.length
      ? lineItems.reduce((s, l) => s + (Number(l?.numberOfPlants) || 0), 0)
      : dispatchQty;

  return {
    today,
    driverName: dispatch?.driverName || "—",
    vehicleName: dispatch?.vehicleName || "—",
    invoiceLabel: invoiceLabel || "—",
    orderRef,
    optionalManualDc: (() => {
      if (isNonBillablePage) return "";
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
    plantName,
    plantLines,
    dispatchQty: scopedQty,
    rate: (lineItems?.length || 0) > 1 ? "—" : rate,
    plantAmount,
    freightCharges,
    dispatchTotal,
    paymentEntries,
    totalPaid,
    remaining,
    orderCrates: resolveOrderCrates(order, dispatch, dispatch?.plantsDetails),
    billableMode: billableMode || (isNonBillablePage ? "nonBillable" : "billable"),
  };
}

/** One order may produce 1–2 challan pages when billable + non-billable lines mix. */
export function mapOrderToChallanPages(order, dispatch, today = formatDateMr()) {
  const { billable, nonBillable } = partitionOrderLinesByBillable(order);
  const pages = [];
  if (billable.length > 0) {
    pages.push(
      mapOrderToChallanPage(order, dispatch, today, {
        billableMode: "billable",
        lineItems: billable,
      })
    );
  }
  if (nonBillable.length > 0) {
    pages.push(
      mapOrderToChallanPage(order, dispatch, today, {
        billableMode: "nonBillable",
        lineItems: nonBillable,
      })
    );
  }
  if (pages.length === 0) {
    pages.push(mapOrderToChallanPage(order, dispatch, today));
  }
  return pages;
}

/**
 * Map one order → Ram Biotech invoice page props.
 * @param {object} [pageOptions]
 * @param {'billable'|'nonBillable'|null} [pageOptions.billableMode]
 * @param {Array|null} [pageOptions.lineItems]
 */
export function mapOrderToRamInvoicePage(order, dispatch, today = formatDateMr(), options = {}) {
  const farmer = getFarmerFromOrder(order);
  const dealerOrder = isDealerBookedOrder(order);
  const dealer = dealerOrder ? getDealerFromOrder(order) : null;
  const orderKey = String(order?._id ?? order?.details?.orderid ?? "");
  const aadharOverride = options?.aadharByOrderId?.[orderKey];
  const billableMode = options?.billableMode || null;
  const isNonBillablePage = billableMode === "nonBillable";
  const omitSubtype = isNonBillablePage;
  const allLineItems = getOrderPlantLineItems(order);
  const lineItems =
    options?.lineItems != null ? options.lineItems : allLineItems;
  const dispatchQty = getDispatchedQty(order, dispatch?.orderDispatchDetails);
  const rate = Number(order?.rate ?? order?.details?.rate ?? 0);
  const includeMoney = !isNonBillablePage;
  const freightCharges = includeMoney ? resolveOrderFreightCharges(order) : 0;
  const scopedAmount =
    Array.isArray(lineItems) && lineItems.length ? lineAmountSum(lineItems) : null;
  const multiAmount =
    scopedAmount != null
      ? scopedAmount
      : billableMode
        ? null
        : multiPlantLineAmount(order);
  const plantAmount =
    multiAmount != null && (lineItems?.length || allLineItems?.length)
      ? multiAmount
      : isNonBillablePage
        ? lineAmountSum(lineItems || [])
        : dispatchQty * rate;
  const totalAmount = plantAmount + freightCharges;
  const totalStr =
    includeMoney && totalAmount
      ? totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
      : "";
  const invoiceNo = resolveTaxInvoiceLabel(order, { billable: !isNonBillablePage });
  const isBanana =
    isBananaPlantOrder(order) ||
    Boolean((lineItems || allLineItems)?.some((line) => isBananaPlantOrder(line)));
  const goodsDesc = buildInvoiceGoodsDescription(order, isBanana);
  const lotOrBatch = resolveLotOrBatchNo(order, isBanana);
  const aadhar = isBanana && includeMoney ? formatAadharDisplay(farmer, order, aadharOverride) : "";

  const billParty = dealerOrder && dealer?.name ? dealer : farmer;
  const shipParty = farmer;

  const scopedQty =
    Array.isArray(lineItems) && lineItems.length
      ? lineItems.reduce((s, l) => s + (Number(l?.numberOfPlants) || 0), 0)
      : dispatchQty;

  let goodsItems;
  if (lineItems?.length) {
    goodsItems = lineItems.map((line, idx) => {
      const qty = Number(line?.numberOfPlants) || 0;
      const lineRate = includeMoney ? Number(line?.rate) || 0 : 0;
      const amount = includeMoney ? qty * lineRate : 0;
      return {
        srNo: idx + 1,
        description: buildInvoiceGoodsDescriptionForLine(line, { omitSubtype }),
        lotNo: resolveLotOrBatchNo(
          {
            ...order,
            plantName: line.plantName,
            plantSubtype: line.plantSubtype,
            bookingSlot: line.bookingSlot,
          },
          isBananaPlantOrder(line)
        ) || lotOrBatch,
        quantity: qty ? String(qty) : "",
        rate: includeMoney && lineRate ? String(lineRate) : "",
        unitPer: "Plant.",
        amount:
          includeMoney && amount
            ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
            : "",
      };
    });
  } else {
    goodsItems = [
      {
        srNo: 1,
        description: goodsDesc,
        lotNo: lotOrBatch,
        quantity: scopedQty ? String(scopedQty) : "",
        rate: includeMoney && rate ? String(rate) : "",
        unitPer: "Plant.",
        amount:
          includeMoney && plantAmount
            ? plantAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
            : "",
      },
    ];
  }

  const freightSr = goodsItems.length + 1;
  const items = [
    ...goodsItems,
    ...(includeMoney && freightCharges > 0
      ? [
          {
            srNo: freightSr,
            description: "Freight / वाहतूक",
            lotNo: "",
            quantity: "1",
            rate: String(freightCharges),
            unitPer: "",
            amount: freightCharges.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            }),
          },
        ]
      : []),
  ];

  return {
    isBanana,
    useBillToShipTo: Boolean(dealerOrder && dealer?.name),
    licNo: isBanana ? INVOICE_LIC_BANANA : INVOICE_LIC_DEFAULT,
    dbtNo: isBanana ? INVOICE_DBT_BANANA : "",
    aadhar,
    lotLabel: isBanana ? "Batch No." : "Lot No.",
    invoiceNo: invoiceNo || "",
    dated: today,
    farmerName: farmer?.name || "",
    items,
    totalAmount: totalStr,
    amountInWords: totalStr ? toWordsRupees(totalStr) : "",
    ...partyToInvoiceFields("bill", billParty),
    ...partyToInvoiceFields("ship", shipParty),
    billTo: billParty?.name || "",
    mobile: billParty?.mobileNumber ?? billParty?.mobile ?? "",
    atPost: billParty?.village || "",
    tal: billParty?.talukaName || billParty?.taluka || "",
    dist: billParty?.districtName || billParty?.district || "",
    state: billParty?.stateName || billParty?.state || "Maharashtra",
    billableMode: billableMode || (isNonBillablePage ? "nonBillable" : "billable"),
  };
}

/** One order may produce 1–2 invoice pages when billable + non-billable lines mix. */
export function mapOrderToRamInvoicePages(order, dispatch, today = formatDateMr(), options = {}) {
  const { billable, nonBillable } = partitionOrderLinesByBillable(order);
  const pages = [];
  if (billable.length > 0) {
    pages.push(
      mapOrderToRamInvoicePage(order, dispatch, today, {
        ...options,
        billableMode: "billable",
        lineItems: billable,
      })
    );
  }
  if (nonBillable.length > 0) {
    pages.push(
      mapOrderToRamInvoicePage(order, dispatch, today, {
        ...options,
        billableMode: "nonBillable",
        lineItems: nonBillable,
      })
    );
  }
  if (pages.length === 0) {
    pages.push(mapOrderToRamInvoicePage(order, dispatch, today, options));
  }
  return pages;
}

export function mapDispatchToChallanPages(dispatch, today) {
  const orders = Array.isArray(dispatch?.orderIds) ? dispatch.orderIds : [];
  const dateStr = today || formatDateMr(dispatch?.createdAt || new Date());
  return orders.flatMap((order) => mapOrderToChallanPages(order, dispatch, dateStr));
}

export function mapDispatchToRamInvoicePages(dispatch, today, options = {}) {
  const orders = Array.isArray(dispatch?.orderIds) ? dispatch.orderIds : [];
  const dateStr = today || formatDateMr(new Date());
  return orders.flatMap((order) => mapOrderToRamInvoicePages(order, dispatch, dateStr, options));
}

export { formatInrLocale };
