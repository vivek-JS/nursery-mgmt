import React, { useState, useEffect, useRef, useCallback } from "react"
import { CheckIcon } from "lucide-react"
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  LinearProgress
} from "@mui/material"
import moment from "moment"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import {
  extractUpiFromReceiptImageUrl,
  mergeUpiOcrIntoPaymentState,
  buildRemarkWithReceiptPayee
} from "utils/upiReceiptOcr"
import AttachmentViewerModal, { resolvePaymentMediaUrl } from "components/Modals/AttachmentViewerModal"

const initialBulkPaymentMain = () => ({
  totalAmount: "",
  paymentDate: moment().format("YYYY-MM-DD"),
  modeOfPayment: "",
  bankName: "",
  remark: "",
  transactionId: "",
  chequeNumber: "",
  receiptPhoto: [],
  receiptPayeeName: ""
})

/**
 * Create a pending bulk payment (POST). Parent refreshes via onSuccess.
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {"plant"|"agri"} props.mode — plant = farmer orders; agri = Ram Agri sales orders
 * @param {() => void} [props.onSuccess]
 */
export default function BulkPaymentEntryDialog({ open, onClose, mode, onSuccess }) {
  const showAgriSalesOrders = mode === "agri"

  const [bulkPaymentMain, setBulkPaymentMain] = useState(initialBulkPaymentMain)
  const [upiOcrLoading, setUpiOcrLoading] = useState(false)
  const [bulkPaymentReceiptBusy, setBulkPaymentReceiptBusy] = useState(false)
  const [bulkAllocations, setBulkAllocations] = useState([])
  const [bulkPaymentSubmitting, setBulkPaymentSubmitting] = useState(false)
  const [pendingBulkAmounts, setPendingBulkAmounts] = useState({})
  const [bulkOrderSearch, setBulkOrderSearch] = useState("")
  const [bulkOrderSearchResults, setBulkOrderSearchResults] = useState([])
  const [bulkOrderSearchLoading, setBulkOrderSearchLoading] = useState(false)
  const bulkOrderSearchTimerRef = useRef(null)
  /** Same attachment lightbox as accountant payments table */
  const [receiptViewer, setReceiptViewer] = useState(null)

  useEffect(() => {
    if (!open) return
    setReceiptViewer(null)
    setBulkPaymentMain(initialBulkPaymentMain())
    setBulkAllocations([])
    setPendingBulkAmounts({})
    setBulkOrderSearch("")
    setBulkOrderSearchResults([])
    setBulkPaymentSubmitting(false)
    setUpiOcrLoading(false)
    setBulkPaymentReceiptBusy(false)
  }, [open])

  const handleClose = () => {
    setPendingBulkAmounts({})
    setBulkOrderSearch("")
    setBulkOrderSearchResults([])
    onClose()
  }

  const searchBulkOrders = useCallback(
    async (q) => {
      const query = (q || "").trim()
      if (query.length < 2) {
        setBulkOrderSearchResults([])
        return
      }
      setBulkOrderSearchLoading(true)
      try {
        if (showAgriSalesOrders) {
          const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS)
          const res = await instance.request({}, { search: query, limit: 30, page: 1 })
          const raw = res?.data?.data?.data ?? res?.data?.data ?? []
          const list = Array.isArray(raw) ? raw : []
          const normalized = list.map((o) => ({
            _id: o._id,
            order: o.orderNumber ?? o._id,
            farmerName: o.customerName,
            details: {
              orderid: o._id,
              orderNumber: o.orderNumber,
              customerName: o.customerName,
              customerVillage: o.customerVillage,
              customerTaluka: o.customerTaluka,
              customerDistrict: o.customerDistrict,
            },
            outstanding: o.balanceAmount ?? (Number(o.totalAmount || 0) - Number(o.totalPaidAmount || 0)),
            createdByName: o.createdBy?.name || "",
            assignedToName: o.assignedTo?.name || o.assignedToName || "",
          }))
          setBulkOrderSearchResults(normalized)
        } else {
          const instance = NetworkManager(API.ORDER.GET_ORDERS)
          const res = await instance.request({}, { search: query, limit: 30, page: 1 })
          const raw = res?.data?.data?.data ?? res?.data?.data ?? []
          const list = Array.isArray(raw) ? raw : []
          const normalized = list.map((o) => {
            const id = o.id ?? o._id
            const farmer = o.farmer && (Array.isArray(o.farmer) ? o.farmer[0] : o.farmer)
            const salesPerson = o.salesPerson && (Array.isArray(o.salesPerson) ? o.salesPerson[0] : o.salesPerson)
            const total = Number((o.rate || 0) * (o.totalPlants || o.numberOfPlants || 0))
            const paid = Array.isArray(o.payment)
              ? o.payment.filter((p) => p?.paymentStatus === "COLLECTED").reduce((s, p) => s + Number(p?.paidAmount || 0), 0)
              : 0
            const outstanding = total - paid
            return {
              _id: id,
              id,
              order: o.orderId,
              farmerName: farmer?.name,
              details: {
                orderid: id,
                farmer: farmer ? { name: farmer.name, village: farmer.village, taluka: farmer.taluka, district: farmer.district } : {},
                salesPerson: salesPerson ? { name: salesPerson.name, jobTitle: salesPerson.jobTitle } : null,
                dealerOrder: o.dealerOrder,
              },
              salesPersonName: salesPerson?.name || "",
              salesPersonJobTitle: salesPerson?.jobTitle || "",
              outstanding: outstanding > 0 ? outstanding : 0,
            }
          })
          setBulkOrderSearchResults(normalized)
        }
      } catch (err) {
        console.error("Bulk order search error:", err)
        Toast.error("Search failed")
        setBulkOrderSearchResults([])
      } finally {
        setBulkOrderSearchLoading(false)
      }
    },
    [showAgriSalesOrders]
  )

  useEffect(() => {
    if (!open) return
    const q = (bulkOrderSearch || "").trim()
    if (q.length < 2) {
      setBulkOrderSearchResults([])
      return
    }
    if (bulkOrderSearchTimerRef.current) clearTimeout(bulkOrderSearchTimerRef.current)
    bulkOrderSearchTimerRef.current = setTimeout(() => searchBulkOrders(bulkOrderSearch), 350)
    return () => {
      if (bulkOrderSearchTimerRef.current) clearTimeout(bulkOrderSearchTimerRef.current)
    }
  }, [open, bulkOrderSearch, searchBulkOrders])

  const addOrderToBulkAllocation = (order, amount) => {
    const orderId = order.details?.orderid ?? order._id ?? order.id
    if (!orderId) return
    const amt = Number(amount)
    if (!amt || amt <= 0) return
    const orderType = showAgriSalesOrders ? "AgriSalesOrder" : "ORDER"
    const label = showAgriSalesOrders
      ? (order.details?.customerName || order.farmerName || `Order #${order.details?.orderNumber ?? order.order ?? orderId}`)
      : (order.details?.farmer?.name || order.farmerName || `Order #${order.order ?? orderId}`)
    setBulkAllocations((prev) => {
      const exists = prev.find((a) => String(a.orderId) === String(orderId))
      if (exists) return prev.map((a) => (String(a.orderId) === String(orderId) ? { ...a, amount: amt, orderType } : a))
      return [...prev, { orderId, orderLabel: label, amount: amt, orderType }]
    })
    setPendingBulkAmounts((p) => ({ ...p, [String(orderId)]: "" }))
  }

  const removeBulkAllocation = (orderId) => {
    setBulkAllocations((prev) => prev.filter((a) => String(a.orderId) !== String(orderId)))
  }

  const handleBulkPaymentSubmit = async () => {
    const total = Number(bulkPaymentMain.totalAmount)
    if (!total || total <= 0) {
      Toast.error("Please fill in payment amount")
      return
    }
    const payMode = bulkPaymentMain.modeOfPayment
    if (!payMode) {
      Toast.error("Please select payment mode")
      return
    }
    if (payMode !== "Cash" && payMode !== "NEFT/RTGS") {
      if (!bulkPaymentMain.receiptPhoto || bulkPaymentMain.receiptPhoto.length === 0) {
        Toast.error(`Payment image is mandatory for ${payMode} payments`)
        return
      }
    }
    const sum = bulkAllocations.reduce((s, a) => s + (Number(a.amount) || 0), 0)
    if (Math.abs(sum - total) > 0.01) {
      Toast.error(`Sum of allocations (₹${sum}) must equal total amount (₹${total})`)
      return
    }
    if (bulkAllocations.length === 0) {
      Toast.error("Add at least one order with amount")
      return
    }
    const txnOrCheque = payMode === "Cheque" ? (bulkPaymentMain.chequeNumber || bulkPaymentMain.transactionId) : bulkPaymentMain.transactionId
    setBulkPaymentSubmitting(true)
    try {
      const instance = NetworkManager(API.ORDER.POST_BULK_PAYMENT)
      const payload = {
        totalAmount: total,
        paymentDate: bulkPaymentMain.paymentDate,
        modeOfPayment: payMode,
        bankName: bulkPaymentMain.bankName || undefined,
        remark: buildRemarkWithReceiptPayee(bulkPaymentMain.remark, bulkPaymentMain.receiptPayeeName) || undefined,
        transactionId: txnOrCheque || undefined,
        receiptPhoto: Array.isArray(bulkPaymentMain.receiptPhoto) ? bulkPaymentMain.receiptPhoto : [],
        allocations: bulkAllocations.map((a) => ({
          orderId: a.orderId,
          amount: Number(a.amount),
          orderType: a.orderType === "AgriSalesOrder" ? "AgriSalesOrder" : "ORDER"
        })),
        source: bulkAllocations.every((a) => a.orderType === "AgriSalesOrder")
          ? "AGRI"
          : bulkAllocations.every((a) => a.orderType !== "AgriSalesOrder")
            ? "PLANT"
            : "MIXED"
      }
      await instance.request(payload)
      Toast.success("Bulk payment saved as Pending. Go to Payments page to Accept.")
      onSuccess?.()
      handleClose()
    } catch (err) {
      console.error("Bulk payment error:", err)
      Toast.error(err?.response?.data?.message || "Failed to create bulk payment")
    } finally {
      setBulkPaymentSubmitting(false)
    }
  }

  return (
    <>
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle>Bulk payment (parent entry)</DialogTitle>
      <DialogContent>
        <div className="relative overflow-hidden rounded-lg">
          {(bulkPaymentReceiptBusy || upiOcrLoading) && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white/85 p-4 text-center backdrop-blur-sm"
              aria-busy="true"
            >
              <CircularProgress size={36} />
              <Typography variant="body2" fontWeight={700}>
                {upiOcrLoading ? "Reading receipt…" : "Uploading receipt…"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Form locked until upload and scan finish
              </Typography>
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h4 className="font-medium text-gray-900 mb-3 text-sm">
              Add New Payment
            </h4>

            <div className="mb-4 pb-4 border-b border-gray-200">
              <label className="text-sm text-gray-700 font-semibold">
                Payment Receipt Photo
              </label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                {bulkPaymentMain.modeOfPayment &&
                bulkPaymentMain.modeOfPayment !== "Cash" &&
                bulkPaymentMain.modeOfPayment !== "NEFT/RTGS"
                  ? `Required for ${bulkPaymentMain.modeOfPayment}. `
                  : "Optional for Cash & NEFT/RTGS. "}
                Upload first — we scan the receipt to fill payee, amount, date, and UTR when possible.
              </p>
              {(bulkPaymentReceiptBusy || upiOcrLoading) && (
                <LinearProgress sx={{ maxWidth: 280, width: "100%", height: 3, borderRadius: 1, mb: 1 }} />
              )}
              <div className="mt-2 inline-block max-w-xs w-full">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={bulkPaymentReceiptBusy || upiOcrLoading}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files)
                    if (files.length === 0) return
                    try {
                      setBulkPaymentReceiptBusy(true)
                      const uploadedUrls = (
                        await Promise.all(
                          files.map(async (file) => {
                            const formData = new FormData()
                            formData.append("media_key", file)
                            formData.append("media_type", "IMAGE")
                            formData.append("content_type", "multipart/form-data")
                            const instance = NetworkManager(API.MEDIA.UPLOAD)
                            const response = await instance.request(formData)
                            return (
                              response?.data?.data?.media_url ||
                              response?.data?.media_url
                            )
                          })
                        )
                      ).filter(Boolean)
                      setBulkPaymentMain((prev) => ({
                        ...prev,
                        receiptPhoto: [...(prev.receiptPhoto || []), ...uploadedUrls],
                      }))
                      Toast.success("Images uploaded successfully")
                      const first = uploadedUrls[0]
                      if (first && /^https?:\/\//i.test(String(first))) {
                        setUpiOcrLoading(true)
                        try {
                          const ocr = await extractUpiFromReceiptImageUrl(first)
                          if (ocr?.success && ocr?.data) {
                            const d = ocr.data
                            setBulkPaymentMain((prev) => mergeUpiOcrIntoPaymentState(prev, d))
                            Toast.success(
                              d.needs_review
                                ? "Receipt scanned — verify payee, amount, UTR"
                                : "Receipt details filled from screenshot"
                            )
                          }
                        } catch (err) {
                          console.warn("UPI OCR:", err)
                          Toast.error(err?.message || "Could not read receipt")
                        } finally {
                          setUpiOcrLoading(false)
                        }
                      }
                    } catch (error) {
                      console.error("Error uploading images:", error)
                      Toast.error("Failed to upload images")
                    } finally {
                      setBulkPaymentReceiptBusy(false)
                      e.target.value = ""
                    }
                  }}
                  className="w-full max-w-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                />
                {bulkPaymentMain.modeOfPayment && bulkPaymentMain.modeOfPayment !== "Cash" && bulkPaymentMain.modeOfPayment !== "NEFT/RTGS" && (
                  <p className="text-xs text-red-600 mt-1">
                    Payment image is mandatory for {bulkPaymentMain.modeOfPayment} payments
                  </p>
                )}
                {bulkPaymentMain.receiptPhoto && bulkPaymentMain.receiptPhoto.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {bulkPaymentMain.receiptPhoto.map((photo, index) => (
                      <div key={index} className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setReceiptViewer({
                              title: "Payment receipt(s)",
                              urls: bulkPaymentMain.receiptPhoto || [],
                            })
                          }
                          className="block rounded border border-gray-200 overflow-hidden hover:ring-2 hover:ring-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          title="View attachments"
                        >
                          <img
                            src={resolvePaymentMediaUrl(photo)}
                            alt={`Receipt ${index + 1}`}
                            className="w-16 h-16 object-cover"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setBulkPaymentMain((p) => ({ ...p, receiptPhoto: (p.receiptPhoto || []).filter((_, i) => i !== index) }))
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs z-10"
                          aria-label="Remove receipt"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3 w-full max-w-full">
              <label className="text-sm text-gray-500 font-medium">
                Payee name (from receipt)
              </label>
              <input
                type="text"
                value={bulkPaymentMain.receiptPayeeName || ""}
                onChange={(e) =>
                  setBulkPaymentMain((p) => ({ ...p, receiptPayeeName: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                placeholder="Filled when you upload a UPI receipt"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-sm text-gray-500 font-medium">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={bulkPaymentMain.totalAmount}
                  onChange={(e) => setBulkPaymentMain((p) => ({ ...p, totalAmount: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 font-medium">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={bulkPaymentMain.paymentDate}
                  onChange={(e) => setBulkPaymentMain((p) => ({ ...p, paymentDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 font-medium">
                  Payment Mode
                </label>
                <select
                  value={bulkPaymentMain.modeOfPayment}
                  onChange={(e) => setBulkPaymentMain((p) => ({ ...p, modeOfPayment: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1">
                  <option value="">Select Mode</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="NEFT/RTGS">NEFT/RTGS</option>
                  <option value="1341">1341</option>
                  <option value="434">434</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 font-medium">
                  Payment Status
                </label>
                <div className="w-full px-3 py-2 border rounded-lg mt-1 text-sm bg-gray-100 text-gray-700 border-gray-200">
                  PENDING (Accept on Payments page)
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 font-medium">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bulkPaymentMain.bankName}
                  onChange={(e) => setBulkPaymentMain((p) => ({ ...p, bankName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                  placeholder={
                    bulkPaymentMain.modeOfPayment === "Cheque" || bulkPaymentMain.modeOfPayment === "NEFT/RTGS"
                      ? "Enter bank name"
                      : "N/A"
                  }
                  disabled={
                    bulkPaymentMain.modeOfPayment !== "Cheque" && bulkPaymentMain.modeOfPayment !== "NEFT/RTGS"
                  }
                />
              </div>
            </div>

            <div className="mt-4 w-full max-w-full">
              <label className="text-sm text-gray-500 font-medium">
                Transaction / UTR (optional)
              </label>
              <input
                type="text"
                value={bulkPaymentMain.transactionId || ""}
                onChange={(e) => setBulkPaymentMain((p) => ({ ...p, transactionId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                placeholder="UPI ref / bank txn id (optional)"
              />
            </div>
            <div className="mt-4">
              <label className="text-sm text-gray-500 font-medium">Remark</label>
              <input
                type="text"
                value={bulkPaymentMain.remark}
                onChange={(e) => setBulkPaymentMain((p) => ({ ...p, remark: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                placeholder="Optional remark"
              />
            </div>
          </div>
        </div>

        {bulkAllocations.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Added · {bulkAllocations.length} order{bulkAllocations.length !== 1 ? "s" : ""} · ₹{bulkAllocations.reduce((s, a) => s + (Number(a.amount) || 0), 0).toLocaleString()} total
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {bulkAllocations.map((a) => (
                <Box
                  key={String(a.orderId)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.25,
                    py: 0.75,
                    borderRadius: 2,
                    bgcolor: "#dcfce7",
                    color: "#166534",
                    border: "1px solid #22c55e",
                  }}
                >
                  <Typography variant="caption" fontWeight={600} noWrap sx={{ maxWidth: 140 }}>{a.orderLabel}</Typography>
                  <Typography variant="caption" fontWeight={700}>₹{Number(a.amount).toLocaleString()}</Typography>
                  <button type="button" onClick={() => removeBulkAllocation(a.orderId)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "inherit", opacity: 0.9, fontSize: "0.85rem" }} title="Remove">×</button>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Add orders</Typography>
        <TextField size="small" fullWidth placeholder={showAgriSalesOrders ? "Search by order number, name, ID…" : "Search by order number, farmer name, ID…"} value={bulkOrderSearch} onChange={(e) => setBulkOrderSearch(e.target.value)} sx={{ mb: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
        <Box sx={{ maxHeight: 240, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1, bgcolor: "grey.50" }}>
          {bulkOrderSearchLoading ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>Searching…</Typography>
          ) : bulkOrderSearch.trim().length < 2 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1.5, px: 0.5 }}>
              Type 2+ characters to search. Results show outstanding, salesman/dealer & user.
            </Typography>
          ) : bulkOrderSearchResults.length > 0 ? (
            bulkOrderSearchResults.map((order) => {
              const orderId = order.details?.orderid ?? order._id ?? order.id
              const idStr = String(orderId)
              const orderNum = showAgriSalesOrders ? (order.details?.orderNumber ?? order.order ?? idStr) : (order.order != null ? order.order : idStr)
              const name = showAgriSalesOrders ? (order.details?.customerName || order.farmerName || "—") : (order.details?.farmer?.name || order.farmerName || "—")
              const village = showAgriSalesOrders ? (order.details?.customerVillage || "") : (order.details?.farmer?.village || "")
              const taluka = showAgriSalesOrders ? (order.details?.customerTaluka || "") : (order.details?.farmer?.taluka || "")
              const district = showAgriSalesOrders ? (order.details?.customerDistrict || "") : (order.details?.farmer?.district || "")
              const location = [village, taluka, district].filter(Boolean).join(" · ") || "—"
              const outstanding = order.outstanding != null ? Number(order.outstanding) : 0
              const salesLabel = showAgriSalesOrders
                ? [order.createdByName, order.assignedToName].filter(Boolean).join(" · ") || ""
                : (order.salesPersonJobTitle === "DEALER" ? `Dealer: ${order.salesPersonName || ""}` : order.salesPersonName ? `Sales: ${order.salesPersonName}` : "")
              const pendingVal = pendingBulkAmounts[idStr] ?? ""
              return (
                <Box
                  key={idStr}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                    p: 1,
                    borderRadius: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    "&:last-child": { borderBottom: 0 },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>#{orderNum} {name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{location}</Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                      {outstanding > 0 && (
                        <Typography component="span" variant="caption" sx={{ color: "warning.dark", fontWeight: 600 }}>Outstanding ₹{outstanding.toLocaleString()}</Typography>
                      )}
                      {salesLabel && (
                        <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>{outstanding > 0 ? " · " : ""}{salesLabel}</Typography>
                      )}
                    </Box>
                  </Box>
                  <TextField type="number" size="small" placeholder="₹" value={pendingVal} onChange={(e) => setPendingBulkAmounts((p) => ({ ...p, [idStr]: e.target.value }))} sx={{ width: 72 }} inputProps={{ min: 0, step: 0.01 }} />
                  <Button size="small" variant="outlined" onClick={() => { const amt = Number(pendingVal); if (amt > 0) addOrderToBulkAllocation(order, amt); else Toast.error("Enter amount first") }}>Add</Button>
                </Box>
              )
            })
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>No orders found. Try another search.</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, flexDirection: "column", gap: 1, alignItems: "stretch" }}>
        <Button fullWidth variant="contained" onClick={handleBulkPaymentSubmit} disabled={bulkPaymentSubmitting || bulkPaymentReceiptBusy || upiOcrLoading} startIcon={bulkPaymentSubmitting ? null : <CheckIcon size={18} />} sx={{ height: 40, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #5B5FC7 0%, #8B5CF6 100%)" }}>
          {bulkPaymentSubmitting ? "Saving…" : "Submit Payment"}
        </Button>
        <Button fullWidth variant="outlined" onClick={handleClose} sx={{ textTransform: "none", borderRadius: 2, height: 38, borderColor: "#7c3aed", color: "#7c3aed" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>

    <AttachmentViewerModal
      open={Boolean(receiptViewer)}
      onClose={() => setReceiptViewer(null)}
      title={receiptViewer?.title}
      urls={receiptViewer?.urls || []}
    />
    </>
  )
}
