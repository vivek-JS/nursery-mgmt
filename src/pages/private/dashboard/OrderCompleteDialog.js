import React, { useState, useEffect, useRef, useCallback } from "react"
import { ChevronDown, ChevronRight, Plus, Check, ImageIcon, X, Loader2, Trash2 } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { useHasPaymentAccess } from "utils/roleUtils"
import PaymentTransferDialog from "components/Modals/PaymentTransferDialog"
import { transferableFarmerPlantPayments } from "features/accountant-dashboard/farmerPlantPaymentTransfer.utils"
import ReplaceOrderDialog from "./ReplaceOrderDialog"
import {
  extractUpiFromReceiptImageUrl,
  mergeUpiOcrIntoPaymentState,
  buildRemarkWithReceiptPayee
} from "utils/upiReceiptOcr"

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100

/** Human-readable order # from list row, API doc, or short id fallback. */
const displayOrderNumber = (order) => {
  const n =
    order?.order ??
    order?.details?.orderid ??
    order?.details?.orderId ??
    order?.orderId
  if (n != null && String(n).trim() !== "") return String(n).trim().replace(/^#/, "")
  if (order?._id) return String(order._id).slice(-8)
  return "—"
}

const displayFarmerName = (order) =>
  order?.farmerName ||
  order?.details?.farmer?.name ||
  order?.farmer?.name ||
  "—"

const displayPlantLabel = (order) => {
  if (order?.plantDetails?.name) return String(order.plantDetails.name)
  const pt = order?.plantType?.name
  const st = order?.plantSubtype?.name
  if (pt && st) return `${pt} · ${st}`
  if (pt) return String(pt)
  if (order?.details?.plant?.name) return String(order.details.plant.name)
  return "—"
}

const displayContact = (order) =>
  order?.contact ||
  order?.details?.farmer?.mobileNumber ||
  order?.farmer?.mobileNumber ||
  ""

const displayVillage = (order) =>
  order?.details?.farmer?.village || order?.farmer?.village || ""

const rowKey = (order) => String(order._id ?? order.id ?? order.details?.orderid ?? "")

const apiOrderId = (order) => order._id ?? order.id

const isPlantFarmerOrderForPaymentTransfer = (order) =>
  order &&
  !(order.details?.dealerOrder || order.dealerOrder) &&
  !order.isAgriSalesOrder &&
  !order.details?.isRamAgriProduct

const getExistingReturnedPlants = (order) =>
  Math.max(
    0,
    Number(order.details?.returnedPlants ?? order.returnedPlants ?? 0) || 0
  )

const getExistingDamagedPlants = (order) =>
  Math.max(
    0,
    Number(order.details?.damagedPlants ?? order.damagedPlants ?? 0) || 0
  )

const getOrderPayments = (order) => {
  const raw = order.details?.payment || order.payment || []
  return Array.isArray(raw) ? raw : []
}

const sumCollectedPayments = (payments) =>
  round2(
    (payments || []).reduce(
      (s, p) => (p?.paymentStatus === "COLLECTED" ? s + (Number(p.paidAmount) || 0) : s),
      0
    )
  )

const defaultPaymentDraft = () => ({
  paidAmount: "",
  modeOfPayment: "",
  bankName: "",
  isWalletPayment: false,
  remark: "",
  utrNumber: "",
  transactionId: "",
  receiptPayeeName: "",
  receiptPhoto: [],
  paymentDate: new Date().toISOString().slice(0, 10),
  expanded: false
})

/** UTR or bank ref: OCR may set `utrNumber`; manual entry uses `transactionId`. */
const paymentTxnOrUtrTrimmed = (draft) =>
  String(draft?.utrNumber || "").trim() || String(draft?.transactionId || "").trim()

/** Pure: avoids useCallback in the component and keeps render/submit logic identical. */
function computePlantQuantities(order, additionalPlantInputs) {
  const k = rowKey(order)
  const basePlants =
    Number(order.details?.numberOfPlants ?? order.numberOfPlants ?? order.quantity ?? 0)
  const additionalFromData =
    Number(order.details?.additionalPlants ?? order.additionalPlants ?? 0) || 0
  const hasStateValue =
    k && Object.prototype.hasOwnProperty.call(additionalPlantInputs || {}, k)
  const stateValue = hasStateValue ? additionalPlantInputs[k] : undefined
  let additionalValue = additionalFromData
  if (hasStateValue) {
    if (stateValue === "" || stateValue === null || stateValue === undefined) {
      additionalValue = 0
    } else {
      const parsed = Number(stateValue)
      additionalValue = Number.isNaN(parsed) ? 0 : parsed
    }
  }
  const totalPlants = basePlants + additionalValue
  return { basePlants, additionalPlants: additionalValue, totalPlants }
}

function defaultNurserySiteCode(sites) {
  if (!sites?.length) return "RB"
  const rb = sites.find((s) => String(s.code).toUpperCase() === "RB")
  return rb?.code
    ? String(rb.code).toUpperCase()
    : String(sites[0]?.code || "RB").toUpperCase()
}

/** Normalize GET /dispatched/:id — axios + generateResponse shapes. */
function parseDispatchFromGetByIdResponse(res) {
  const top = res?.data
  if (!top || typeof top !== "object") return null
  const inner = top.data
  if (inner && typeof inner === "object" && !Array.isArray(inner) && inner._id) return inner
  if (top._id && typeof top === "object" && !Array.isArray(top)) return top
  const nested = inner && typeof inner === "object" && inner.data
  if (nested?._id) return nested
  return null
}

const OrderCompleteDialog = ({ open, onClose, dispatchData, onSuccess }) => {
  const hasPaymentAccess = useHasPaymentAccess()
  const [localDispatch, setLocalDispatch] = useState(() => dispatchData ?? null)
  /** One-time seed per dialog open — avoids parent re-renders & Strict Mode remounts overwriting GET results. */
  const dialogSessionStartedRef = useRef(false)
  const [nurserySites, setNurserySites] = useState([])
  /** Per order row: nursery site code (persisted on Order.expectedNursery). */
  const [expectedNurseryByOrder, setExpectedNurseryByOrder] = useState({})
  const [paymentTransferOpen, setPaymentTransferOpen] = useState(false)
  const [paymentTransferSourceId, setPaymentTransferSourceId] = useState(null)
  const [paymentTransferPaymentId, setPaymentTransferPaymentId] = useState(null)

  const [returnedPlants, setReturnedPlants] = useState({})
  const [damagedPlants, setDamagedPlants] = useState({})
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [returnReasons, setReturnReasons] = useState({})
  const [batchNumbers, setBatchNumbers] = useState({})
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const refreshDispatchPayload = useCallback(async (explicitDispatchId) => {
    const id = String(explicitDispatchId ?? "").trim()
    if (!id) return false
    try {
      const inst = NetworkManager(API.DISPATCHED.GET_BY_ID)
      const res = await inst.request({}, [id])
      const d = parseDispatchFromGetByIdResponse(res)
      if (d?._id) {
        const orderIds = Array.isArray(d.orderIds) ? d.orderIds : []
        setLocalDispatch({ ...d, orderIds })
        return true
      }
    } catch (e) {
      console.error("refreshDispatchPayload:", e)
    }
    return false
  }, [])

  useEffect(() => {
    if (!open) {
      dialogSessionStartedRef.current = false
      return
    }
    if (!dispatchData?._id) return
    if (dialogSessionStartedRef.current) return
    dialogSessionStartedRef.current = true
    setLocalDispatch(dispatchData)
    void refreshDispatchPayload(String(dispatchData._id))
  }, [open, dispatchData, refreshDispatchPayload])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const inst = NetworkManager(API.NURSERY_SITE.LIST)
        const res = await inst.request({}, { activeOnly: "true" })
        const raw = res?.data?.data
        const list = Array.isArray(raw) ? raw : []
        if (cancelled) return
        setNurserySites(list)
      } catch {
        if (!cancelled) {
          setNurserySites([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const [orderActions, setOrderActions] = useState({})
  const [additionalPlantInputs, setAdditionalPlantInputs] = useState({})
  const [paymentDraftByOrder, setPaymentDraftByOrder] = useState({})
  const [paymentUploadBusy, setPaymentUploadBusy] = useState({})
  const [paymentOcrBusy, setPaymentOcrBusy] = useState({})

  useEffect(() => {
    if (!localDispatch?.orderIds) return
    const initialActions = {}
    const initialAdditional = {}
    const initialPay = {}
    const initialBatch = {}
    const initialExpectedNursery = {}
    localDispatch.orderIds.forEach((order) => {
      const k = rowKey(order)
      if (!k) return
      initialActions[k] = { completeOrder: true }
      const existingAdditional =
        Number(order.details?.additionalPlants ?? order.additionalPlants ?? 0) || 0
      initialAdditional[k] = existingAdditional
      initialPay[k] = defaultPaymentDraft()
      const bn = order.details?.batchNumber ?? order.batchNumber
      initialBatch[k] = bn != null && bn !== "" ? String(bn) : ""
      const savedN =
        order.details?.expectedNursery != null || order.expectedNursery != null
          ? String(order.details?.expectedNursery ?? order.expectedNursery).trim().toUpperCase()
          : ""
      initialExpectedNursery[k] = savedN || "RB"
    })
    setOrderActions(initialActions)
    setAdditionalPlantInputs(initialAdditional)
    setPaymentDraftByOrder(initialPay)
    setBatchNumbers(initialBatch)
    setExpectedNurseryByOrder(initialExpectedNursery)
    setReturnedPlants({})
    setDamagedPlants({})
    setReturnReasons({})
    setExpandedRows(new Set())
    setPaymentUploadBusy({})
    setPaymentOcrBusy({})
  }, [localDispatch])

  const handleReturnedPlantsChange = (k, value) => {
    setReturnedPlants((prev) => ({ ...prev, [k]: value }))
  }

  const handleReasonChange = (k, value) => {
    setReturnReasons((prev) => ({ ...prev, [k]: value }))
  }

  const handleBatchNumberChange = (k, value) => {
    setBatchNumbers((prev) => ({ ...prev, [k]: value }))
  }

  const handleExpectedNurseryChange = (k, value) => {
    setExpectedNurseryByOrder((prev) => ({
      ...prev,
      [k]: String(value || "").toUpperCase()
    }))
  }

  const handleDamagedPlantsChange = (k, value) => {
    setDamagedPlants((prev) => ({ ...prev, [k]: value }))
  }

  const handleActionChange = (k, action, checked) => {
    setOrderActions((prev) => ({
      ...prev,
      [k]: { ...prev[k], [action]: checked }
    }))
  }

  const handleAdditionalPlantsChange = (k, value) => {
    const sanitizedValue =
      value === "" ? "" : Math.max(0, Number.isNaN(Number(value)) ? 0 : Number(value))
    setAdditionalPlantInputs((prev) => ({ ...prev, [k]: sanitizedValue }))
  }

  const updatePaymentDraft = (k, patch) => {
    setPaymentDraftByOrder((prev) => ({
      ...prev,
      [k]: { ...(prev[k] || defaultPaymentDraft()), ...patch }
    }))
  }

  const toggleRow = (k) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const handleOpenAddOrderDialog = () => setShowAddOrderDialog(true)
  const handleCloseAddOrderDialog = () => setShowAddOrderDialog(false)

  const handleDetachOrder = async (orderMongoId) => {
    const oid = String(orderMongoId || "").trim()
    if (!oid) return
    if (!window.confirm("Remove this order from the vehicle? It returns to ready for dispatch.")) return
    try {
      setIsLoading(true)
      const inst = NetworkManager(API.DISPATCHED.DETACH_ORDER)
      await inst.request({ orderId: oid }, [String(localDispatch?._id || dispatchData?._id)])
      Toast.success("Order removed from dispatch")
      const rid = String(localDispatch?._id || dispatchData?._id || "")
      const ok = await refreshDispatchPayload(rid)
      if (!ok) Toast.error("Removed, but could not refresh — close and reopen the dialog.")
      onSuccess?.()
    } catch (err) {
      console.error(err)
      Toast.error(err?.response?.data?.message || err?.message || "Could not remove order")
    } finally {
      setIsLoading(false)
    }
  }

  const removePaymentImage = (k, index) => {
    setPaymentDraftByOrder((prev) => {
      const cur = prev[k] || defaultPaymentDraft()
      const receiptPhoto = (cur.receiptPhoto || []).filter((_, i) => i !== index)
      return { ...prev, [k]: { ...cur, receiptPhoto } }
    })
  }

  const handlePaymentImageUpload = async (k, event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ""
    if (files.length === 0) return

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        Toast.error("Please select image files only")
        return
      }
      if (file.size > 8 * 1024 * 1024) {
        Toast.error("Max 8MB per image")
        return
      }
    }

    let mergedAfterUpload
    try {
      setPaymentUploadBusy((b) => ({ ...b, [k]: true }))
      const uploadedUrls = (
        await Promise.all(
          files.map(async (file) => {
            const formData = new FormData()
            formData.append("media_key", file)
            formData.append("media_type", "IMAGE")
            formData.append("content_type", "multipart/form-data")
            const instance = NetworkManager(API.MEDIA.UPLOAD)
            const response = await instance.request(formData)
            return response?.data?.data?.media_url || response?.data?.media_url
          })
        )
      ).filter(Boolean)

      if (uploadedUrls.length === 0) {
        Toast.error("Upload did not return a URL")
        return
      }

      setPaymentDraftByOrder((prev) => {
        const cur = { ...(prev[k] || defaultPaymentDraft()) }
        mergedAfterUpload = {
          ...cur,
          receiptPhoto: [...(cur.receiptPhoto || []), ...uploadedUrls]
        }
        return { ...prev, [k]: mergedAfterUpload }
      })

      Toast.success("Receipt uploaded")

      const firstNew = uploadedUrls[0]
      if (firstNew) {
        setPaymentOcrBusy((b) => ({ ...b, [k]: true }))
        try {
          const ocr = await extractUpiFromReceiptImageUrl(firstNew)
          if (ocr?.success && ocr?.data) {
            const afterOcr = mergeUpiOcrIntoPaymentState(mergedAfterUpload, ocr.data)
            setPaymentDraftByOrder((prev) => ({ ...prev, [k]: afterOcr }))
            Toast.success(
              ocr.data.needs_review
                ? "Receipt scanned — verify payee, amount, UTR"
                : "Receipt details filled from screenshot"
            )
          }
        } catch (err) {
          console.warn("UPI OCR:", err)
          Toast.error(err?.message || "Could not read receipt")
        } finally {
          setPaymentOcrBusy((b) => ({ ...b, [k]: false }))
        }
      }
    } catch (error) {
      console.error("Receipt upload:", error)
      Toast.error("Failed to upload receipt")
    } finally {
      setPaymentUploadBusy((b) => ({ ...b, [k]: false }))
    }
  }

  const processReturnedPlants = (
    dispatchData,
    returnedPlants,
    damagedPlants,
    returnReasons,
    orderActions,
    paymentDraftByOrder,
    batchNumbersByOrderKey = {},
    expectedNurseryByOrderKey = {},
    nurserySitesList = []
  ) => {
    if (!dispatchData?.orderIds) throw new Error("Invalid dispatch data")
    const orderUpdates = []

    dispatchData.orderIds.forEach((order) => {
      const k = rowKey(order)
      const oid = apiOrderId(order)
      if (!k || !oid) return

      const rawReturned = returnedPlants[k]
      const returnedQuantity = Math.max(
        0,
        Number.isNaN(Number(rawReturned)) ? 0 : Number(rawReturned)
      )
      const rawDamaged = damagedPlants[k]
      const damagedQuantity = Math.max(
        0,
        Number.isNaN(Number(rawDamaged)) ? 0 : Number(rawDamaged)
      )
      const { basePlants, additionalPlants: additionalPlantCount, totalPlants } =
        computePlantQuantities(order, additionalPlantInputs)
      const actions = orderActions[k] || { completeOrder: true }

      const undispatchedAtNursery =
        Number(order.details?.remainingPlants ?? order.remainingPlants ?? 0) || 0

      const existingReturned = getExistingReturnedPlants(order)
      const existingDamaged = getExistingDamagedPlants(order)
      const maxTrackableThisBatch = Math.max(0, totalPlants - existingReturned - existingDamaged)
      if (returnedQuantity + damagedQuantity > maxTrackableThisBatch) {
        throw new Error(
          `Return + damaged quantity for Order #${displayOrderNumber(order)} cannot exceed ${maxTrackableThisBatch} (${existingReturned} returned and ${existingDamaged} damaged already recorded of ${totalPlants} total)`
        )
      }

      const isCompleteChecked = actions.completeOrder !== false
      let finalStatus = "COMPLETED"
      let finalCompleteAction = actions.completeOrder !== false

      if (undispatchedAtNursery > 0) {
        finalStatus = "READY_FOR_DISPATCH"
        finalCompleteAction = false
      } else if (!isCompleteChecked) {
        finalStatus = "PARTIALLY_COMPLETED"
        finalCompleteAction = false
      }

      const draft = paymentDraftByOrder[k] || defaultPaymentDraft()
      const rawPaid = String(draft.paidAmount || "").trim()
      const amt = Number(rawPaid)
      const newPayments = []
      if (
        !draft.isWalletPayment &&
        draft.modeOfPayment &&
        (!rawPaid || Number.isNaN(amt) || amt <= 0)
      ) {
        throw new Error(`Please enter amount for the selected payment mode (order #${displayOrderNumber(order)})`)
      }
      if (draft.isWalletPayment && (!rawPaid || Number.isNaN(amt) || amt <= 0)) {
        throw new Error(`Please enter wallet payment amount (order #${displayOrderNumber(order)})`)
      }
      if (!Number.isNaN(amt) && amt !== 0) {
        if (!draft.isWalletPayment && !draft.modeOfPayment) {
          throw new Error(
            `Please select payment mode for the payment amount entered (order #${displayOrderNumber(order)})`
          )
        }
        const mode = draft.isWalletPayment ? "Wallet" : draft.modeOfPayment
        const needsReceiptScreenshot =
          !draft.isWalletPayment &&
          mode &&
          mode !== "Cash" &&
          mode !== "NEFT/RTGS"
        if (needsReceiptScreenshot && !(draft.receiptPhoto && draft.receiptPhoto.length > 0)) {
          throw new Error(
            mode === "UPI" || mode === "Cheque"
              ? `Receipt photo is mandatory for UPI and Cheque (order #${displayOrderNumber(order)})`
              : `Payment image is mandatory for ${mode} payments (order #${displayOrderNumber(order)})`
          )
        }
        if (mode === "UPI" && !paymentTxnOrUtrTrimmed(draft)) {
          throw new Error(
            `UTR or transaction reference is required for UPI (order #${displayOrderNumber(order)})`
          )
        }
        /* Status is always PENDING here; mark Collected from accountant dashboard. */
        const status = "PENDING"
        const receiptUrls = Array.isArray(draft.receiptPhoto) ? draft.receiptPhoto : []
        const txnUtr = paymentTxnOrUtrTrimmed(draft)
        newPayments.push({
          paidAmount: amt,
          paymentStatus: status,
          paymentDate: draft.paymentDate ? new Date(draft.paymentDate) : new Date(),
          bankName: (draft.bankName || "").trim(),
          receiptPhoto: receiptUrls,
          modeOfPayment: mode,
          isWalletPayment: Boolean(draft.isWalletPayment),
          remark: buildRemarkWithReceiptPayee(draft.remark, draft.receiptPayeeName) || "",
          utrNumber: draft.utrNumber?.trim() || draft.transactionId?.trim() || undefined,
          transactionId: draft.transactionId?.trim() || draft.utrNumber?.trim() || txnUtr || undefined
        })
      }

      const nurseryCode =
        String(expectedNurseryByOrderKey[k] ?? "").trim().toUpperCase() ||
        defaultNurserySiteCode(nurserySitesList)

      orderUpdates.push({
        orderId: oid,
        returnedPlants: returnedQuantity,
        damagedPlants: damagedQuantity,
        returnReason: returnReasons[k] || "",
        batchNumber:
          batchNumbersByOrderKey[k] != null
            ? String(batchNumbersByOrderKey[k]).trim()
            : "",
        expectedNursery: nurseryCode,
        additionalPlants: additionalPlantCount,
        basePlants,
        totalPlants,
        actions: {
          completeOrder: finalCompleteAction,
          finalStatus
        },
        ...(newPayments.length ? { newPayments } : {})
      })
    })

    return { orderUpdates }
  }

  const handleCompleteOrders = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      setIsLoading(true)
      const instance = NetworkManager(API.DISPATCHED.UPDATE_COMPLETE)
      const user = await instance.request(
        {
          ...processReturnedPlants(
            localDispatch,
            returnedPlants,
            damagedPlants,
            returnReasons,
            orderActions,
            paymentDraftByOrder,
            batchNumbers,
            expectedNurseryByOrder,
            nurserySites
          )
        },
        [localDispatch?._id || dispatchData?._id]
      )
      if (user?.data?.status) {
        Toast.success(user?.data?.message)
        onSuccess?.()
        onClose()
      }
    } catch (error) {
      console.error("Error completing orders:", error)
      if (
        error.message &&
        (error.message.includes("Order #") ||
          error.message.includes("order #") ||
          error.message.includes("Return quantity for Order #") ||
          error.message.includes("UTR or transaction"))
      ) {
        Toast.error(error.message)
      } else {
        Toast.error(error.message || "Error processing orders")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  const pickup0 = localDispatch?.plantsDetails?.[0]?.pickupDetails?.[0]
  const defaultShadeId = pickup0?.shade != null ? String(pickup0.shade) : ""
  const defaultCavityId = pickup0?.cavity != null ? String(pickup0.cavity) : ""
  const defaultLinkQty =
    Number(
      localDispatch?.orderIds?.[0]?.details?.remainingPlants ??
        localDispatch?.orderIds?.[0]?.remainingPlants ??
        0
    ) || ""

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
        <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
          <div className="shrink-0 border-b border-gray-200 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
                  Complete delivery · Transport {localDispatch?.transportId ?? dispatchData?.transportId}
                </h2>
                <p className="truncate text-xs text-gray-600 sm:text-sm">
                  {localDispatch?.driverName || dispatchData?.driverName || "—"} ·{" "}
                  {localDispatch?.vehicleName || dispatchData?.vehicleName || "—"}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">
                  Returns / damaged adjust plants and credits (same rate). Wallet rules unchanged on server.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddOrderDialog}
                className="inline-flex shrink-0 items-center justify-center self-start rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 sm:text-sm">
                <Plus className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Add order
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3 sm:py-3">
            <div
              className="space-y-2"
              key={`orders-${String(localDispatch?._id || "")}-${(localDispatch?.orderIds || []).length}-${localDispatch?.updatedAt != null ? String(localDispatch.updatedAt) : ""}`}>
              {localDispatch?.orderIds?.map((order) => {
                const k = rowKey(order)
                if (!k) return null
                const { basePlants, additionalPlants: additionalPlantCount, totalPlants } =
                  computePlantQuantities(order, additionalPlantInputs)
                const rate = Number(order.rate ?? order.details?.rate ?? 0) || 0
                const serverAdditionalPlants =
                  Number(order.details?.additionalPlants ?? order.additionalPlants ?? 0) || 0
                const additionalPlantsDelta = additionalPlantCount - serverAdditionalPlants
                const additionalAmountDelta = round2(additionalPlantsDelta * rate)
                const returnedQuantity = Number(returnedPlants[k] || 0)
                const damagedQuantity = Number(damagedPlants[k] || 0)
                const existingReturned = getExistingReturnedPlants(order)
                const existingDamaged = getExistingDamagedPlants(order)
                const maxTrackableThisBatch = Math.max(
                  0,
                  totalPlants - existingReturned - existingDamaged
                )
                const maxReturnThisBatch = Math.max(0, maxTrackableThisBatch - damagedQuantity)
                const maxDamagedThisBatch = Math.max(0, maxTrackableThisBatch - returnedQuantity)
                const undispatchedAtNursery =
                  Number(order.details?.remainingPlants ?? order.remainingPlants ?? 0) || 0
                const isCompleteChecked = orderActions[k]?.completeOrder !== false
                const cumulativeReturnedAfter = existingReturned + returnedQuantity
                const cumulativeDamagedAfter = existingDamaged + damagedQuantity
                const netWithFarmer = Math.max(
                  0,
                  totalPlants -
                    undispatchedAtNursery -
                    cumulativeReturnedAfter -
                    cumulativeDamagedAfter
                )

                const payments = getOrderPayments(order)
                const collected = sumCollectedPayments(payments)
                const grossOrderValue = round2(rate * totalPlants)
                const returnCreditDelta = round2(returnedQuantity * rate)
                const damagedCreditDelta = round2(damagedQuantity * rate)
                const dispatchCreditsThisSubmit = round2(returnCreditDelta + damagedCreditDelta)
                const estimatedAfterSubmit = round2(
                  grossOrderValue - collected - dispatchCreditsThisSubmit
                )

                const payDraft = paymentDraftByOrder[k] || defaultPaymentDraft()

                const orderNoLabel = displayOrderNumber(order)
                const farmerLabel = displayFarmerName(order)
                const plantLabel = displayPlantLabel(order)
                const contactLabel = displayContact(order)
                const villageLabel = displayVillage(order)
                const headerTitle = `${orderNoLabel} · ${farmerLabel}`

                return (
                  <div
                    key={k}
                    className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm sm:p-3">
                    <div className="flex gap-2 border-b border-gray-100 pb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white"
                            title={`Order ${orderNoLabel}`}>
                            #{orderNoLabel}
                          </span>
                          <span
                            className="min-w-0 truncate text-sm font-semibold text-gray-900"
                            title={headerTitle}>
                            {farmerLabel}
                          </span>
                        </div>
                        <p
                          className="mt-0.5 truncate text-xs text-gray-600"
                          title={plantLabel}>
                          {plantLabel}
                        </p>
                        <p
                          className="mt-0.5 truncate text-[11px] text-gray-500"
                          title={[contactLabel, villageLabel].filter(Boolean).join(" · ") || undefined}>
                          ₹{rate}/plant
                          {contactLabel || villageLabel
                            ? `${contactLabel ? ` · ${contactLabel}` : ""}${villageLabel ? ` · ${villageLabel}` : ""}`
                            : " · —"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                            Book {totalPlants}
                            <span className="ml-0.5 font-normal text-gray-400">({basePlants}+{additionalPlantCount})</span>
                          </span>
                          <span className="inline-flex items-center rounded border border-green-100 bg-green-50/80 px-1.5 py-0.5 text-[10px] text-green-900">
                            Ret {existingReturned}
                            {returnedQuantity > 0 ? (
                              <span className="font-semibold"> →{cumulativeReturnedAfter}</span>
                            ) : null}
                          </span>
                          <span className="inline-flex items-center rounded border border-red-100 bg-red-50/80 px-1.5 py-0.5 text-[10px] text-red-900">
                            Dmg {existingDamaged}
                            {damagedQuantity > 0 ? (
                              <span className="font-semibold"> →{cumulativeDamagedAfter}</span>
                            ) : null}
                          </span>
                          <span className="inline-flex items-center rounded border border-amber-100 bg-amber-50/90 px-1.5 py-0.5 text-[10px] text-amber-900">
                            Nursery {undispatchedAtNursery}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 self-start">
                        <button
                          type="button"
                          title="Remove from this vehicle"
                          disabled={isLoading}
                          onClick={() => handleDetachOrder(apiOrderId(order))}
                          className="inline-flex h-fit items-center gap-0.5 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-800 hover:bg-red-100 disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRow(k)}
                          className="inline-flex h-fit items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100">
                          {expandedRows.has(k) ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          More
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                          <div>
                            <label className="text-[10px] font-medium text-gray-500">Base</label>
                            <div className="mt-0.5 rounded border border-gray-200 bg-white px-1.5 py-1 text-center font-medium">
                              {basePlants}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-medium text-gray-500">+Add</label>
                            <input
                              type="number"
                              min={0}
                              className="mt-0.5 w-full rounded border border-gray-200 px-1.5 py-1 text-xs"
                              value={
                                Object.prototype.hasOwnProperty.call(additionalPlantInputs, k)
                                  ? additionalPlantInputs[k]
                                  : additionalPlantCount > 0
                                    ? additionalPlantCount
                                    : ""
                              }
                              onChange={(e) => handleAdditionalPlantsChange(k, e.target.value)}
                            />
                            {additionalPlantsDelta !== 0 && (
                              <p className="mt-0.5 text-[10px] font-medium text-indigo-700">
                                {additionalPlantsDelta > 0 ? "+" : ""}
                                {additionalPlantsDelta} pl → {additionalAmountDelta >= 0 ? "+" : "−"}₹
                                {Math.abs(additionalAmountDelta).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-medium text-gray-500">Total</label>
                            <div className="mt-0.5 rounded border border-gray-200 bg-white px-1.5 py-1 text-center font-semibold">
                              {totalPlants}
                            </div>
                            <p className="mt-0.5 text-center text-[10px] text-gray-500">× ₹{rate}</p>
                          </div>
                        </div>
                        <p className="rounded border border-slate-100 bg-slate-50/90 px-1.5 py-1 text-center text-[10px] font-medium text-slate-800">
                          Booked value: ₹{grossOrderValue.toLocaleString()} ({totalPlants} pl × ₹{rate})
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-medium text-gray-600">Returned</label>
                            <input
                              type="number"
                              min={0}
                              max={maxReturnThisBatch}
                              className="mt-0.5 w-full rounded border border-green-200 px-2 py-1 text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500"
                              placeholder="0"
                              value={returnedQuantity || ""}
                              onChange={(e) => handleReturnedPlantsChange(k, e.target.value)}
                            />
                            <p className="mt-0.5 text-[11px] text-gray-400">Max {maxReturnThisBatch}</p>
                            <p className="text-[10px] font-medium text-green-800">
                              Credit this leg: −₹{returnCreditDelta.toLocaleString()}
                              {returnedQuantity > 0 ? ` (${returnedQuantity}×₹${rate})` : ""}
                            </p>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-gray-600">Damaged</label>
                            <input
                              type="number"
                              min={0}
                              max={maxDamagedThisBatch}
                              className="mt-0.5 w-full rounded border border-red-200 px-2 py-1 text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500"
                              placeholder="0"
                              value={damagedQuantity || ""}
                              onChange={(e) => handleDamagedPlantsChange(k, e.target.value)}
                            />
                            <p className="mt-0.5 text-[11px] text-gray-400">Max {maxDamagedThisBatch}</p>
                            <p className="text-[10px] font-medium text-red-800">
                              Credit this leg: −₹{damagedCreditDelta.toLocaleString()}
                              {damagedQuantity > 0 ? ` (${damagedQuantity}×₹${rate})` : ""}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-gray-600">Nursery (expected)</label>
                          <select
                            className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                            value={expectedNurseryByOrder[k] ?? defaultNurserySiteCode(nurserySites)}
                            onChange={(e) => handleExpectedNurseryChange(k, e.target.value)}>
                            {nurserySites.length === 0 ? (
                              <option value="RB">RB</option>
                            ) : (
                              nurserySites.map((s) => (
                                <option key={s._id} value={String(s.code || "").toUpperCase()}>
                                  {s.name} ({String(s.code || "").toUpperCase()})
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="min-w-0">
                            <label className="text-[11px] font-medium text-gray-600">Batch no.</label>
                            <input
                              type="text"
                              className="mt-0.5 w-full rounded border border-amber-200 bg-amber-50/50 px-2 py-1 text-xs"
                              placeholder="Lot / batch"
                              value={batchNumbers[k] != null ? batchNumbers[k] : ""}
                              onChange={(e) => handleBatchNumberChange(k, e.target.value)}
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="text-[11px] font-medium text-gray-600">Note</label>
                            <input
                              type="text"
                              className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs"
                              placeholder="Reason"
                              value={returnReasons[k] || ""}
                              onChange={(e) => handleReasonChange(k, e.target.value)}
                            />
                          </div>
                        </div>
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-800">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            checked={isCompleteChecked}
                            onChange={(e) => handleActionChange(k, "completeOrder", e.target.checked)}
                          />
                          <Check className="h-3 w-3 shrink-0 text-green-600" />
                          <span>Complete order if nothing left at nursery</span>
                        </label>
                      </div>

                      <div className="rounded-md border border-blue-100 bg-blue-50/90 p-2 text-xs text-blue-950">
                        <h4 className="text-[11px] font-bold uppercase tracking-wide text-blue-900/90">
                          Summary
                        </h4>
                        <dl className="mt-1.5 space-y-1 text-[11px] text-blue-900/95">
                          <div className="flex justify-between gap-1 leading-tight">
                            <dt className="text-blue-800/90">At nursery</dt>
                            <dd className="shrink-0 font-semibold">{undispatchedAtNursery}</dd>
                          </div>
                          <div className="flex justify-between gap-1 leading-tight">
                            <dt className="text-blue-800/90">Net w/ farmer</dt>
                            <dd className="shrink-0 font-semibold">{netWithFarmer}</dd>
                          </div>
                          <div className="my-1 border-t border-blue-200/70" />
                          <div className="flex justify-between gap-1 leading-tight">
                            <dt>Gross (qty×rate)</dt>
                            <dd className="text-right">
                              ₹{grossOrderValue.toLocaleString()}
                              <span className="block font-normal text-[10px] text-blue-800/80">
                                {totalPlants} pl × ₹{rate}
                              </span>
                            </dd>
                          </div>
                          {additionalPlantsDelta !== 0 && (
                            <div className="flex justify-between gap-1 leading-tight text-indigo-900">
                              <dt>Δ +Add vs saved</dt>
                              <dd>
                                {additionalPlantsDelta > 0 ? "+" : ""}
                                {additionalPlantsDelta} pl → {additionalAmountDelta >= 0 ? "+" : "−"}₹
                                {Math.abs(additionalAmountDelta).toLocaleString()}
                              </dd>
                            </div>
                          )}
                          <div className="flex justify-between gap-1 leading-tight">
                            <dt>Paid (collected)</dt>
                            <dd>₹{collected.toLocaleString()}</dd>
                          </div>
                          <div className="flex justify-between gap-1 leading-tight text-green-800">
                            <dt>Return credit</dt>
                            <dd>
                              −₹{returnCreditDelta.toLocaleString()}
                              <span className="block text-end font-normal text-[10px] opacity-90">
                                {returnedQuantity} pl × ₹{rate}
                              </span>
                            </dd>
                          </div>
                          <div className="flex justify-between gap-1 leading-tight text-red-800/90">
                            <dt>Damage credit</dt>
                            <dd>
                              −₹{damagedCreditDelta.toLocaleString()}
                              <span className="block text-end font-normal text-[10px] opacity-90">
                                {damagedQuantity} pl × ₹{rate}
                              </span>
                            </dd>
                          </div>
                          <div className="flex justify-between gap-1 border-t border-blue-200/60 pt-0.5 text-[10px] font-medium leading-tight text-blue-900/90">
                            <dt>Credits total</dt>
                            <dd>−₹{dispatchCreditsThisSubmit.toLocaleString()}</dd>
                          </div>
                          <div className="flex justify-between gap-1 font-semibold leading-tight">
                            <dt>Balance after submit</dt>
                            <dd>₹{estimatedAfterSubmit.toLocaleString()}</dd>
                          </div>
                        </dl>
                        <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-blue-800/75">
                          Gross uses total plants (+Add). Credits use only this leg’s returned & damaged.
                          New payments stay Pending until the accountant dashboard.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-gray-100 pt-2">
                      <button
                        type="button"
                        onClick={() => updatePaymentDraft(k, { expanded: !payDraft.expanded })}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">
                        {payDraft.expanded ? "Hide payment form" : "Add Payment"}
                      </button>
                      {payDraft.paidAmount ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                          ₹{parseFloat(payDraft.paidAmount).toLocaleString()} added
                        </span>
                      ) : null}
                      {payDraft.expanded && (
                        <div className="mt-3 space-y-3 rounded-md border border-gray-200 bg-[#fafafa] p-3">
                          <div className="rounded-md border border-amber-200 bg-amber-50/90 p-2.5">
                            <label className="flex cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                checked={payDraft.isWalletPayment}
                                onChange={(e) =>
                                  updatePaymentDraft(k, {
                                    isWalletPayment: e.target.checked,
                                    modeOfPayment: e.target.checked ? "" : payDraft.modeOfPayment || ""
                                  })
                                }
                              />
                              <span>
                                <span className="text-sm font-semibold text-gray-900">Pay from Wallet</span>
                                <span className="mt-0.5 block text-xs text-gray-600">
                                  When enabled, payment mode below is not used.
                                </span>
                              </span>
                            </label>
                            {payDraft.isWalletPayment && (
                              <p className="mt-2 text-xs font-medium text-green-700">
                                ✓ Payment will be deducted from wallet balance
                              </p>
                            )}
                          </div>

                          <div className="border-b border-gray-200 pb-3">
                            <h5 className="text-sm font-semibold text-slate-800">Payment Receipt Photo</h5>
                            <p className="mt-1 text-xs leading-snug text-gray-600">
                              {payDraft.modeOfPayment === "UPI" && !payDraft.isWalletPayment
                                ? "UPI: receipt screenshot and UTR are both required. "
                                : payDraft.modeOfPayment &&
                                    !["Cash", "NEFT/RTGS", "Wallet"].includes(payDraft.modeOfPayment) &&
                                    !payDraft.isWalletPayment
                                  ? `Receipt required for ${payDraft.modeOfPayment}. `
                                  : "Optional for Cash & NEFT/RTGS. "}
                              Upload first — we scan the receipt to fill payee, amount, date, and UTR when
                              possible.
                            </p>
                            {(paymentUploadBusy[k] || paymentOcrBusy[k]) && (
                              <div className="mb-2 mt-2 h-1 w-full max-w-[280px] overflow-hidden rounded bg-gray-200">
                                <div className="h-full w-1/3 animate-pulse rounded bg-indigo-400" />
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <label
                                className={`inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm ${
                                  paymentUploadBusy[k] || paymentOcrBusy[k]
                                    ? "pointer-events-none cursor-not-allowed opacity-60"
                                    : "cursor-pointer hover:bg-gray-50"
                                }`}>
                                {paymentUploadBusy[k] || paymentOcrBusy[k] ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-600" />
                                ) : (
                                  <ImageIcon className="h-3.5 w-3.5 text-gray-600" />
                                )}
                                {paymentOcrBusy[k]
                                  ? "Reading receipt…"
                                  : paymentUploadBusy[k]
                                    ? "Uploading…"
                                    : "Upload receipt"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  disabled={Boolean(paymentUploadBusy[k] || paymentOcrBusy[k])}
                                  className="sr-only"
                                  onChange={(e) => handlePaymentImageUpload(k, e)}
                                />
                              </label>
                              {(paymentUploadBusy[k] || paymentOcrBusy[k]) && (
                                <span className="text-xs text-gray-500">Wait for scan to finish</span>
                              )}
                            </div>
                            <div className="mt-1.5 space-y-0.5 min-h-[1.25rem]">
                              {payDraft.modeOfPayment &&
                                payDraft.modeOfPayment !== "Cash" &&
                                payDraft.modeOfPayment !== "NEFT/RTGS" &&
                                !payDraft.isWalletPayment && (
                                  <p className="text-xs text-red-600">
                                    {payDraft.modeOfPayment === "UPI" || payDraft.modeOfPayment === "Cheque"
                                      ? "Receipt photo is mandatory for UPI and Cheque."
                                      : `Payment image is mandatory for ${payDraft.modeOfPayment} payments`}
                                  </p>
                                )}
                              {payDraft.modeOfPayment === "UPI" &&
                                !payDraft.isWalletPayment &&
                                !paymentTxnOrUtrTrimmed(payDraft) && (
                                  <p className="text-xs text-red-600">
                                    UTR / transaction reference is mandatory for UPI (enter below or from
                                    receipt scan).
                                  </p>
                                )}
                            </div>
                            {(payDraft.receiptPhoto || []).length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {(payDraft.receiptPhoto || []).map((url, idx) => (
                                  <span
                                    key={`${url}-${idx}`}
                                    className="relative inline-block overflow-hidden rounded-lg border-2 border-gray-200">
                                    <img
                                      src={url}
                                      alt={`Receipt ${idx + 1}`}
                                      className="block h-[120px] w-[120px] object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removePaymentImage(k, idx)}
                                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-600"
                                      aria-label="Remove receipt">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">
                              Payee name (from receipt)
                            </label>
                            <input
                              type="text"
                              className="mt-1 h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                              placeholder="Filled when you upload a UPI receipt"
                              value={payDraft.receiptPayeeName}
                              onChange={(e) => updatePaymentDraft(k, { receiptPayeeName: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <label className="text-xs font-medium text-gray-700">Amount (₹)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                className="mt-1 h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                                placeholder="Enter amount"
                                value={payDraft.paidAmount}
                                onChange={(e) => updatePaymentDraft(k, { paidAmount: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Payment Date</label>
                              <input
                                type="date"
                                className="mt-1 h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                                value={payDraft.paymentDate}
                                onChange={(e) => updatePaymentDraft(k, { paymentDate: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <label className="text-xs font-medium text-gray-700">Payment Mode</label>
                              <select
                                className="mt-1 h-9 w-full rounded-md border border-gray-200 px-2 text-sm disabled:bg-gray-100"
                                value={payDraft.modeOfPayment}
                                disabled={payDraft.isWalletPayment}
                                onChange={(e) => updatePaymentDraft(k, { modeOfPayment: e.target.value })}>
                                <option value="">Select mode</option>
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Cheque">Cheque</option>
                                <option value="NEFT/RTGS">NEFT/RTGS</option>
                                <option value="1341">1341</option>
                                <option value="434">434</option>
                              </select>
                              {payDraft.isWalletPayment && (
                                <p className="mt-1 text-xs text-gray-500">
                                  Payment mode not required for wallet payments
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Bank Name</label>
                              <input
                                type="text"
                                className="mt-1 h-9 w-full rounded-md border border-gray-200 px-2 text-sm disabled:bg-gray-100"
                                placeholder={
                                  payDraft.modeOfPayment === "Cheque" ||
                                  payDraft.modeOfPayment === "NEFT/RTGS"
                                    ? "Enter bank name"
                                    : "N/A"
                                }
                                value={payDraft.bankName || ""}
                                disabled={
                                  payDraft.isWalletPayment ||
                                  (payDraft.modeOfPayment !== "Cheque" &&
                                    payDraft.modeOfPayment !== "NEFT/RTGS")
                                }
                                onChange={(e) => updatePaymentDraft(k, { bankName: e.target.value })}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">
                              {payDraft.modeOfPayment === "UPI" && !payDraft.isWalletPayment
                                ? "UTR / transaction ref (required for UPI)"
                                : "Transaction / UTR (optional)"}
                            </label>
                            <input
                              type="text"
                              className={`mt-1 h-9 w-full rounded-md border px-2 text-sm ${
                                payDraft.modeOfPayment === "UPI" &&
                                !payDraft.isWalletPayment &&
                                !paymentTxnOrUtrTrimmed(payDraft)
                                  ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-200"
                                  : "border-gray-200"
                              }`}
                              placeholder={
                                payDraft.modeOfPayment === "UPI" && !payDraft.isWalletPayment
                                  ? "Enter UTR from receipt (required)"
                                  : "UPI ref / bank txn id — optional"
                              }
                              value={payDraft.transactionId || payDraft.utrNumber || ""}
                              onChange={(e) => {
                                const v = e.target.value
                                updatePaymentDraft(k, { transactionId: v, utrNumber: "" })
                              }}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">Remark</label>
                            <textarea
                              className="mt-1 min-h-[4rem] w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                              placeholder="Optional remark"
                              rows={2}
                              value={payDraft.remark}
                              onChange={(e) => updatePaymentDraft(k, { remark: e.target.value })}
                            />
                          </div>

                          <p className="text-xs leading-snug text-gray-600">
                            New payments are saved as <span className="font-medium">Pending</span>. Mark{" "}
                            <span className="font-medium">Collected</span> from the accountant dashboard when
                            verified.
                          </p>
                        </div>
                      )}
                    </div>

                    {expandedRows.has(k) && (
                      <div className="mt-2 rounded-md border border-gray-200 bg-gray-50/80 p-2 text-xs text-gray-700">
                        <p className="font-semibold text-gray-900">
                          Order #{orderNoLabel} · {farmerLabel}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-600">{plantLabel}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <div>
                            <h5 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Amounts
                            </h5>
                            <p className="mt-0.5">Total: {order.total ?? order.details?.total ?? "—"}</p>
                            <p>Paid: {order["Paid Amt"] ?? "—"}</p>
                            <p>Remaining: {order["remaining Amt"] ?? "—"}</p>
                          </div>
                          <div>
                            <h5 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Delivery
                            </h5>
                            <p className="mt-0.5">Window: {order.Delivery ?? order.details?.deliveryDate ?? "—"}</p>
                            <p>Booked: {order.orderDate ?? order.details?.orderDate ?? "—"}</p>
                          </div>
                          <div>
                            <h5 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Sales
                            </h5>
                            <p className="mt-0.5">{order.details?.salesPerson?.name || "—"}</p>
                            <p className="text-gray-500">{order.details?.salesPerson?.phoneNumber || ""}</p>
                          </div>
                        </div>
                        {payments.length > 0 && (
                          <div className="mt-3">
                            <h5 className="font-medium text-gray-900">Payments on file</h5>
                            <ul className="mt-1 flex flex-col gap-1.5">
                              {payments.map((p, i) => {
                                const mongoId = apiOrderId(order)
                                const canTransferLine =
                                  hasPaymentAccess &&
                                  mongoId &&
                                  isPlantFarmerOrderForPaymentTransfer(order) &&
                                  transferableFarmerPlantPayments([p]).length === 1
                                return (
                                  <li
                                    key={p._id || i}
                                    className="flex flex-wrap items-center gap-2 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
                                    <span>
                                      ₹{p.paidAmount} · {p.paymentStatus}
                                      {p.modeOfPayment ? ` · ${p.modeOfPayment}` : ""}
                                    </span>
                                    {canTransferLine && p._id ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPaymentTransferSourceId(String(mongoId))
                                          setPaymentTransferPaymentId(String(p._id))
                                          setPaymentTransferOpen(true)
                                        }}
                                        className="rounded-md border border-amber-600 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-950 shadow-sm hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                                        Order transfer
                                      </button>
                                    ) : null}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
                        <div className="mt-3 rounded border border-gray-100 bg-gray-50 p-2 text-xs">
                          <span className="font-medium">Status preview: </span>
                          {undispatchedAtNursery > 0
                            ? "READY_FOR_DISPATCH (plants still at nursery)"
                            : !isCompleteChecked
                              ? "PARTIALLY_COMPLETED (complete unchecked)"
                              : "COMPLETED / closing leg"}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                This submit — returned:{" "}
                {Object.values(returnedPlants).reduce((s, q) => s + Number(q || 0), 0)} · damaged:{" "}
                {Object.values(damagedPlants).reduce((s, q) => s + Number(q || 0), 0)}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteOrders}
                  disabled={isLoading}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
                    isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                  }`}>
                  {isLoading && (
                    <svg
                      className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  Process orders
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddOrderDialog && (
        <ReplaceOrderDialog
          open={showAddOrderDialog}
          onClose={handleCloseAddOrderDialog}
          dispatchId={localDispatch?._id || dispatchData?._id}
          defaultCavityId={defaultCavityId}
          defaultShadeId={defaultShadeId}
          defaultDispatchQuantity={defaultLinkQty}
          onLinked={async () => {
            const rid = String(localDispatch?._id || dispatchData?._id || "")
            const ok = await refreshDispatchPayload(rid)
            if (!ok) Toast.error("Linked, but could not refresh the list — close and reopen.")
            onSuccess?.()
          }}
        />
      )}

      <PaymentTransferDialog
        open={paymentTransferOpen}
        onClose={() => {
          setPaymentTransferOpen(false)
          setPaymentTransferSourceId(null)
          setPaymentTransferPaymentId(null)
        }}
        initialSourceOrderId={paymentTransferSourceId || undefined}
        initialPaymentId={paymentTransferPaymentId || undefined}
        onSuccess={() => {
          if (typeof onSuccess === "function") onSuccess()
        }}
      />
    </>
  )
}

export default OrderCompleteDialog
