export {
  escapeHtml,
  cleanPlantLabel,
  formatInr,
  formatQty,
  resolveChallanInvoiceLabel,
  resolveTaxInvoiceLabel,
  optionalManualDcSeparateFromOfficial,
  resolveOrderFreightCharges,
  getFarmerFromOrder,
  getPaymentEntries,
  getDispatchedQty,
  plantDisplayName,
  plantLineWithSubtype,
  multiPlantDisplayName,
  multiPlantLineAmount,
  partitionOrderLinesByBillable,
  resolveLineIsBillable,
  resolveOrderCrates,
  numberToWords,
  toWordsRupees,
  formatInrLocale,
} from "./challanUtils.js";

export {
  mapOrderToChallanPage,
  mapOrderToChallanPages,
  mapOrderToRamInvoicePage,
  mapOrderToRamInvoicePages,
  mapDispatchToChallanPages,
  mapDispatchToRamInvoicePages,
} from "./dispatchDocumentMappers.js";

export {
  renderDeliveryChallanBody,
  renderDeliveryChallanDocument,
  renderDeliveryChallanPagesFromDispatch,
  renderChallanPage,
} from "./deliveryChallanTemplate.js";

export {
  renderRamBiotechInvoiceBody,
  renderRamBiotechInvoiceDocument,
  renderInvoicePage,
} from "./ramBiotechInvoiceTemplate.js";

/** Re-export for backend PDF label resolution (alias). */
export { resolveChallanInvoiceLabel as resolveChallanInvoiceLabelForPdf } from "./challanUtils.js";
export { resolveTaxInvoiceLabel as resolveTaxInvoiceLabelForPdf } from "./challanUtils.js";
