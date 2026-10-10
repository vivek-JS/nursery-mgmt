import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import moment from "moment"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { BankApprovalMenu } from "./BankApprovalMenu"
import { StatusBadge } from "./StatusBadge"
import { getStatementMatchPresentation } from "./bankMatchLabels"
import { CashbookPanel } from "./CashbookPanel"

const SUB_TABS = [
  { id: "pending", label: "Pending" },
  { id: "verified", label: "Verified" },
  { id: "suspense", label: "Suspense" },
  { id: "cash", label: "Cashbook" },
  { id: "statement", label: "Statement" },
]

const SUSPENSE_REASON_LABEL = {
  NO_MATCH: "No match",
  MULTIPLE_MATCH: "Multiple match",
  AMOUNT_MISMATCH: "Amount mismatch",
  DATE_MISMATCH: "Date mismatch",
  ORPHAN_CREDIT: "Orphan credit",
  MANUAL_REVIEW: "Needs review",
  CASH_MATCH: "Bank match found (cash)",
}

const CHECK_LABEL = {
  VERIFIED: { text: "Matched on UTR", tone: "ok" },
  AMOUNT_MISMATCH: { text: "Amount mismatch", tone: "bad" },
  MULTIPLE_MATCH: { text: "Several possible credits", tone: "warn" },
  NEEDS_REVIEW: { text: "Needs confirmation", tone: "warn" },
  NOT_FOUND: { text: "Not in bank", tone: "warn" },
}

const TONE_CLASS = {
  ok: "border-emerald-600/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  bad: "border-rose-600/30 bg-rose-500/10 text-rose-900 dark:text-rose-100",
  muted: "border-border bg-muted/40 text-muted-foreground",
}

function Pill({ tone = "muted", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  )
}

const fmtDate = (d) => (d ? moment(d).format("DD-MM-YYYY") : "—")
const fmtAmount = (n) => (n == null || n === "" ? "—" : Number(n).toLocaleString("en-IN"))
const paymentRef = (p) => p?.utrNumber || p?.transactionId || p?.chequeNumber || p?.ref || "—"
const STATEMENT_PAGE_SIZE = 50
const PENDING_PAGE_SIZE = 50

function pendingOutcome(payment, checkResults) {
  const checked = checkResults[String(payment.paymentId)]
  if (checked?.result) return checked
  if (payment.statementMatch === "EXACT") {
    return { result: "VERIFIED", message: "UTR and amount are already on the statement" }
  }
  if (payment.statementMatch === "AMOUNT_MISMATCH") {
    return {
      result: "AMOUNT_MISMATCH",
      message:
        payment.statementAmount != null
          ? `Statement has ₹${Number(payment.statementAmount).toLocaleString("en-IN")}`
          : "Same UTR, different amount",
    }
  }
  if (payment.statementMatch === "NOT_FOUND") {
    return { result: "NOT_FOUND", message: "Not on the loaded statement" }
  }
  return null
}

export function BankReconciliationLive({
  reconcileDateFrom,
  reconcileDateTo,
  onDateFromChange,
  onDateToChange,
  unclearedList,
  forApprovalList,
  loadingUncleared,
  loadingForApproval,
  reconcileLoading,
  reconcileResult,
  bankStatementLoading,
  bankStatementMessage,
  onFetchBankStatement,
  updatingPaymentId,
  onRefreshUncleared,
  onRefreshForApproval,
  onReconcile,
  onApproveOrReject
}) {
  const [subTab, setSubTab] = useState("pending")
  const [accountNumber, setAccountNumber] = useState("")
  const [accounts, setAccounts] = useState([])

  /** paymentId → { result, message } from the last on-demand check. */
  const [checkResults, setCheckResults] = useState({})
  const [checkingPaymentId, setCheckingPaymentId] = useState(null)

  const [suspenseList, setSuspenseList] = useState([])
  const [loadingSuspense, setLoadingSuspense] = useState(false)
  const [linkTarget, setLinkTarget] = useState(null)
  const [busySuspenseId, setBusySuspenseId] = useState(null)

  const [unmatchedDepositCount, setUnmatchedDepositCount] = useState(0)

  const [statementRows, setStatementRows] = useState([])
  const [statementTotal, setStatementTotal] = useState(0)
  const [statementFilter, setStatementFilter] = useState("all")
  const [statementCounts, setStatementCounts] = useState(null)
  const [statementHasMore, setStatementHasMore] = useState(false)
  const [loadingStatement, setLoadingStatement] = useState(false)
  const [loadingMoreStatement, setLoadingMoreStatement] = useState(false)
  const [busyStatementId, setBusyStatementId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState(null)
  const statementRowsRef = useRef([])
  const statementHasMoreRef = useRef(false)
  const statementLoadLockRef = useRef(false)
  const statementReqIdRef = useRef(0)
  const prevSyncingRef = useRef(false)
  statementRowsRef.current = statementRows
  statementHasMoreRef.current = statementHasMore

  const [pendingRows, setPendingRows] = useState([])
  const [pendingTotal, setPendingTotal] = useState(0)
  const [pendingHasMore, setPendingHasMore] = useState(false)
  const [loadingPending, setLoadingPending] = useState(false)
  const [loadingMorePending, setLoadingMorePending] = useState(false)
  const pendingRowsRef = useRef([])
  const pendingHasMoreRef = useRef(false)
  const pendingLoadLockRef = useRef(false)
  const pendingReqIdRef = useRef(0)
  const prevReconcileRef = useRef(false)
  pendingRowsRef.current = pendingRows
  pendingHasMoreRef.current = pendingHasMore

  const apiError = (e, fallback) =>
    e?.response?.data?.message || e?.message || fallback

  useEffect(() => {
    let cancelled = false
    const loadAccounts = async () => {
      try {
        const res = await NetworkManager(API.BANKING.GET_STATEMENT_ACCOUNTS).request()
        if (cancelled) return
        const list = res?.data?.data ?? []
        setAccounts(list)
        if (list.length === 1) setAccountNumber(list[0])
      } catch {
        if (!cancelled) setAccounts([])
      }
    }
    loadAccounts()
    return () => {
      cancelled = true
    }
  }, [])

  const fetchSuspense = useCallback(async () => {
    setLoadingSuspense(true)
    try {
      const res = await NetworkManager(API.BANKING.GET_SUSPENSE).request({}, { limit: 200 })
      setSuspenseList(res?.data?.data ?? [])
    } catch (e) {
      Toast.error(apiError(e, "Failed to load suspense entries"))
      setSuspenseList([])
    } finally {
      setLoadingSuspense(false)
    }
  }, [])

  const fetchStatement = useCallback(
    async ({ append = false } = {}) => {
      if (append) {
        if (statementLoadLockRef.current || !statementHasMoreRef.current) return
        statementLoadLockRef.current = true
        setLoadingMoreStatement(true)
      } else {
        statementReqIdRef.current += 1
        statementLoadLockRef.current = false
        statementRowsRef.current = []
        statementHasMoreRef.current = false
        setStatementRows([])
        setStatementHasMore(false)
        setLoadingStatement(true)
      }

      const reqId = statementReqIdRef.current
      const skip = append ? statementRowsRef.current.length : 0

      try {
        const res = await NetworkManager(API.BANKING.GET_STATEMENT).request(
          {},
          {
            dateFrom: reconcileDateFrom,
            dateTo: reconcileDateTo,
            limit: STATEMENT_PAGE_SIZE,
            skip,
            status: statementFilter,
            ...(accountNumber ? { accountNumber } : {}),
          }
        )
        if (reqId !== statementReqIdRef.current) return

        const body = res?.data ?? {}
        if (body.counts) setStatementCounts(body.counts)
        const page = Array.isArray(body.data) ? body.data : []
        const total = Number(body.total ?? 0)
        setStatementTotal(total)
        setStatementRows((prev) => {
          const next = append ? [...prev, ...page] : page
          const more =
            typeof body.hasMore === "boolean" ? body.hasMore : next.length < total && page.length > 0
          statementHasMoreRef.current = more
          setStatementHasMore(more)
          return next
        })
      } catch (e) {
        if (reqId !== statementReqIdRef.current) return
        Toast.error(apiError(e, "Failed to load statement"))
        if (!append) {
          setStatementRows([])
          setStatementTotal(0)
          statementHasMoreRef.current = false
          setStatementHasMore(false)
        }
      } finally {
        if (append) {
          statementLoadLockRef.current = false
          setLoadingMoreStatement(false)
        } else if (reqId === statementReqIdRef.current) {
          setLoadingStatement(false)
        }
      }
    },
    [reconcileDateFrom, reconcileDateTo, accountNumber, statementFilter]
  )

  const loadMoreStatement = useCallback(() => {
    void fetchStatement({ append: true })
  }, [fetchStatement])

  const fetchPending = useCallback(
    async ({ append = false } = {}) => {
      if (append) {
        if (pendingLoadLockRef.current || !pendingHasMoreRef.current) return
        pendingLoadLockRef.current = true
        setLoadingMorePending(true)
      } else {
        pendingReqIdRef.current += 1
        pendingLoadLockRef.current = false
        pendingRowsRef.current = []
        pendingHasMoreRef.current = false
        setPendingRows([])
        setPendingHasMore(false)
        setLoadingPending(true)
      }

      const reqId = pendingReqIdRef.current
      const skip = append ? pendingRowsRef.current.length : 0

      try {
        const res = await NetworkManager(API.BANKING.GET_PENDING_PAYMENTS).request(
          {},
          {
            limit: PENDING_PAGE_SIZE,
            skip,
          }
        )
        if (reqId !== pendingReqIdRef.current) return

        const body = res?.data ?? {}
        const page = Array.isArray(body.data) ? body.data : []
        const total = Number(body.total ?? 0)
        setPendingTotal(total)
        setPendingRows((prev) => {
          const next = append ? [...prev, ...page] : page
          const more =
            typeof body.hasMore === "boolean" ? body.hasMore : next.length < total && page.length > 0
          pendingHasMoreRef.current = more
          setPendingHasMore(more)
          return next
        })
      } catch (e) {
        if (reqId !== pendingReqIdRef.current) return
        Toast.error(apiError(e, "Failed to load uncleared payments"))
        if (!append) {
          setPendingRows([])
          setPendingTotal(0)
          pendingHasMoreRef.current = false
          setPendingHasMore(false)
        }
      } finally {
        if (append) {
          pendingLoadLockRef.current = false
          setLoadingMorePending(false)
        } else if (reqId === pendingReqIdRef.current) {
          setLoadingPending(false)
        }
      }
    },
    []
  )

  const loadMorePending = useCallback(() => {
    void fetchPending({ append: true })
  }, [fetchPending])

  useEffect(() => {
    void fetchPending()
  }, [fetchPending])

  useEffect(() => {
    if (subTab === "suspense") fetchSuspense()
    if (subTab === "statement") void fetchStatement()
  }, [subTab, fetchSuspense, fetchStatement])

  useEffect(() => {
    if (prevSyncingRef.current && !bankStatementLoading) {
      if (subTab === "statement") void fetchStatement()
      void fetchPending()
    }
    prevSyncingRef.current = bankStatementLoading
  }, [bankStatementLoading, subTab, fetchStatement, fetchPending])

  useEffect(() => {
    if (prevReconcileRef.current && !reconcileLoading) {
      void fetchPending()
    }
    prevReconcileRef.current = reconcileLoading
  }, [reconcileLoading, fetchPending])

  const handleCheckBank = async (p) => {
    setCheckingPaymentId(String(p.paymentId))
    try {
      const res = await NetworkManager(API.BANKING.POST_VERIFY_PAYMENT).request({
        source: p.source,
        orderMongoId: p.orderMongoId,
        paymentId: String(p.paymentId),
      })
      const data = res?.data?.data ?? {}
      setCheckResults((prev) => ({ ...prev, [String(p.paymentId)]: data }))
      if (data.result === "VERIFIED") {
        Toast.success(data.message || "Payment verified by bank")
        setPendingRows((prev) => prev.filter((row) => String(row.paymentId) !== String(p.paymentId)))
        setPendingTotal((n) => Math.max(0, n - 1))
        if (onRefreshForApproval) await onRefreshForApproval()
      } else {
        Toast.info(data.message || "Bank check complete")
        setPendingRows((prev) =>
          prev.map((row) =>
            String(row.paymentId) === String(p.paymentId)
              ? {
                  ...row,
                  statementMatch:
                    data.result === "AMOUNT_MISMATCH"
                      ? "AMOUNT_MISMATCH"
                      : data.result === "NOT_FOUND"
                        ? "NOT_FOUND"
                        : row.statementMatch,
                  statementAmount: data.bankAmount ?? row.statementAmount,
                }
              : row
          )
        )
      }
    } catch (e) {
      Toast.error(apiError(e, "Bank check failed"))
    } finally {
      setCheckingPaymentId(null)
    }
  }

  const handleLinkSuspense = async (entry, payment) => {
    setBusySuspenseId(String(entry._id))
    try {
      await NetworkManager(API.BANKING.POST_LINK_SUSPENSE).request(
        {
          source: payment.source,
          orderMongoId: payment.orderMongoId,
          paymentId: String(payment.paymentId),
        },
        { pathParams: [String(entry._id)] }
      )
      Toast.success("Suspense entry linked to payment")
      setLinkTarget(null)
      await fetchSuspense()
      await fetchPending()
      if (onRefreshForApproval) await onRefreshForApproval()
    } catch (e) {
      Toast.error(apiError(e, "Could not link payment"))
    } finally {
      setBusySuspenseId(null)
    }
  }

  const handleWriteOff = async (entry) => {
    setBusySuspenseId(String(entry._id))
    try {
      await NetworkManager(API.BANKING.POST_RESOLVE_SUSPENSE).request(
        { action: "WRITE_OFF", resolutionNotes: "Written off from banking tab" },
        { pathParams: [String(entry._id)] }
      )
      Toast.success("Suspense entry written off")
      await fetchSuspense()
      if (entry.paymentId) await fetchPending()
    } catch (e) {
      Toast.error(apiError(e, "Write-off failed"))
    } finally {
      setBusySuspenseId(null)
    }
  }

  const handleConfirmCashMatch = (entry) =>
    handleLinkSuspense(entry, {
      source: entry.source,
      orderMongoId: entry.orderMongoId,
      paymentId: entry.paymentId,
    })

  const handleRejectCashMatch = async (entry) => {
    setBusySuspenseId(String(entry._id))
    try {
      await NetworkManager(API.BANKING.POST_RESOLVE_SUSPENSE).request(
        { action: "RESOLVE", resolutionNotes: "Not this cash credit" },
        { pathParams: [String(entry._id)] }
      )
      Toast.success("Match dismissed. The payment stays with the employee's cash in hand.")
      await fetchSuspense()
    } catch (e) {
      Toast.error(apiError(e, "Could not dismiss the match"))
    } finally {
      setBusySuspenseId(null)
    }
  }

  const handleReturnToPending = async (entry) => {
    setBusySuspenseId(String(entry._id))
    try {
      await NetworkManager(API.BANKING.POST_RESOLVE_SUSPENSE).request(
        { action: "RESOLVE", resolutionNotes: "Returned to pending from banking tab" },
        { pathParams: [String(entry._id)] }
      )
      Toast.success("Payment returned to Pending")
      await fetchSuspense()
      await fetchPending()
    } catch (e) {
      Toast.error(apiError(e, "Could not return payment to pending"))
    } finally {
      setBusySuspenseId(null)
    }
  }

  const handleVerifyStatementLine = async (row) => {
    setBusyStatementId(String(row._id))
    try {
      await NetworkManager(API.BANKING.POST_VERIFY_STATEMENT_LINE).request(
        {},
        { pathParams: [String(row._id)] }
      )
      Toast.success("Statement line marked verified")
      setStatementRows((prev) =>
        prev.map((r) =>
          String(r._id) === String(row._id)
            ? { ...r, statementVerified: true, statementVerifiedAt: new Date().toISOString() }
            : r
        )
      )
    } catch (e) {
      Toast.error(apiError(e, "Could not mark line verified"))
    } finally {
      setBusyStatementId(null)
    }
  }

  const handleImportStatement = async ({ csv, account }) => {
    if (!account) {
      Toast.error("Pick the bank account these lines belong to")
      return
    }
    setImporting(true)
    setImportSummary(null)
    try {
      const res = await NetworkManager(API.BANKING.POST_IMPORT_STATEMENT).request({
        csv,
        accountNumber: account,
      })
      const data = res?.data?.data ?? {}
      setImportSummary(data)
      if (data.inserted > 0) {
        Toast.success(`Imported ${data.inserted} line${data.inserted === 1 ? "" : "s"}`)
      } else {
        Toast.info("Nothing new — every line was already in the statement")
      }
      if (!accountNumber) setAccountNumber(account)
      await fetchStatement()
      await fetchPending()
    } catch (e) {
      Toast.error(apiError(e, "Could not import the statement"))
    } finally {
      setImporting(false)
    }
  }

  const counts = useMemo(
    () => ({
      pending: pendingTotal,
      verified: forApprovalList?.length ?? 0,
      suspense: suspenseList.length,
      cash: unmatchedDepositCount || "",
      statement: statementTotal,
    }),
    [pendingTotal, forApprovalList, suspenseList, unmatchedDepositCount, statementTotal]
  )

  const suspenseByAccount = useMemo(() => {
    const groups = new Map()
    for (const entry of suspenseList) {
      const key = entry.bankTransactionId
        ? entry.accountNumber || "Unknown account"
        : "ERP payments not found in bank"
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(entry)
    }
    return [...groups.entries()]
  }, [suspenseList])

  return (
    <div className="space-y-4">
      <div className="erp-card animate-fade-up stagger-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1">Banking</h2>
            <p className="text-xs text-muted-foreground">
              Talking to the ICICI sandbox (account 010205001809). Date range starts at
              1 Jan–10 Feb 2024, which is the only window the sandbox has data for.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            {accounts.length > 0 && (
              <label className="text-[11px] font-semibold text-muted-foreground">
                Account
                <select
                  className="erp-input block mt-1 text-xs"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                >
                  <option value="">All accounts</option>
                  {accounts.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-[11px] font-semibold text-muted-foreground">
              From
              <input
                type="date"
                className="erp-input block mt-1 text-xs"
                value={reconcileDateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
              />
            </label>
            <label className="text-[11px] font-semibold text-muted-foreground">
              To
              <input
                type="date"
                className="erp-input block mt-1 text-xs"
                value={reconcileDateTo}
                onChange={(e) => onDateToChange(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={onFetchBankStatement}
              disabled={bankStatementLoading}
              title="Pull ICICI statement lines into ERP for this date range"
            >
              {bankStatementLoading ? "…" : "Sync statement"}
            </button>
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={onReconcile}
              disabled={reconcileLoading}
            >
              {reconcileLoading ? "…" : "Reconcile all"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border mb-3 overflow-x-auto">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                subTab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[10px] text-muted-foreground">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        {bankStatementMessage && (
          <p className="text-[11px] text-muted-foreground mb-2 max-w-2xl">{bankStatementMessage}</p>
        )}
        {reconcileResult && subTab === "pending" && (
          <div className="mb-3 px-3 py-2 rounded-sm bg-status-collected-bg text-status-collected text-xs font-medium">
            {reconcileResult.message ||
              (reconcileResult.updatedCount && reconcileResult.updatedCount > 0
                ? `${reconcileResult.updatedCount} payment(s) verified by bank.`
                : "No new matches.")}
          </div>
        )}

        {subTab === "pending" && (
          <PendingTable
            rows={pendingRows}
            total={pendingTotal}
            pageSize={PENDING_PAGE_SIZE}
            hasMore={pendingHasMore}
            loading={loadingPending}
            loadingMore={loadingMorePending}
            checkResults={checkResults}
            checkingPaymentId={checkingPaymentId}
            onCheck={handleCheckBank}
            onRefresh={() => fetchPending()}
            onLoadMore={loadMorePending}
          />
        )}

        {subTab === "verified" && (
          <VerifiedTable
            rows={forApprovalList}
            loading={loadingForApproval}
            updatingPaymentId={updatingPaymentId}
            onRefresh={onRefreshForApproval}
            onApproveOrReject={onApproveOrReject}
          />
        )}

        {subTab === "suspense" && (
          <SuspenseTables
            groups={suspenseByAccount}
            loading={loadingSuspense}
            busyId={busySuspenseId}
            onRefresh={fetchSuspense}
            onOpenLink={setLinkTarget}
            onConfirmMatch={handleConfirmCashMatch}
            onRejectMatch={handleRejectCashMatch}
            onWriteOff={handleWriteOff}
            onReturnToPending={handleReturnToPending}
          />
        )}

        {subTab === "cash" && (
          <CashbookPanel
            accounts={accounts}
            defaultAccount={accountNumber}
            onCountChange={setUnmatchedDepositCount}
          />
        )}

        {subTab === "statement" && (
          <StatementTable
            rows={statementRows}
            total={statementTotal}
            filter={statementFilter}
            counts={statementCounts}
            onFilterChange={setStatementFilter}
            pageSize={STATEMENT_PAGE_SIZE}
            hasMore={statementHasMore}
            loading={loadingStatement}
            loadingMore={loadingMoreStatement}
            busyId={busyStatementId}
            onVerify={handleVerifyStatementLine}
            onRefresh={() => fetchStatement()}
            onLoadMore={loadMoreStatement}
            accounts={accounts}
            defaultAccount={accountNumber}
            importing={importing}
            importSummary={importSummary}
            onImport={handleImportStatement}
          />
        )}
      </div>

      {linkTarget && (
        <LinkPaymentDrawer
          entry={linkTarget}
          candidates={pendingRows}
          busy={busySuspenseId === String(linkTarget._id)}
          onClose={() => setLinkTarget(null)}
          onLink={(payment) => handleLinkSuspense(linkTarget, payment)}
        />
      )}
    </div>
  )
}

function RefreshBar({ onRefresh, loading, children }) {
  return (
    <div className="flex flex-wrap gap-2 items-center mb-3">
      {onRefresh && (
        <button type="button" className="btn-primary text-xs" onClick={onRefresh} disabled={loading}>
          {loading ? "…" : "Refresh"}
        </button>
      )}
      {children}
    </div>
  )
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center text-muted-foreground py-6">
        {children}
      </td>
    </tr>
  )
}

function PendingTable({
  rows,
  total = 0,
  pageSize = PENDING_PAGE_SIZE,
  hasMore = false,
  loading,
  loadingMore = false,
  checkResults,
  checkingPaymentId,
  onCheck,
  onRefresh,
  onLoadMore,
}) {
  const scrollRef = useRef(null)
  const shown = rows.length
  const totalLabel = Number(total).toLocaleString("en-IN")

  return (
    <>
      <p className="text-xs text-muted-foreground mb-2">
        ERP payments with a UTR or cheque. The Statement column is the match
        against the loaded bank file (UTR + amount). Date range above is for
        Sync / Statement, not this list.
      </p>
      <RefreshBar onRefresh={onRefresh} loading={loading}>
        {shown > 0 && (
          <span className="text-[11px] text-muted-foreground">
            Showing {shown.toLocaleString("en-IN")} of {totalLabel}
            {hasMore ? ` · ${pageSize} per page · scroll for more` : ""}
          </span>
        )}
      </RefreshBar>
      {loading && shown === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div ref={scrollRef} className="overflow-auto max-h-[min(68vh,720px)]">
          <table className="data-table">
            <thead className="sticky top-0 bg-background z-[1]">
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Party</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>UTR / Txn / Cheque</th>
                <th>Statement</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={8}>No pending bank payments in this date range</EmptyRow>
              ) : (
                rows.map((p) => {
                  const id = String(p.paymentId)
                  const outcome = pendingOutcome(p, checkResults)
                  const label = outcome ? CHECK_LABEL[outcome.result] : null
                  const hasRef = Boolean(p.utrNumber || p.transactionId || p.chequeNumber)
                  return (
                    <tr key={id}>
                      <td>{p.orderId}</td>
                      <td>{fmtDate(p.paymentDate)}</td>
                      <td>{p.farmerName || p.customerName || "—"}</td>
                      <td className="tabular">{fmtAmount(p.paidAmount)}</td>
                      <td>{p.modeOfPayment}</td>
                      <td>{paymentRef(p)}</td>
                      <td>
                        {label ? (
                          <Pill tone={label.tone}>{label.text}</Pill>
                        ) : (
                          <Pill tone="muted">Not checked</Pill>
                        )}
                        {outcome?.message && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 max-w-[22rem]">
                            {outcome.message}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-teal-600/40 text-teal-800 hover:bg-teal-500/10 disabled:opacity-50"
                          disabled={!hasRef || checkingPaymentId === id}
                          title={hasRef ? "Check this UTR against the bank" : "No reference to check"}
                          onClick={() => onCheck(p)}
                        >
                          {checkingPaymentId === id ? "…" : "Check bank"}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          {shown > 0 && (
            <ListScrollSentinel
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={onLoadMore}
              rootRef={scrollRef}
              loadingLabel="Loading more payments…"
              endLabel="End of pending payments"
            />
          )}
        </div>
      )}
    </>
  )
}

function VerifiedTable({ rows, loading, updatingPaymentId, onRefresh, onApproveOrReject }) {
  return (
    <>
      <p className="text-xs text-muted-foreground mb-2">
        Cleared bank verification. Approve to mark them collected.
      </p>
      <RefreshBar onRefresh={onRefresh} loading={loading} />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Amount</th>
                <th>UTR / Txn / Cheque</th>
                <th>Customer</th>
                <th>Bank status</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={7}>No payments pending approval</EmptyRow>
              ) : (
                rows.map((p) => {
                  const match = getStatementMatchPresentation(p)
                  return (
                    <tr key={String(p.paymentId)}>
                      <td>{p.orderId}</td>
                      <td>{fmtDate(p.paymentDate)}</td>
                      <td className="tabular">{fmtAmount(p.paidAmount)}</td>
                      <td>{paymentRef(p)}</td>
                      <td>{p.farmerName || p.customerName || "—"}</td>
                      <td>
                        <StatusBadge status="BANK_VERIFIED" />
                        <div className="text-[11px] text-muted-foreground mt-0.5">{match.label}</div>
                      </td>
                      <td>
                        <BankApprovalMenu
                          busy={updatingPaymentId === p.paymentId}
                          disabled={updatingPaymentId === p.paymentId}
                          onApprove={() =>
                            onApproveOrReject(
                              p.orderId,
                              String(p.paymentId),
                              "COLLECTED",
                              p.source,
                              p.orderMongoId,
                              p.paymentIndex
                            )
                          }
                          onReject={() =>
                            onApproveOrReject(
                              p.orderId,
                              String(p.paymentId),
                              "REJECTED",
                              p.source,
                              p.orderMongoId,
                              p.paymentIndex
                            )
                          }
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function SuspenseTables({
  groups,
  loading,
  busyId,
  onRefresh,
  onOpenLink,
  onConfirmMatch,
  onRejectMatch,
  onWriteOff,
  onReturnToPending,
}) {
  return (
    <>
      <p className="text-xs text-muted-foreground mb-2">
        Bank credits with no order, a different amount, or more than one possible match, ERP
        payments with no bank credit 24 hours after the payment date, and cash payments found on the
        statement (confirm or dismiss them).
      </p>
      <RefreshBar onRefresh={onRefresh} loading={loading} />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nothing in suspense</p>
      ) : (
        groups.map(([account, entries]) => (
          <div key={account} className="mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              {account}
            </h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>UTR</th>
                    <th>Amount</th>
                    <th>Narration</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={String(entry._id)}>
                      <td>{fmtDate(entry.txnDate)}</td>
                      <td>{entry.utr || "—"}</td>
                      <td className="tabular">{fmtAmount(entry.amount)}</td>
                      <td
                        className="max-w-[20rem] truncate"
                        title={[entry.orderId ? `Order ${entry.orderId}` : "", entry.narration].filter(Boolean).join(" · ")}
                      >
                        {entry.reason === "CASH_MATCH" && entry.orderId ? (
                          <>
                            <span className="font-semibold">Order {entry.orderId}</span>
                            {entry.narration ? ` · ${entry.narration}` : ""}
                          </>
                        ) : (
                          entry.narration || (entry.orderId ? `Order ${entry.orderId}` : "—")
                        )}
                      </td>
                      <td>
                        <Pill tone={entry.reason === "CASH_MATCH" ? "ok" : "bad"}>
                          {SUSPENSE_REASON_LABEL[entry.reason] || entry.reason}
                        </Pill>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {entry.reason === "CASH_MATCH" && entry.paymentId ? (
                            <>
                              <button
                                type="button"
                                className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-teal-600/40 text-teal-800 hover:bg-teal-500/10 disabled:opacity-50"
                                disabled={busyId === String(entry._id)}
                                onClick={() => onConfirmMatch(entry)}
                                title="This bank cash credit is this payment — mark it bank verified"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                                disabled={busyId === String(entry._id)}
                                onClick={() => onRejectMatch(entry)}
                                title="Not the same money — the pairing is not offered again"
                              >
                                Not this
                              </button>
                            </>
                          ) : entry.bankTransactionId ? (
                            <>
                              <button
                                type="button"
                                className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-teal-600/40 text-teal-800 hover:bg-teal-500/10 disabled:opacity-50"
                                disabled={busyId === String(entry._id)}
                                onClick={() => onOpenLink(entry)}
                              >
                                Link payment
                              </button>
                              <button
                                type="button"
                                className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                                disabled={busyId === String(entry._id)}
                                onClick={() => onWriteOff(entry)}
                              >
                                Write off
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                              disabled={busyId === String(entry._id)}
                              onClick={() => onReturnToPending(entry)}
                              title="Close this row and send the payment back to the Pending tab"
                            >
                              Return to pending
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  )
}

function LinkPaymentDrawer({ entry, candidates, busy, onClose, onLink }) {
  const sameAmount = useMemo(
    () =>
      (candidates || []).filter(
        (p) => Math.abs(Number(p.paidAmount) - Number(entry.amount)) < 0.02
      ),
    [candidates, entry.amount]
  )
  const others = useMemo(
    () =>
      (candidates || []).filter(
        (p) => Math.abs(Number(p.paidAmount) - Number(entry.amount)) >= 0.02
      ),
    [candidates, entry.amount]
  )
  const [showAll, setShowAll] = useState(false)
  const rows = showAll ? [...sameAmount, ...others] : sameAmount

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full overflow-y-auto bg-background border-l border-border p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Link bank credit to a payment</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmtDate(entry.txnDate)} · {fmtAmount(entry.amount)} · {entry.utr || "no UTR"}
            </p>
          </div>
          <button type="button" className="text-xs text-muted-foreground" onClick={onClose}>
            Close
          </button>
        </div>

        {sameAmount.length === 0 && !showAll && (
          <p className="text-xs text-muted-foreground mb-3">
            No pending payment of this amount.
          </p>
        )}
        <button
          type="button"
          className="text-[11px] font-semibold text-muted-foreground underline mb-3"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Show only matching amounts" : "Show all pending payments"}
        </button>

        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Party</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5}>No candidate payments</EmptyRow>
            ) : (
              rows.map((p) => (
                <tr key={String(p.paymentId)}>
                  <td>{p.orderId}</td>
                  <td>{fmtDate(p.paymentDate)}</td>
                  <td>{p.farmerName || p.customerName || "—"}</td>
                  <td className="tabular">{fmtAmount(p.paidAmount)}</td>
                  <td>
                    <button
                      type="button"
                      className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-teal-600/40 text-teal-800 hover:bg-teal-500/10 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => onLink(p)}
                    >
                      {busy ? "…" : "Link"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Load a statement the accountant downloaded from net banking.
 *
 * This is the way lines get in while the ICICI API is unavailable, so the rest
 * of the tab — matching, suspense, per-payment checks — works without the bank.
 */
function ImportStatementPanel({ accounts, defaultAccount, importing, summary, onImport }) {
  const [open, setOpen] = useState(false)
  const [csv, setCsv] = useState("")
  const [account, setAccount] = useState(defaultAccount || "")
  const [fileName, setFileName] = useState("")

  const readFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setFileName(file.name)
    setCsv(await file.text())
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs font-semibold px-2 py-1 rounded-sm border border-slate-400/60 text-slate-700 hover:bg-slate-500/10"
        onClick={() => setOpen(true)}
      >
        Import statement
      </button>
    )
  }

  return (
    <div className="w-full erp-card p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Import a statement</h4>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:underline"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground mb-2">
        Download the statement as CSV from net banking, then upload it or paste it below.
        Importing the same file twice is safe — lines already loaded are skipped.
      </p>

      <div className="flex flex-wrap items-end gap-2 mb-2">
        <label className="text-xs">
          <span className="block text-muted-foreground mb-0.5">Account</span>
          <input
            list="import-accounts"
            className="erp-input text-xs"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Account number"
          />
          <datalist id="import-accounts">
            {accounts.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </label>

        <label className="text-xs font-semibold px-2 py-1.5 rounded-sm border border-slate-400/60 text-slate-700 hover:bg-slate-500/10 cursor-pointer">
          {fileName || "Choose CSV file"}
          <input type="file" accept=".csv,.txt,text/csv" className="sr-only" onChange={readFile} />
        </label>
      </div>

      <textarea
        className="erp-input w-full text-[11px] font-mono"
        rows={6}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={"Txn Date,Description,Ref No./Cheque No.,Debit,Credit,Balance\n01/04/2026,UPI/CR/412345678901/RAHUL,412345678901,,1500.00,51500.00"}
      />

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={importing || !csv.trim() || !account.trim()}
          onClick={() => onImport({ csv, account: account.trim() })}
        >
          {importing ? "Importing…" : "Import"}
        </button>
        {csv.trim() && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => {
              setCsv("")
              setFileName("")
            }}
          >
            Clear
          </button>
        )}
      </div>

      {summary && (
        <div className="mt-2 text-[11px]">
          <p>
            Added {summary.inserted} of {summary.total} lines
            {summary.duplicates > 0 && ` · ${summary.duplicates} already loaded`}
            {summary.credits > 0 && ` · ${summary.credits} credits`}
          </p>
          {summary.unreadable?.length > 0 && (
            <p className="text-amber-700 mt-0.5">
              {summary.unreadable.length} line{summary.unreadable.length === 1 ? "" : "s"} could not
              be read (line {summary.unreadable.map((u) => u.line).join(", ")})
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ListScrollSentinel({
  hasMore,
  loadingMore,
  onLoadMore,
  rootRef,
  loadingLabel = "Loading more…",
  endLabel = "End of list",
}) {
  const sentinelRef = useRef(null)

  useEffect(() => {
    const target = sentinelRef.current
    const root = rootRef?.current || null
    if (!target || !hasMore || !onLoadMore) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore()
      },
      { root, rootMargin: "160px 0px", threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, rootRef])

  if (!hasMore && !loadingMore) {
    return <p className="py-3 text-center text-[11px] text-muted-foreground">{endLabel}</p>
  }

  return (
    <div ref={sentinelRef} className="flex justify-center py-3">
      {loadingMore ? (
        <span className="text-xs text-muted-foreground">{loadingLabel}</span>
      ) : (
        <button
          type="button"
          className="text-[11px] font-semibold text-muted-foreground underline"
          onClick={onLoadMore}
        >
          Load more
        </button>
      )}
    </div>
  )
}

const STATEMENT_FILTERS = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified by bank" },
  { key: "unverified", label: "Not verified" },
  { key: "matched", label: "Matched to payment" },
  { key: "suspense", label: "Suspense" },
]

function StatementStatusPill({ row }) {
  if (row.reconciliationStatus === "MATCHED") return <Pill tone="ok">✓ Verified · matched to payment</Pill>
  if (row.statementVerified) return <Pill tone="ok">✓ Verified</Pill>
  if (row.reconciliationStatus === "SUSPENSE") return <Pill tone="warn">Suspense</Pill>
  return <Pill tone="muted">{row.reconciliationStatus || "New"}</Pill>
}

function StatementTable({
  rows,
  total = 0,
  filter = "all",
  counts = null,
  onFilterChange = () => {},
  pageSize = STATEMENT_PAGE_SIZE,
  hasMore = false,
  loading,
  loadingMore = false,
  busyId,
  onVerify,
  onRefresh,
  onLoadMore,
  accounts = [],
  defaultAccount,
  importing,
  importSummary,
  onImport,
}) {
  const scrollRef = useRef(null)
  const shown = rows.length
  const totalLabel = Number(total).toLocaleString("en-IN")

  return (
    <>
      <p className="text-xs text-muted-foreground mb-2">
        Lines from the bank. Marking one verified retires it from matching.
      </p>
      <ImportStatementPanel
        accounts={accounts}
        defaultAccount={defaultAccount}
        importing={importing}
        summary={importSummary}
        onImport={onImport}
      />
      <div className="flex flex-wrap items-center gap-1.5 mb-2" role="tablist" aria-label="Statement filter">
        {STATEMENT_FILTERS.map((f) => {
          const active = filter === f.key
          const n = counts?.[f.key]
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilterChange(f.key)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                active
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-border text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {f.label}
              {n != null ? ` · ${Number(n).toLocaleString("en-IN")}` : ""}
            </button>
          )
        })}
      </div>
      <RefreshBar onRefresh={onRefresh} loading={loading}>
        {shown > 0 && (
          <span className="text-[11px] text-muted-foreground">
            Showing {shown.toLocaleString("en-IN")} of {totalLabel}
            {hasMore ? ` · ${pageSize} per page · scroll for more` : ""}
          </span>
        )}
      </RefreshBar>
      {loading && shown === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div ref={scrollRef} className="overflow-auto max-h-[min(68vh,720px)]">
          <table className="data-table">
            <thead className="sticky top-0 bg-background z-[1]">
              <tr>
                <th>Date</th>
                <th>Narration</th>
                <th>Reference / UTR</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={7}>
                  {filter === "all"
                    ? "No statement lines for this range — import a statement or sync from the bank"
                    : "No statement lines match this filter for the selected range"}
                </EmptyRow>
              ) : (
                rows.map((r) => {
                  const credit = Number(r.amount) > 0
                  return (
                    <tr
                      key={String(r._id)}
                      className={
                        r.statementVerified || r.reconciliationStatus === "MATCHED"
                          ? "text-muted-foreground"
                          : undefined
                      }
                    >
                      <td>{fmtDate(r.txnDate)}</td>
                      <td className="max-w-[24rem] truncate" title={r.narration}>
                        {r.narration || "—"}
                      </td>
                      <td>{r.referenceNumber || r.utr || "—"}</td>
                      <td className="tabular">{credit ? "—" : fmtAmount(Math.abs(r.amount))}</td>
                      <td className="tabular">{credit ? fmtAmount(r.amount) : "—"}</td>
                      <td>
                        <StatementStatusPill row={r} />
                      </td>
                      <td>
                        {r.statementVerified || r.reconciliationStatus === "MATCHED" ? (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        ) : (
                          <button
                            type="button"
                            className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-teal-600/40 text-teal-800 hover:bg-teal-500/10 disabled:opacity-50"
                            disabled={busyId === String(r._id)}
                            onClick={() => onVerify(r)}
                          >
                            {busyId === String(r._id) ? "…" : "Mark verified"}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          {shown > 0 && (
            <ListScrollSentinel
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={onLoadMore}
              rootRef={scrollRef}
              loadingLabel="Loading more lines…"
              endLabel="End of statement"
            />
          )}
        </div>
      )}
    </>
  )
}
