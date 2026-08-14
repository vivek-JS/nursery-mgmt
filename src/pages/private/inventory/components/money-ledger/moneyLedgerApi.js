import { API, NetworkManager } from "network/core";

function unwrap(res) {
  const body = res?.data;
  if (!body) return null;
  if (body.data !== undefined) return body.data;
  return body;
}

export async function fetchMoneyLedgerBooks() {
  const instance = NetworkManager(API.INVENTORY.MONEY_LEDGER_BOOKS);
  const res = await instance.request();
  return unwrap(res)?.books || [];
}

export async function fetchMoneyLedgerParties({ book, side, q, limit, partyKind } = {}) {
  const instance = NetworkManager(API.INVENTORY.MONEY_LEDGER_PARTIES);
  const res = await instance.request({}, { book, side, q, limit, partyKind });
  return unwrap(res)?.parties || [];
}

export async function fetchPartyStatement(partyType, partyId, query = {}) {
  const instance = NetworkManager(API.INVENTORY.MONEY_LEDGER_PARTY_STATEMENT);
  const res = await instance.request(
    {},
    {
      pathParams: [partyType, partyId],
      book: query.book,
      side: query.side,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: query.limit,
    }
  );
  return unwrap(res) || { party: null, entries: [], totals: {} };
}

export async function addMoneyLedgerPayment(payload) {
  const instance = NetworkManager(API.INVENTORY.MONEY_LEDGER_ADD_PAYMENT);
  const res = await instance.request(payload);
  return unwrap(res);
}

/** Party payment without PO/order (Ram Agri). */
export async function addMoneyLedgerPartyPayment(payload) {
  const instance = NetworkManager(API.INVENTORY.MONEY_LEDGER_ADD_PAYMENT);
  const res = await instance.request(payload);
  return unwrap(res);
}

/** Party discount (− side, auto reduces net). */
export async function addMoneyLedgerPartyDiscount(payload) {
  const instance = NetworkManager(API.INVENTORY.MONEY_LEDGER_ADD_DISCOUNT);
  const res = await instance.request(payload);
  return unwrap(res);
}

export async function addDocumentMoneyPayment(type, id, payload) {
  const instance = NetworkManager(API.INVENTORY.MONEY_LEDGER_DOC_PAYMENT);
  const res = await instance.request(payload, { pathParams: [type, id] });
  return unwrap(res);
}

/** Pending party Payment/Discount awaiting accountant accept. */
export async function fetchMoneyLedgerPendingAdjustments({
  book,
  status = "PENDING",
  q,
  page = 1,
  limit = 50,
} = {}) {
  const instance = NetworkManager(API.INVENTORY.MONEY_LEDGER_PENDING_ADJUSTMENTS);
  const res = await instance.request({}, { book, status, q, page, limit });
  return unwrap(res) || { data: [], total: 0, pendingCount: 0 };
}

export async function acceptMoneyLedgerPendingAdjustment(id) {
  const instance = NetworkManager(API.INVENTORY.MONEY_LEDGER_ACCEPT_PENDING);
  const res = await instance.request({}, { pathParams: [id] });
  return unwrap(res);
}

export async function rejectMoneyLedgerPendingAdjustment(id, reason = "") {
  const instance = NetworkManager(API.INVENTORY.MONEY_LEDGER_REJECT_PENDING);
  const res = await instance.request({ reason }, { pathParams: [id] });
  return unwrap(res);
}
