import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import moment from "moment"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { BankApprovalMenu } from "./BankApprovalMenu"
import { StatusBadge } from "./StatusBadge"
import { getStatementMatchPresentation } from "./bankMatchLabels"

const SUB_TABS = [
  { id: "pending", label: "Pending" },
  { id: "verified", label: "Verified" },
  { id: "suspense", label: "Suspense" },
  { id: "cash", label: "Cash deposit" },
  { id: "statement", label: "Statement" },
]

const SUSPENSE_REASON_LABEL = {
  NO_MATCH: "No match",
  MULTIPLE_MATCH: "Multiple match",
  AMOUNT_MISMATCH: "Amount mismatch",
  DATE_MISMATCH: "Date mismatch",
  ORPHAN_CREDIT: "Orphan credit",
  MANUAL_REVIEW: "Needs review",
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

  const [deposits, setDeposits] = useState([])
  const [loadingDeposits, setLoadingDeposits] = useState(false)
  const [depositForm, setDepositForm] = useState({
    entryDate: moment().format("YYYY-MM-DD"),
    amount: "",
    accountNumber: "",
    slipNumber: "",
    narration: "",
  })
  const [savingDeposit, setSavingDeposit] = useState(false)
  const [busyDepositId, setBusyDepositId] = useState(null)

  const [statementRows, setStatementRows] = useState([])
  const [statementTotal, setStatementTotal] = useState(0)
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

  const fetchDeposits = useCallback(async () => {
    setLoadingDeposits(true)
    try {
      const res = await NetworkManager(API.BANKING.GET_CASH_DEPOSITS).request(
        {},
        {
          dateFrom: reconcileDateFrom,
          dateTo: reconcileDateTo,
          ...(accountNumber ? { accountNumber } : {}),
        }
      )
      setDeposits(res?.data?.data ?? [])
    } catch (e) {
      Toast.error(apiError(e, "Failed to load cash deposits"))
      setDeposits([])
    } finally {
      setLoadingDeposits(false)
    }
  }, [reconcileDateFrom, reconcileDateTo, accountNumber])

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
            ...(accountNumber ? { accountNumber } : {}),
          }
        )
        if (reqId !== statementReqIdRef.current) return

        const body = res?.data ?? {}
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
    [reconcileDateFrom, reconcileDateTo, accountNumber]
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
            dateFrom: reconcileDateFrom,
            dateTo: reconcileDateTo,
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
    [reconcileDateFrom, reconcileDateTo]
  )

  const loadMorePending = useCallback(() => {
    void fetchPending({ append: true })
  }, [fetchPending])

  useEffect(() => {
    void fetchPending()
  }, [fetchPending])

  useEffect(() => {
    if (subTab === "suspense") fetchSuspense()
    if (subTab === "cash") fetchDeposits()
    if (subTab === "statement") void fetchStatement()
  }, [subTab, fetchSuspense, fetchDeposits, fetchStatement])

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
    } catch (e) {
      Toast.error(apiError(e, "Write-off failed"))
    } finally {
      setBusySuspenseId(null)
    }
  }

  const handleSaveDeposit = async (e) => {
    e.preventDefault()
    const account = depositForm.accountNumber || accountNumber
    if (!(Number(depositForm.amount) > 0)) {
      Toast.error("Enter a deposit amount")
      return
    }
    if (!account) {
      Toast.error("Select a bank account")
      return
    }
    setSavingDeposit(true)
    try {
      await NetworkManager(API.BANKING.POST_CASH_DEPOSIT).request({
        ...depositForm,
        accountNumber: account,
      })
      Toast.success("Cash deposit recorded")
      setDepositForm({
        entryDate: moment().format("YYYY-MM-DD"),
        amount: "",
        accountNumber: account,
        slipNumber: "",
        narration: "",
      })
      await fetchDeposits()
    } catch (err) {
      Toast.error(apiError(err, "Could not save deposit"))
    } finally {
      setSavingDeposit(false)
    }
  }

  const handleVerifyDeposit = async (deposit) => {
    setBusyDepositId(String(deposit._id))
    try {
      const res = await NetworkManager(API.BANKING.POST_VERIFY_CASH_DEPOSIT).request(
        {},
        { pathParams: [String(deposit._id)] }
      )
      const body = res?.data ?? {}
      if (body.matched === false) {
        Toast.error(body.message || "No matching bank credit yet")
      } else {
        Toast.success("Deposit matched to bank credit")
      }
      await fetchDeposits()
    } catch (e) {
      Toast.error(apiError(e, "Verification failed"))
    } finally {
      setBusyDepositId(null)
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
      cash: deposits.length,
      statement: statementTotal,
    }),
    [pendingTotal, forApprovalList, suspenseList, deposits, statementTotal]
  )

  const suspenseByAccount = useMemo(() => {
    const groups = new Map()
    for (const entry of suspenseList) {
      const key = entry.accountNumber || "Unknown account"
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
            {reconcileResult.updatedCount && reconcileResult.updatedCount > 0
              ? `${reconcileResult.updatedCount} payment(s) verified by bank.`
              : "No new matches."}
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
            onWriteOff={handleWriteOff}
          />
        )}

        {subTab === "cash" && (
          <CashDepositPanel
            form={depositForm}
            onFormChange={setDepositForm}
            accounts={accounts}
            defaultAccount={accountNumber}
            saving={savingDeposit}
            onSubmit={handleSaveDeposit}
            rows={deposits}
            loading={loadingDeposits}
            busyId={busyDepositId}
            onVerify={handleVerifyDeposit}
          />
        )}

        {subTab === "statement" && (
          <StatementTable
            rows={statementRows}
            total={statementTotal}
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
        ERP payments with a UTR or cheque that should match a statement credit.
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

function SuspenseTables({ groups, loading, busyId, onRefresh, onOpenLink, onWriteOff }) {
  return (
    <>
      <p className="text-xs text-muted-foreground mb-2">
        Bank credits with no order, a different amount, or more than one possible match.
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
                      <td className="max-w-[20rem] truncate" title={entry.narration}>
                        {entry.narration || "—"}
                      </td>
                      <td>
                        <Pill tone="bad">
                          {SUSPENSE_REASON_LABEL[entry.reason] || entry.reason}
                        </Pill>
                      </td>
                      <td>
                        <div className="flex gap-1">
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

function CashDepositPanel({
  form,
  onFormChange,
  accounts,
  defaultAccount,
  saving,
  onSubmit,
  rows,
  loading,
  busyId,
  onVerify,
}) {
  const set = (patch) => onFormChange({ ...form, ...patch })
  return (
    <>
      <p className="text-xs text-muted-foreground mb-2">
        Cash paid into the bank over the counter. Verify matches it to the credit the bank posts.
      </p>
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2 items-end mb-4">
        <label className="text-[11px] font-semibold text-muted-foreground">
          Date
          <input
            type="date"
            className="erp-input block mt-1 text-xs"
            value={form.entryDate}
            onChange={(e) => set({ entryDate: e.target.value })}
          />
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground">
          Amount
          <input
            type="number"
            min="0"
            step="0.01"
            className="erp-input block mt-1 text-xs"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
          />
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground">
          Bank account
          {accounts.length > 0 ? (
            <select
              className="erp-input block mt-1 text-xs"
              value={form.accountNumber || defaultAccount || ""}
              onChange={(e) => set({ accountNumber: e.target.value })}
            >
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="erp-input block mt-1 text-xs"
              value={form.accountNumber}
              onChange={(e) => set({ accountNumber: e.target.value })}
            />
          )}
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground">
          Slip no.
          <input
            type="text"
            className="erp-input block mt-1 text-xs"
            value={form.slipNumber}
            onChange={(e) => set({ slipNumber: e.target.value })}
          />
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground flex-1 min-w-[12rem]">
          Narration
          <input
            type="text"
            className="erp-input block mt-1 text-xs w-full"
            value={form.narration}
            onChange={(e) => set({ narration: e.target.value })}
          />
        </label>
        <button type="submit" className="btn-primary text-xs" disabled={saving}>
          {saving ? "…" : "Save deposit"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Slip no.</th>
                <th>Amount</th>
                <th>Bank</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={6}>No cash deposits in this range</EmptyRow>
              ) : (
                rows.map((d) => (
                  <tr key={String(d._id)}>
                    <td>{fmtDate(d.entryDate)}</td>
                    <td>{d.slipNumber || "—"}</td>
                    <td className="tabular">{fmtAmount(d.amount)}</td>
                    <td>{d.accountNumber || "—"}</td>
                    <td>
                      {d.depositVerified ? (
                        <Pill tone="ok">Verified</Pill>
                      ) : (
                        <Pill tone="warn">Unverified</Pill>
                      )}
                    </td>
                    <td>
                      {d.depositVerified ? (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      ) : (
                        <button
                          type="button"
                          className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-teal-600/40 text-teal-800 hover:bg-teal-500/10 disabled:opacity-50"
                          disabled={busyId === String(d._id)}
                          onClick={() => onVerify(d)}
                        >
                          {busyId === String(d._id) ? "…" : "Verify"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
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

function StatementTable({
  rows,
  total = 0,
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
                  No statement lines for this range — import a statement or sync from the bank
                </EmptyRow>
              ) : (
                rows.map((r) => {
                  const credit = Number(r.amount) > 0
                  return (
                    <tr
                      key={String(r._id)}
                      className={r.statementVerified ? "text-muted-foreground" : undefined}
                    >
                      <td>{fmtDate(r.txnDate)}</td>
                      <td className="max-w-[24rem] truncate" title={r.narration}>
                        {r.narration || "—"}
                      </td>
                      <td>{r.referenceNumber || r.utr || "—"}</td>
                      <td className="tabular">{credit ? "—" : fmtAmount(Math.abs(r.amount))}</td>
                      <td className="tabular">{credit ? fmtAmount(r.amount) : "—"}</td>
                      <td>
                        {r.statementVerified ? (
                          <Pill tone="ok">Verified</Pill>
                        ) : (
                          <Pill tone="muted">{r.reconciliationStatus || "New"}</Pill>
                        )}
                      </td>
                      <td>
                        {r.statementVerified ? (
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
