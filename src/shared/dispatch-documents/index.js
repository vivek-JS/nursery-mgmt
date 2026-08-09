export {
  escapeHtml,
  resolveChallanInvoiceLabel,
  optionalManualDcSeparateFromOfficial,
  resolveOrderFreightCharges,
  getFarmerFromOrder,
  getPaymentEntries,
  getDispatchedQty,
  plantDisplayName,
  plantLineWithSubtype,
  resolveOrderCrates,
  numberToWords,
  toWordsRupees,
  formatInrLocale,
} from "./challanUtils.js";

export {
  mapOrderToChallanPage,
  mapOrderToRamInvoicePage,
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
