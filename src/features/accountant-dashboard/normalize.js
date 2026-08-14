/** Farmer order row from GET /order/payments aggregation */
function mapPaymentActor(raw) {
  if (!raw || !raw.name) return null
  return {
    name: String(raw.name || "—"),
    phoneNumber: raw.phoneNumber != null ? String(raw.phoneNumber) : "",
    role: String(raw.role || "").trim() || undefined
  }
}

export function normalizeFarmerPayment(raw) {
  const payment = raw.payment || {}
  const farmer = raw.farmer
  const plantType = raw.plantType || { id: "", name: "" }
  const salesPerson = raw.salesPerson || { name: "—", phoneNumber: "" }
  const paymentUpdatedBy = mapPaymentActor(raw.paymentUpdatedBy)
  const paymentRecordedBy = mapPaymentActor(raw.paymentRecordedBy)
  // This table is payment-centric: show the payment status when present.
  const st = payment.paymentStatus || raw.orderPaymentStatus || "PENDING"

  const billable =
    raw.billablePlants != null && Number.isFinite(Number(raw.billablePlants))
      ? Math.max(0, Number(raw.billablePlants))
      : null

  return {
    id: String(payment._id || `${raw.orderId}-${raw.createdAt || ""}`),
    orderId: Number(raw.orderId) || 0,
    dealerOrder: Boolean(raw.dealerOrder),
    /** Billable qty after returns/damage when API sends it; else booked base count for display */
    numberOfPlants: billable ?? (Number(raw.numberOfPlants) || 0),
    rate: Number(raw.rate) || 0,
    orderPaymentStatus: st,
    payment: {
      paidAmount: Number(payment.paidAmount) || 0,
      paymentStatus: payment.paymentStatus || st,
      paymentDate: payment.paymentDate ? String(payment.paymentDate) : new Date().toISOString(),
      bankName: payment.bankName,
      receiptPhoto: Array.isArray(payment.receiptPhoto) ? payment.receiptPhoto : [],
      modeOfPayment: String(payment.modeOfPayment || "—"),
      remark: payment.remark,
      isWalletPayment: payment.isWalletPayment,
      _id: String(payment._id || ""),
      createdAt: payment.createdAt ? String(payment.createdAt) : undefined,
      updatedAt: payment.updatedAt ? String(payment.updatedAt) : undefined,
      bankVerificationStatus: payment.bankVerificationStatus,
      bankVerificationSource: payment.bankVerificationSource,
      bankVerificationMatchedBy: payment.bankVerificationMatchedBy,
      bankReconciliationConflict: Boolean(payment.bankReconciliationConflict),
      transferredFromOrderId: payment.transferredFromOrderId
        ? String(payment.transferredFromOrderId)
        : undefined,
      transferredFromPaymentId: payment.transferredFromPaymentId
        ? String(payment.transferredFromPaymentId)
        : undefined,
      transferRequestId: payment.transferRequestId ? String(payment.transferRequestId) : undefined,
      orderPaymentTransferId: payment.orderPaymentTransferId
        ? String(payment.orderPaymentTransferId)
        : undefined,
      paymentTiming: payment.paymentTiming === "balance" ? "balance" : payment.paymentTiming === "advance" ? "advance" : undefined,
    },
    paymentTiming:
      payment.paymentTiming === "balance"
        ? "balance"
        : payment.paymentTiming === "advance"
          ? "advance"
          : undefined,
    screenshots: Array.isArray(raw.screenshots) ? raw.screenshots : [],
    orderStatus: raw.orderStatus || "PENDING",
    orderBookingDate: raw.orderBookingDate ? String(raw.orderBookingDate) : "",
    createdAt: raw.createdAt ? String(raw.createdAt) : "",
    totalOrderAmount: Number(raw.totalOrderAmount) || 0,
    farmer,
    orderFor: raw.orderFor && typeof raw.orderFor === "object" ? raw.orderFor : null,
    plantType,
    salesPerson,
    paymentUpdatedBy,
    paymentRecordedBy,
    returnedPlants: Number(raw.returnedPlants) || 0,
    damagedPlants: Number(raw.damagedPlants) || 0,
    dispatch: raw.dispatch || null,
    __source: "farmer",
    __raw: raw
  }
}

/** Ram Agri row from GET /inventory/agri-sales-pending-payments */
export function normalizeAgriPayment(raw) {
  const payment = raw.payment || {}
  const paid = Number(payment.paidAmount) || 0
  const bal = Number(raw.balanceAmount) || 0
  const total = Number(raw.totalAmount) || paid + bal
  const st = payment.paymentStatus || "PENDING"

  return {
    id: `${String(raw._id)}-${Number(raw.paymentIndex) || 0}`,
    orderId: Number(raw.orderNumber) || 0,
    dealerOrder: false,
    numberOfPlants: Number(raw.quantity) || 1,
    rate: Number(raw.rate) || paid,
    orderPaymentStatus: st,
    paymentUpdatedBy: mapPaymentActor(raw.paymentUpdatedBy),
    paymentRecordedBy: mapPaymentActor(raw.paymentRecordedBy),
    payment: {
      paidAmount: paid,
      paymentStatus: st,
      paymentDate: payment.paymentDate ? String(payment.paymentDate) : new Date().toISOString(),
      bankName: payment.bankName,
      receiptPhoto: Array.isArray(payment.receiptPhoto) ? payment.receiptPhoto : [],
      modeOfPayment: String(payment.modeOfPayment || "—"),
      remark: payment.remark,
      _id: String(payment._id || ""),
      createdAt: payment.createdAt ? String(payment.createdAt) : undefined,
      updatedAt: payment.updatedAt ? String(payment.updatedAt) : undefined,
      bankVerificationStatus: payment.bankVerificationStatus,
      bankVerificationSource: payment.bankVerificationSource,
      bankVerificationMatchedBy: payment.bankVerificationMatchedBy,
      bankReconciliationConflict: Boolean(payment.bankReconciliationConflict),
    },
    screenshots: Array.isArray(raw.screenshots) ? raw.screenshots : [],
    orderStatus: raw.orderStatus || "PENDING",
    orderBookingDate: raw.orderDate ? String(raw.orderDate) : "",
    createdAt: raw.createdAt ? String(raw.createdAt) : "",
    totalOrderAmount: total,
    farmer: {
      name: String(raw.customerName || "—"),
      mobileNumber: raw.customerMobile,
      village: String(raw.customerVillage || ""),
      taluka: String(raw.customerTaluka || ""),
      district: String(raw.customerDistrict || "")
    },
    plantType: { id: String(raw.productId || ""), name: String(raw.productName || "Product") },
    salesPerson: {
      name: String((raw.createdBy && raw.createdBy.name) || "—"),
      phoneNumber: raw.createdBy && raw.createdBy.phoneNumber
    },
    __source: "agri",
    __raw: raw
  }
}

/** Party Money Ledger Payment/Discount awaiting accept → then ledger post. */
export function normalizeMoneyLedgerPendingAdjustment(raw) {
  const kind = String(raw.kind || "PAYMENT").toUpperCase()
  const st = String(raw.status || "PENDING").toUpperCase()
  const paymentStatus = st === "APPROVED" ? "COLLECTED" : st === "REJECTED" ? "REJECTED" : "PENDING"
  const amt = Number(raw.amount) || 0
  const createdBy = raw.createdBy && typeof raw.createdBy === "object" ? raw.createdBy : null
  const reviewedBy = raw.reviewedBy && typeof raw.reviewedBy === "object" ? raw.reviewedBy : null
  const partyLabel = `${raw.partyType || "PARTY"} · ${raw.partyName || "—"}`

  return {
    id: `ml-pending-${String(raw._id)}`,
    orderId: "LEDGER",
    dealerOrder: false,
    numberOfPlants: 1,
    rate: amt,
    orderPaymentStatus: paymentStatus,
    paymentUpdatedBy: mapPaymentActor(
      reviewedBy
        ? {
            name: reviewedBy.name,
            phoneNumber: reviewedBy.phoneNumber,
            role: reviewedBy.jobTitle || reviewedBy.role
          }
        : null
    ),
    paymentRecordedBy: mapPaymentActor(
      createdBy
        ? {
            name: createdBy.name,
            phoneNumber: createdBy.phoneNumber,
            role: createdBy.jobTitle || createdBy.role
          }
        : null
    ),
    payment: {
      paidAmount: amt,
      paymentStatus,
      paymentDate: raw.entryDate
        ? String(raw.entryDate)
        : raw.createdAt
          ? String(raw.createdAt)
          : new Date().toISOString(),
      modeOfPayment: String(raw.modeOfPayment || (kind === "DISCOUNT" ? "Discount" : "—")),
      remark:
        [kind === "DISCOUNT" ? "Discount" : "Payment", raw.remark].filter(Boolean).join(" · ") ||
        undefined,
      _id: String(raw._id || ""),
      createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
      updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined
    },
    screenshots: [],
    orderStatus: "PENDING",
    orderBookingDate: raw.entryDate ? String(raw.entryDate) : "",
    createdAt: raw.createdAt ? String(raw.createdAt) : "",
    totalOrderAmount: amt,
    farmer: {
      name: String(raw.partyName || "—"),
      mobileNumber: "",
      village: String(raw.partyType || ""),
      taluka: "",
      district: String(raw.book || "")
    },
    plantType: {
      id: String(raw._id || ""),
      name: kind === "DISCOUNT" ? "Money Ledger · Discount" : "Money Ledger · Payment"
    },
    salesPerson: {
      name: String((createdBy && createdBy.name) || "—"),
      phoneNumber: createdBy && createdBy.phoneNumber
    },
    __source: "moneyLedgerPending",
    __partyLabel: partyLabel,
    __raw: raw
  }
}

/**
 * Map GET /inventory/ram-agri-customer-ledger response to the same shape as farmer plant
 * full modal (`mapFarmerPlantLedgerApiToPanel`).
 */
export function mapRamAgriCustomerLedgerApiToFullPanel(apiData) {
  if (!apiData || !apiData.customer) return null
  const customer = apiData.customer
  const summary = apiData.summary || {}
  const rawEntries = Array.isArray(apiData.entries) ? apiData.entries : []
  /** API returns newest-first; chronological oldest-first */
  const chrono = [...rawEntries].reverse()
  const openingBalance = Number(summary.openingBalance) || 0

  const entriesChrono = chrono.map((e, i) => {
    const isDebit = e.type === "DEBIT"
    const amount = Number(e.amount) || 0
    const balanceAfter = Number(e.balance) || 0
    const balanceBefore = i === 0 ? openingBalance : Number(chrono[i - 1].balance) || 0
    const refType = e.details?.refType || e.category || "—"
    return {
      date: String(e.date || ""),
      type: isDebit ? "DEBIT" : "CREDIT",
      category: String(e.category || refType || "—"),
      reference: String(refType),
      description: String(e.description || e.narration || "—"),
      amount,
      balance: balanceAfter,
      balanceBefore,
      balanceAfter,
      raw: { ...e, details: e.details }
    }
  })

  const entries = [...entriesChrono].sort((a, b) => {
    const da = new Date(a.date).getTime()
    const db = new Date(b.date).getTime()
    if (da !== db) return db - da
    return String(b.reference).localeCompare(String(a.reference))
  })

  const totalDebit = Number(summary.totalDebit) || 0
  const totalCredit = Number(summary.totalCredit) || 0
  const outstanding = Number(summary.outstanding) || 0

  return {
    meta: { variant: "farmerPlant", orders: [] },
    customer: {
      name: String(customer.name || ""),
      mobile: String(customer.mobile || customer.mobileNumber || ""),
      village: String(customer.village || ""),
      taluka: String(customer.taluka || ""),
      district: String(customer.district || "")
    },
    summary: {
      totalOrders: Number(summary.totalOrders) || 0,
      openingBalance,
      totalDebit,
      totalCredit,
      outstanding,
      totalBilled: totalDebit,
      totalCollected: totalCredit,
      summaryDerivedFromLines: false
    },
    entries
  }
}

/** Map GET_RAM_AGRI_CUSTOMER_LEDGER API payload to LedgerPanel shape */
export function mapApiToCustomerLedger(apiData) {
  if (!apiData || !apiData.customer) return null
  const customer = apiData.customer
  const summary = apiData.summary || {}
  const rawEntries = apiData.entries || apiData.transactions || []
  const entries = rawEntries.map((e) => ({
    date: String(e.date || e.createdAt || ""),
    type: e.type || "CREDIT",
    category: String(e.category || e.type || "—"),
    reference: String(e.reference || e.ref || "—"),
    description: String(e.description || e.narration || "—"),
    amount: Number(e.amount) || 0,
    balance: Number(e.balance ?? e.runningBalance) || 0,
    details: e.details
  }))
  return {
    customer: {
      name: String(customer.name || ""),
      mobile: String(customer.mobile || customer.mobileNumber || ""),
      village: String(customer.village || ""),
      taluka: String(customer.taluka || ""),
      district: String(customer.district || "")
    },
    summary: {
      totalOrders: Number(summary.totalOrders) || 0,
      openingBalance: Number(summary.openingBalance) || 0,
      totalDebit: Number(summary.totalDebit) || 0,
      totalCredit: Number(summary.totalCredit) || 0,
      outstanding: Number(summary.outstanding) || 0
    },
    entries
  }
}

/** Map GET_FARMER_LEDGER (/inventory/sell-orders/farmer-ledger) payload to LedgerPanel shape */
export function mapFarmerLedgerToPanelLedger(apiData) {
  if (!apiData || !apiData.farmer) return null
  const farmer = apiData.farmer
  const summary = apiData.summary || {}
  const payments = Array.isArray(apiData.payments) ? apiData.payments : []
  const entries = payments.map((p) => ({
    date: String(p.paymentDate || p.date || ""),
    type: "CREDIT",
    category: String(p.paymentStatus || "Payment"),
    reference: String(p.orderNumber ?? p.orderId ?? p.transactionId ?? "—"),
    description: [p.modeOfPayment, p.bankName, p.transactionId].filter(Boolean).join(" · ") || "Payment",
    amount: Math.abs(Number(p.paidAmount) || 0),
    balance: Number(p.runningBalance ?? p.balanceAfter ?? 0) || 0
  }))
  const totalPaid = Number(summary.totalPaidAmount) || 0
  const totalOrderVal = Number(summary.totalOrderValue) || 0
  const outstandingAmt = Number(summary.outstandingAmount ?? summary.outstanding) || 0
  return {
    customer: {
      name: String(farmer.name || ""),
      mobile: String(farmer.mobileNumber || farmer.mobile || ""),
      village: String(farmer.village || ""),
      taluka: String(farmer.taluka || ""),
      district: String(farmer.district || "")
    },
    summary: {
      totalOrders: Number(summary.totalOrders) || 0,
      openingBalance: Number(summary.openingBalance) || 0,
      totalDebit: Math.max(0, totalOrderVal - totalPaid) || Number(summary.totalDebit) || 0,
      totalCredit: totalPaid || Number(summary.totalCredit) || 0,
      outstanding: outstandingAmt
    },
    entries
  }
}

const LEDGER_REF_RANK = { ORDER: 0, PAYMENT: 1, ADJUSTMENT: 2, REVERSAL: 3 }

/** Order lines before payments when entryDate ties (matches backend). */
function sortFarmerPlantLedgerEntriesCanonical(arr) {
  return [...arr].sort((a, b) => {
    const da = new Date(a.date || a.entryDate).getTime()
    const db = new Date(b.date || b.entryDate).getTime()
    if (da !== db) return da - db
    const ra = LEDGER_REF_RANK[a.refType] ?? 99
    const rb = LEDGER_REF_RANK[b.refType] ?? 99
    if (ra !== rb) return ra - rb
    const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    if (ca !== cb) return ca - cb
    return String(a._id || "").localeCompare(String(b._id || ""))
  })
}

/**
 * Positive = farmer owes nursery; negative = advance / overpaid.
 */
export function formatFarmerLedgerRunningBalance(n) {
  const v = Number(n) || 0
  const abs = `₹${Math.abs(v).toLocaleString("en-IN")}`
  if (v > 0) return { label: "Due", text: abs, tone: "due" }
  if (v < 0) return { label: "Advance", text: abs, tone: "advance" }
  return { label: "Settled", text: "₹0", tone: "zero" }
}

/**
 * Map GET /order/farmer-plant-ledger (line entries included by default) to LedgerPanel shape.
 */
export function mapFarmerPlantLedgerApiToPanel(apiData) {
  if (!apiData) return null
  const farmer = apiData.farmer
  const summary = apiData.summary || {}
  const rawEntries = Array.isArray(apiData.entries) ? apiData.entries : []
  const orders = Array.isArray(apiData.orders) ? apiData.orders : []

  const sortedRaw = sortFarmerPlantLedgerEntriesCanonical(rawEntries)

  let totalBilled = Number(summary.totalBilled) || 0
  let totalCollected = Number(summary.totalCollected) || 0
  let outstanding = Number(summary.outstanding) || 0
  const orderCount = Number(summary.orderCount) || orders.length || 0

  const allHaveStored =
    sortedRaw.length > 0 &&
    sortedRaw.every(
      (e) =>
        e.outstandingBefore != null &&
        e.outstandingAfter != null &&
        !Number.isNaN(Number(e.outstandingBefore)) &&
        !Number.isNaN(Number(e.outstandingAfter))
    )

  let openingBalance = 0
  if (sortedRaw.length > 0 && !allHaveStored) {
    const first = sortedRaw[0]
    const net = (Number(first.debit) || 0) - (Number(first.credit) || 0)
    openingBalance = (Number(first.balance) || 0) - net
  } else if (sortedRaw.length > 0 && allHaveStored) {
    openingBalance = Number(sortedRaw[0].outstandingBefore) || 0
  }

  /**
   * API totals come from orders whose createdAt is in the date range. Ledger lines are filtered by
   * entry date — so you can have payments in-range for older orders and get summary 0. Reconstruct
   * purchase / collected from lines when the API summary is empty but lines exist.
   */
  let summaryDerivedFromLines = false
  if (sortedRaw.length > 0 && totalBilled === 0 && totalCollected === 0) {
    let sumDebit = 0
    let sumCredit = 0
    for (const e of sortedRaw) {
      sumDebit += Number(e.debit) || 0
      sumCredit += Number(e.credit) || 0
    }
    totalBilled = Math.round(sumDebit * 100) / 100
    totalCollected = Math.round(sumCredit * 100) / 100
    summaryDerivedFromLines = true
  }

  let running = openingBalance
  const entriesChrono = sortedRaw.map((e) => {
    const isDebit = e.type === "DEBIT" || (Number(e.debit) || 0) > 0
    const debit = Number(e.debit) || 0
    const credit = Number(e.credit) || 0
    const amount = isDebit ? debit : credit
    const ref =
      e.refType === "ORDER"
        ? "ORDER"
        : e.refType === "PAYMENT"
          ? "PAYMENT"
          : e.refType === "REVERSAL"
            ? "REVERSAL"
            : String(e.refType || "—")
    const walletHint =
      e.metadata && e.metadata.isWalletPayment ? " · Dealer wallet" : ""

    let balanceBefore
    let balanceAfter
    if (allHaveStored) {
      balanceBefore = Number(e.outstandingBefore) || 0
      balanceAfter = Number(e.outstandingAfter) || 0
      running = balanceAfter
    } else {
      balanceBefore = running
      running += debit - credit
      balanceAfter = running
    }

    return {
      date: String(e.date || ""),
      type: isDebit ? "DEBIT" : "CREDIT",
      category: String(e.refType || e.category || "—"),
      reference: ref,
      description: String(e.description || "—") + walletHint,
      amount,
      balance: balanceAfter,
      balanceBefore,
      balanceAfter,
      raw: e
    }
  })

  // Final outstanding must be taken from the chronological chain end (last processed row),
  // not from the display-sorted array.
  if (entriesChrono.length > 0) {
    outstanding = Math.round(
      (Number(entriesChrono[entriesChrono.length - 1].balanceAfter) || 0) * 100
    ) / 100
  }

  // Display newest-first by ledger row creation time. Balances are computed in chronological order above.
  const entries = [...entriesChrono]
  entries.sort((a, b) => {
    const ta = a.raw?.createdAt ? new Date(a.raw.createdAt).getTime() : 0
    const tb = b.raw?.createdAt ? new Date(b.raw.createdAt).getTime() : 0
    if (ta !== tb) return tb - ta
    const ea = a.raw?.date || a.raw?.entryDate
    const eb = b.raw?.date || b.raw?.entryDate
    const da = ea ? new Date(ea).getTime() : 0
    const db = eb ? new Date(eb).getTime() : 0
    if (da !== db) return db - da
    const ia = String(a.raw?._id || "")
    const ib = String(b.raw?._id || "")
    return ib.localeCompare(ia)
  })

  return {
    meta: { variant: "farmerPlant", orders },
    customer: farmer
      ? {
          name: String(farmer.name || ""),
          mobile: String(farmer.mobileNumber ?? farmer.mobile ?? ""),
          village: String(farmer.village || ""),
          taluka: String(farmer.taluka || ""),
          district: String(farmer.district || "")
        }
      : {
          name: "—",
          mobile: "",
          village: "",
          taluka: "",
          district: ""
        },
    summary: {
      totalOrders: orderCount,
      openingBalance,
      totalDebit: totalBilled,
      totalCredit: totalCollected,
      outstanding,
      totalBilled,
      totalCollected,
      summaryDerivedFromLines
    },
    entries
  }
}

const CENTRAL_TRANSFER_EVENTS = new Set([
  "FARMER_ADVANCE_TRANSFER",
  "FARMER_PAYMENT_TRANSFER"
])

function centralLinePresentation(line) {
  const eventType = line.metadata?.eventType || line.eventType
  const isTransfer = CENTRAL_TRANSFER_EVENTS.has(eventType)
  let category = String(line.accountCode || "AR")
  let description =
    line.metadata?.description ||
    line.metadata?.eventType ||
    line.sourceLineRef ||
    "Central ledger line"

  if (eventType === "FARMER_ADVANCE_TRANSFER") {
    category = "Advance transfer"
    if (line.metadata?.direction === "OUT") {
      description = description.includes("transfer") ? description : "Advance transfer out"
    } else if (line.metadata?.direction === "IN") {
      description = description.includes("transfer") ? description : "Advance transfer in"
    }
  } else if (eventType === "FARMER_PAYMENT_TRANSFER") {
    category = "Payment transfer"
    if (line.metadata?.direction === "REVERSAL") {
      description = description.includes("transfer") ? description : "Payment transfer out"
    } else if (line.metadata?.direction === "CREDIT") {
      description = description.includes("transfer") ? description : "Payment transfer in"
    }
  }

  return { eventType, isTransfer, category, description }
}

/**
 * Map GET /finance/reports/party-statement → LedgerPanel shape (central AR).
 */
export function mapCentralPartyStatementToPanel(apiData, customerFallback = {}) {
  if (!apiData) return null
  const rawLines = Array.isArray(apiData.entries) ? apiData.entries : []
  let totalDebit = 0
  let totalCredit = 0
  const entriesChrono = rawLines.map((l) => {
    const debit = Number(l.debit) || 0
    const credit = Number(l.credit) || 0
    totalDebit += debit
    totalCredit += credit
    const isDebit = debit > 0
    const amount = isDebit ? debit : credit
    const balanceAfter = Number(l.runningBalance) || 0
    const balanceBefore = roundMoneyCentral(balanceAfter - debit + credit)
    const pres = centralLinePresentation(l)
    return {
      date: l.entryDate ? String(l.entryDate) : "",
      type: isDebit ? "DEBIT" : "CREDIT",
      category: pres.category,
      reference: String(l.sourceLineRef || pres.eventType || "—"),
      description: String(pres.description),
      amount,
      balance: balanceAfter,
      balanceBefore,
      balanceAfter,
      isTransfer: pres.isTransfer,
      eventType: pres.eventType,
      raw: l
    }
  })

  const entries = [...entriesChrono].reverse()
  const transferCount = entries.filter((e) => e.isTransfer).length
  const outstanding =
    entriesChrono.length > 0
      ? Number(entriesChrono[entriesChrono.length - 1].balanceAfter) || 0
      : Number(apiData.closingBalance) || 0

  const mobile = String(apiData.partyId || customerFallback.mobile || "")
  return {
    meta: {
      variant: "central",
      partyType: apiData.partyType,
      accountCode: apiData.accountCode,
      includeTransfers: Boolean(apiData.includeTransfers),
      transferCount
    },
    customer: {
      name: String(customerFallback.name || mobile || "Party"),
      mobile,
      village: String(customerFallback.village || ""),
      taluka: String(customerFallback.taluka || ""),
      district: String(customerFallback.district || "")
    },
    summary: {
      totalOrders: 0,
      openingBalance: Number(apiData.openingBalance) || 0,
      totalDebit: roundMoneyCentral(totalDebit),
      totalCredit: roundMoneyCentral(totalCredit),
      outstanding: roundMoneyCentral(outstanding),
      totalBilled: roundMoneyCentral(totalDebit),
      totalCollected: roundMoneyCentral(totalCredit)
    },
    entries
  }
}

function roundMoneyCentral(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}
