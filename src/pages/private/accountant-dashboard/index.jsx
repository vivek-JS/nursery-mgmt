import React, { useCallback, useEffect, useRef, useState } from "react"
import moment from "moment"
import { Box, Card, CardContent, Typography } from "@mui/material"
import { Shield } from "@mui/icons-material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { PageLoader } from "components"
import { useHasPaymentsAccess, useHasPaymentAccess, useUserData } from "utils/roleUtils"
import { DashboardHeader } from "features/accountant-dashboard/DashboardHeader"
import { KpiCards } from "features/accountant-dashboard/KpiCards"
import { UnifiedPaymentsTable } from "features/accountant-dashboard/UnifiedPaymentsTable"
import { BankReconciliationLive } from "features/accountant-dashboard/BankReconciliationLive"
import { LedgerPanel } from "features/accountant-dashboard/LedgerPanel"
import { mapRamAgriCustomerLedgerApiToFullPanel } from "features/accountant-dashboard/normalize"
import {
  fetchFarmerOrderPayments,
  fetchAgriOrderPayments,
  fetchBulkPaymentsList,
  fetchFarmerPlantLedger,
  normalizeFarmerIdForLedger,
  searchRamAgriCustomersForLedgerTransfer,
  transferRamAgriCustomerAdvance,
  createRamAgriLedgerManualEntry
} from "features/accountant-dashboard/paymentsApi"
import { LedgerPartiesTable } from "features/accountant-dashboard/LedgerPartiesTable"
import BulkPaymentEntryDialog from "components/Modals/BulkPaymentEntryDialog"
import DealerWalletCreditDialog from "components/Modals/DealerWalletCreditDialog"

const ROWS = 25
const BULK_STATUS_BY_UI_FILTER = {
  PENDING: "PENDING",
  COLLECTED: "ACCEPTED",
  REJECTED: "REJECTED"
}

function getTotalPagesFromPagination(pagination, fallbackPage) {
  if (!pagination) return fallbackPage
  const totalPages = Number(
    pagination.totalPages ??
      pagination.pages ??
      (pagination.total && pagination.limit ? Math.ceil(Number(pagination.total) / Math.max(1, Number(pagination.limit))) : 1)
  )
  return Math.max(1, Number.isFinite(totalPages) ? totalPages : fallbackPage)
}

const AccountantDashboard = () => {
  const hasPaymentsAccess = useHasPaymentsAccess()
  const hasPaymentAccess = useHasPaymentAccess()
  const userData = useUserData()

  const [selectedOrg, setSelectedOrg] = useState(/** @type {"ram-biotech"|"ram-agri"} */ ("ram-biotech"))
  const [activeTab, setActiveTab] = useState("payments")
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [selectedDateRange, setSelectedDateRange] = useState(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 15)
    return [startDate, endDate]
  })
  const [startDate, endDate] = selectedDateRange

  const [orderPayments, setOrderPayments] = useState([])
  const [bulkPayments, setBulkPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMorePayments, setLoadingMorePayments] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMorePayments, setHasMorePayments] = useState(false)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const loadMoreRef = useRef(null)
  const prevPaymentsFilterKeyRef = useRef("")

  const [unclearedList, setUnclearedList] = useState([])
  const [forApprovalList, setForApprovalList] = useState([])
  const [reconcileDateFrom, setReconcileDateFrom] = useState(moment().subtract(7, "days").format("YYYY-MM-DD"))
  const [reconcileDateTo, setReconcileDateTo] = useState(moment().format("YYYY-MM-DD"))
  const [loadingUncleared, setLoadingUncleared] = useState(false)
  const [loadingForApproval, setLoadingForApproval] = useState(false)
  const [reconcileLoading, setReconcileLoading] = useState(false)
  const [reconcileResult, setReconcileResult] = useState(null)
  const [bankStatementLoading, setBankStatementLoading] = useState(false)
  const [bankStatementMessage, setBankStatementMessage] = useState(null)
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null)

  const [ledgerData, setLedgerData] = useState(null)
  const [loadingLedger, setLoadingLedger] = useState(false)

  const [acceptingBulkId, setAcceptingBulkId] = useState(null)
  const [bulkPaymentEntryOpen, setBulkPaymentEntryOpen] = useState(false)
  const [dealerWalletCreditOpen, setDealerWalletCreditOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  const loadPaymentsPage = useCallback(async ({ targetPage, append }) => {
    const orderStatusFilter = statusFilter === "ALL" ? undefined : statusFilter
    const bulkStatusFilter = statusFilter === "ALL" ? "" : BULK_STATUS_BY_UI_FILTER[statusFilter] || ""

    try {
      let nextOrderRows = []
      let orderPagination = null
      if (selectedOrg === "ram-biotech") {
        const { rows, pagination } = await fetchFarmerOrderPayments({
          debouncedSearchTerm,
          page: targetPage,
          rowsPerPage: ROWS,
          startDate,
          endDate,
          allStatuses: statusFilter === "ALL",
          paymentStatus: orderStatusFilter
        })
        nextOrderRows = rows
        orderPagination = pagination
      } else {
        const { rows, pagination } = await fetchAgriOrderPayments({
          debouncedSearchTerm,
          page: targetPage,
          rowsPerPage: ROWS,
          startDate,
          endDate,
          paymentStatusFilter: orderStatusFilter || ""
        })
        nextOrderRows = rows
        orderPagination = pagination
      }

      const { rows: nextBulkRows, pagination: bulkPagination } = await fetchBulkPaymentsList({
        bulkPage: targetPage,
        rowsPerPage: ROWS,
        bulkStatusFilter,
        startDate,
        endDate,
        debouncedSearchTerm
      })

      setOrderPayments((prev) => (append ? [...prev, ...nextOrderRows] : nextOrderRows))
      setBulkPayments((prev) => (append ? [...prev, ...nextBulkRows] : nextBulkRows))

      const orderTotalPages = getTotalPagesFromPagination(orderPagination, targetPage)
      const bulkTotalPages = getTotalPagesFromPagination(bulkPagination, targetPage)
      setHasMorePayments(targetPage < Math.max(orderTotalPages, bulkTotalPages))
    } catch (e) {
      console.error(e)
      Toast.error("Failed to load payments")
      if (!append) {
        setOrderPayments([])
        setBulkPayments([])
      }
      setHasMorePayments(false)
    }
  }, [selectedOrg, debouncedSearchTerm, startDate, endDate, statusFilter])

  useEffect(() => {
    if (activeTab !== "payments") return
    let mounted = true
    const paymentsFilterKey = JSON.stringify({
      selectedOrg,
      debouncedSearchTerm,
      startDate: startDate ? moment(startDate).format("YYYY-MM-DD") : null,
      endDate: endDate ? moment(endDate).format("YYYY-MM-DD") : null,
      statusFilter
    })

    if (prevPaymentsFilterKeyRef.current !== paymentsFilterKey) {
      prevPaymentsFilterKeyRef.current = paymentsFilterKey
      setOrderPayments([])
      setBulkPayments([])
      setHasMorePayments(false)
      if (page !== 1) {
        setPage(1)
        return
      }
    }

    const load = async () => {
      if (page === 1) setLoading(true)
      else setLoadingMorePayments(true)
      await loadPaymentsPage({ targetPage: page, append: page > 1 })
      if (mounted) {
        setLoading(false)
        setLoadingMorePayments(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [activeTab, page, loadPaymentsPage, selectedOrg, debouncedSearchTerm, startDate, endDate, statusFilter])

  const refreshPayments = useCallback(async () => {
    if (activeTab !== "payments") return
    if (page !== 1) {
      setPage(1)
      return
    }
    setPage(1)
    setLoading(true)
    await loadPaymentsPage({ targetPage: 1, append: false })
    setLoading(false)
  }, [activeTab, loadPaymentsPage, page])

  useEffect(() => {
    if (activeTab !== "payments") return undefined
    const target = loadMoreRef.current
    if (!target) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry?.isIntersecting) return
        if (loading || loadingMorePayments || !hasMorePayments) return
        setPage((prev) => prev + 1)
      },
      { root: null, rootMargin: "220px 0px", threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [activeTab, loading, loadingMorePayments, hasMorePayments])

  const fetchUncleared = async () => {
    setLoadingUncleared(true)
    try {
      const instance = NetworkManager(API.PAYMENTS.GET_RECONCILIATION_UNVERIFIED)
      const res = await instance.request({}, { dateFrom: reconcileDateFrom, dateTo: reconcileDateTo })
      setUnclearedList(res?.data?.data ?? [])
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to load uncleared payments")
      setUnclearedList([])
    } finally {
      setLoadingUncleared(false)
    }
  }

  const fetchForApproval = async () => {
    setLoadingForApproval(true)
    try {
      const instance = NetworkManager(API.PAYMENTS.GET_RECONCILIATION_FOR_APPROVAL)
      const res = await instance.request({}, { dateFrom: reconcileDateFrom, dateTo: reconcileDateTo })
      setForApprovalList(res?.data?.data ?? [])
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to load payments for approval")
      setForApprovalList([])
    } finally {
      setLoadingForApproval(false)
    }
  }

  useEffect(() => {
    if (activeTab === "bank") {
      fetchUncleared()
      fetchForApproval()
    }
  }, [activeTab, reconcileDateFrom, reconcileDateTo])

  const handleFetchBankStatement = async () => {
    setBankStatementLoading(true)
    setBankStatementMessage(null)
    try {
      const instance = NetworkManager(API.PAYMENTS.POST_ICICI_BANK_STATEMENT)
      const res = await instance.request({
        fromDate: reconcileDateFrom,
        toDate: reconcileDateTo,
      })
      const body = res?.data ?? {}
      const inserted = body.inserted ?? 0
      const skipped = body.skipped ?? 0
      const msg = body.message || `Inserted ${inserted} new statement row(s), skipped ${skipped} duplicate(s).`
      setBankStatementMessage(msg)
      Toast.success(msg)
    } catch (e) {
      const errText = e?.message || e?.response?.data?.message || "Statement fetch failed"
      Toast.error(errText)
      setBankStatementMessage(errText)
    } finally {
      setBankStatementLoading(false)
    }
  }

  const handleReconcile = async () => {
    setReconcileLoading(true)
    setReconcileResult(null)
    try {
      const instance = NetworkManager(API.PAYMENTS.POST_RECONCILE)
      const res = await instance.request({ dateFrom: reconcileDateFrom, dateTo: reconcileDateTo })
      setReconcileResult(res?.data ?? {})
      Toast.success(res?.data?.updatedCount ? `${res.data.updatedCount} payment(s) verified by bank` : "Reconciliation complete")
      fetchUncleared()
      fetchForApproval()
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Reconciliation failed")
      setReconcileResult({ errors: [{ message: e?.response?.data?.message || "Reconciliation failed" }] })
    } finally {
      setReconcileLoading(false)
    }
  }

  const handleApproveOrReject = async (orderIdNum, paymentId, newStatus, source, orderMongoId, paymentIndex) => {
    setUpdatingPaymentId(paymentId)
    try {
      if (source === "agriSales") {
        const instance = NetworkManager(API.INVENTORY.UPDATE_AGRI_SALES_ORDER_PAYMENT_STATUS)
        await instance.request({ paymentStatus: newStatus }, [`${orderMongoId}/payment/${paymentIndex}/status`])
      } else {
        const instance = NetworkManager(API.ORDER.UPDATE_PAYMENT_STATUS)
        await instance.request({ orderId: orderIdNum, paymentId, paymentStatus: newStatus })
      }
      Toast.success(newStatus === "COLLECTED" ? "Payment approved" : "Payment rejected")
      fetchForApproval()
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Update failed")
    } finally {
      setUpdatingPaymentId(null)
    }
  }

  const runPaymentStatusUpdate = async (row, newStatus) => {
    try {
      if (selectedOrg === "ram-agri") {
        const paymentIndex = row.paymentIndex !== undefined ? row.paymentIndex : 0
        const instance = NetworkManager(API.INVENTORY.UPDATE_AGRI_SALES_ORDER_PAYMENT_STATUS)
        await instance.request({ paymentStatus: newStatus }, [`${row._id}/payment/${paymentIndex}/status`])
      } else {
        const instance = NetworkManager(API.ORDER.UPDATE_PAYMENT_STATUS)
        await instance.request({
          orderId: row.orderId,
          paymentId: row.payment?._id,
          paymentStatus: newStatus
        })
      }
      Toast.success("Payment status updated")
      refreshPayments()
      return true
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Update failed")
      return false
    }
  }

  const handleOrderStatusSave = async (displayRow, newStatus) => {
    const raw = displayRow.__raw
    if (!raw) return false
    if (!window.confirm(`Change payment status to ${newStatus}?`)) return false
    return runPaymentStatusUpdate(raw, newStatus)
  }

  const handleAcceptBulk = async (bulkId) => {
    setAcceptingBulkId(bulkId)
    try {
      const instance = NetworkManager(API.ORDER.ACCEPT_BULK_PAYMENT)
      await instance.request({}, { pathParams: [bulkId] })
      Toast.success("Bulk payment accepted.")
      refreshPayments()
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to accept bulk payment")
    } finally {
      setAcceptingBulkId(null)
    }
  }

  const fetchLedgerForCustomer = async (customerMobile, customerName, farmerId) => {
    setLoadingLedger(true)
    setLedgerData(null)
    try {
      if (selectedOrg === "ram-agri") {
        const params = {}
        if (customerMobile) params.customerMobile = customerMobile
        if (customerName) params.customerName = customerName
        if (startDate && endDate) {
          params.startDate = moment(startDate).format("YYYY-MM-DD")
          params.endDate = moment(endDate).format("YYYY-MM-DD")
        }
        const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_CUSTOMER_LEDGER)
        const response = await instance.request({}, params)
        const apiResponse = response?.data
        if (apiResponse?.status === "Success" || apiResponse?.success) {
          const mapped = mapRamAgriCustomerLedgerApiToFullPanel(apiResponse.data || {})
          if (mapped) {
            setLedgerData({
              ...mapped,
              meta: {
                ...(mapped.meta || {}),
                ledgerTitle: "Ram Agri customer ledger",
                partyWord: "customer",
                transferSearchLabel: "Search customer (name/mobile)",
                ledgerApis: {
                  searchTargets: searchRamAgriCustomersForLedgerTransfer,
                  transferAdvance: transferRamAgriCustomerAdvance,
                  createManualEntry: createRamAgriLedgerManualEntry
                },
                canTransferAdvance: hasPaymentAccess,
                onRefresh: async () => {
                  await fetchLedgerForCustomer(customerMobile, customerName, farmerId)
                }
              }
            })
          } else {
            Toast.error("No ledger data for this customer")
          }
        } else {
          Toast.error(apiResponse?.message || "Failed to load ledger")
        }
      } else {
        const mobile = (customerMobile && String(customerMobile).replace(/\D/g, "")) || ""
        const fid = normalizeFarmerIdForLedger(farmerId)
        if (!fid && mobile.length < 10) {
          Toast.error("Enter a valid 10-digit mobile or farmer ID to open the nursery ledger")
          setLoadingLedger(false)
          return
        }
        const mapped = await fetchFarmerPlantLedger({
          farmerId: fid,
          customerMobile: mobile.length >= 10 ? mobile.slice(-10) : mobile || undefined,
          startDate,
          endDate
        })
        if (mapped) {
          // Add transfer helpers for plant ledger UI (kept in meta to avoid changing the ledger shape).
          const withMeta = {
            ...mapped,
            meta: {
              ...(mapped.meta || {}),
              canTransferAdvance: hasPaymentAccess,
              onRefresh: async () => {
                const m = (customerMobile && String(customerMobile).replace(/\D/g, "")) || ""
                await fetchLedgerForCustomer(m, customerName, farmerId)
              }
            }
          }
          setLedgerData(withMeta)
        }
        else Toast.error("No ledger data for this farmer (check mobile / ID and date range)")
      }
    } catch (e) {
      console.error(e)
      Toast.error(selectedOrg === "ram-agri" ? "Failed to fetch customer ledger" : "Failed to fetch farmer plant ledger")
    } finally {
      setLoadingLedger(false)
    }
  }

  const pendingCount =
    orderPayments.filter((p) => p.orderPaymentStatus === "PENDING").length +
    bulkPayments.filter((b) => b.paymentStatus === "PENDING").length

  const initials =
    (userData?.name || userData?.firstName || "AC")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AC"

  if (!hasPaymentsAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Shield sx={{ fontSize: 64, color: "#f44336", mb: 2 }} />
            <Typography variant="h5" gutterBottom color="error">
              Access Denied
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This feature is only available to Accountant and Super Admin users.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  if (loading && activeTab === "payments" && orderPayments.length === 0 && bulkPayments.length === 0) {
    return <PageLoader />
  }

  return (
    <div className="agri-ledger-dashboard min-h-screen bg-background">
      <DashboardHeader
        selectedOrg={selectedOrg}
        onOrgChange={(id) => {
          setSelectedOrg(id)
          setPage(1)
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={pendingCount}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        userInitials={initials}
      />

      <main className="px-5 py-4 space-y-4 max-w-[1600px] mx-auto">
        {activeTab === "payments" && (
          <>
            <div className="flex flex-wrap gap-3 items-end mb-2">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Start
                <input
                  type="date"
                  className="erp-input block mt-1 text-xs"
                  value={startDate ? moment(startDate).format("YYYY-MM-DD") : ""}
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value) : null
                    if (d) setSelectedDateRange([d, endDate])
                  }}
                />
              </label>
              <label className="text-[11px] font-semibold text-muted-foreground">
                End
                <input
                  type="date"
                  className="erp-input block mt-1 text-xs"
                  value={endDate ? moment(endDate).format("YYYY-MM-DD") : ""}
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value) : null
                    if (d) setSelectedDateRange([startDate, d])
                  }}
                />
              </label>
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={() => {
                  refreshPayments()
                }}
              >
                Refresh
              </button>
              {hasPaymentAccess && (
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-violet-600 text-violet-800 bg-white hover:bg-violet-50"
                  onClick={() => setBulkPaymentEntryOpen(true)}
                >
                  New bulk payment
                </button>
              )}
              {hasPaymentAccess && selectedOrg === "ram-biotech" && (
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-700 text-emerald-900 bg-white hover:bg-emerald-50"
                  onClick={() => setDealerWalletCreditOpen(true)}
                >
                  Credit dealer wallet
                </button>
              )}
            </div>

            <KpiCards orderPayments={orderPayments} bulkPayments={bulkPayments} />

            <UnifiedPaymentsTable
              orderPayments={orderPayments}
              bulkPayments={bulkPayments}
              onOrderStatusSave={handleOrderStatusSave}
              onBulkAccept={handleAcceptBulk}
              onViewLedger={(mobile, name, farmerId) => fetchLedgerForCustomer(mobile, name, farmerId)}
              acceptingBulkId={acceptingBulkId}
              canEditStatus={hasPaymentAccess}
              statusFilter={statusFilter}
              onStatusFilterChange={(next) => {
                setStatusFilter(next)
                setPage(1)
              }}
            />

            <div className="flex justify-center py-2 text-xs text-muted-foreground">
              {loadingMorePayments
                ? "Loading more payments..."
                : hasMorePayments
                  ? "Scroll down to load more"
                  : "All matching payments loaded"}
            </div>
            <div ref={loadMoreRef} className="h-1 w-full" />

            <p className="text-[11px] text-muted-foreground text-center">Latest entries stay on top. Scrolling loads older pages automatically.</p>
          </>
        )}

        {activeTab === "ledger-parties" && (
          <LedgerPartiesTable
            selectedOrg={selectedOrg}
            onOpenLedger={(mobile, name, farmerId) => fetchLedgerForCustomer(mobile, name, farmerId)}
            dateRangeLabel={
              startDate && endDate
                ? `${moment(startDate).format("DD MMM YYYY")} – ${moment(endDate).format("DD MMM YYYY")}`
                : ""
            }
          />
        )}

        {activeTab === "bank" && (
          <BankReconciliationLive
            reconcileDateFrom={reconcileDateFrom}
            reconcileDateTo={reconcileDateTo}
            onDateFromChange={setReconcileDateFrom}
            onDateToChange={setReconcileDateTo}
            unclearedList={unclearedList}
            forApprovalList={forApprovalList}
            loadingUncleared={loadingUncleared}
            loadingForApproval={loadingForApproval}
            reconcileLoading={reconcileLoading}
            reconcileResult={reconcileResult}
            bankStatementLoading={bankStatementLoading}
            bankStatementMessage={bankStatementMessage}
            onFetchBankStatement={handleFetchBankStatement}
            updatingPaymentId={updatingPaymentId}
            onRefreshUncleared={fetchUncleared}
            onRefreshForApproval={fetchForApproval}
            onReconcile={handleReconcile}
            onApproveOrReject={handleApproveOrReject}
          />
        )}
      </main>

      <BulkPaymentEntryDialog
        open={bulkPaymentEntryOpen}
        onClose={() => setBulkPaymentEntryOpen(false)}
        mode={selectedOrg === "ram-agri" ? "agri" : "plant"}
        onSuccess={() => {
          refreshPayments()
        }}
      />

      <DealerWalletCreditDialog
        open={dealerWalletCreditOpen}
        onClose={() => setDealerWalletCreditOpen(false)}
      />

      <LedgerPanel ledger={ledgerData} onClose={() => setLedgerData(null)} />
      {loadingLedger && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-foreground/10 text-sm text-foreground">
          Loading ledger…
        </div>
      )}
    </div>
  )
}

export default AccountantDashboard
