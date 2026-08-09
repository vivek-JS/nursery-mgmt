import React, { useState, useEffect, useRef, useCallback } from "react"
import { ChevronDown, ChevronRight, Plus, Check, Trash2, Pencil, Zap, Repeat } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { useHasPaymentAccess, useUserData } from "utils/roleUtils"
import CompactPaymentForm from "components/payments/CompactPaymentForm"
import { defaultPaymentDraft, draftToApiPayload, paymentTxnOrUtrTrimmed } from "components/payments/paymentFormDefaults"
import PaymentTransferDialog from "components/Modals/PaymentTransferDialog"
import { transferableFarmerPlantPayments } from "features/accountant-dashboard/farmerPlantPaymentTransfer.utils"
import ReplaceOrderDialog from "./ReplaceOrderDialog"
import QuickOrderDialog from "../Dispatch/components/QuickOrderDialog"
import EditOrderModal from "../Dispatch/components/EditOrderModal"
import RefusedReassignDialog from "../Dispatch/components/RefusedReassign/RefusedReassignDialog"
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

const orderForEditModal = (order) => {
  const oid = apiOrderId(order)
  return {
    _id: oid,
    id: oid,
    rate: order.rate ?? order.details?.rate,
    numberOfPlants: order.details?.numberOfPlants ?? order.numberOfPlants,
    quantity: order.details?.numberOfPlants ?? order.numberOfPlants,
    deliveryDate: order.details?.deliveryDate ?? order.deliveryDate,
    farmReadyDate: order.details?.farmReadyDate ?? order.farmReadyDate,
    bookingSlot: order.details?.bookingSlot ?? order.bookingSlot,
    orderStatus: order.details?.orderStatus ?? order.orderStatus,
    plantType: order.plantType ?? order.details?.plantType ?? order.details?.plant,
    plantSubtype: order.plantSubtype ?? order.details?.plantSubtype,
    plantId: order.plantType?.id ?? order.plantType?._id ?? order.details?.plantID,
    subtypeId: order.plantSubtype?.id ?? order.plantSubtype?._id ?? order.details?.plantSubtypeID,
  }
}

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

/** Undispatched qty at nursery; 0 is valid — never use `||` (would treat 0 as missing). */
function getUndispatchedAtNursery(order) {
  const rawRem = order?.details?.remainingPlants ?? order?.remainingPlants
  if (rawRem != null && !Number.isNaN(Number(rawRem))) {
    return Math.max(0, Number(rawRem))
  }
  const status = String(order?.details?.orderStatus ?? order?.orderStatus ?? "").toUpperCase()
  if (status === "DISPATCHED" || status === "COMPLETED") return 0
  const base = Number(order?.details?.numberOfPlants ?? order?.numberOfPlants ?? 0) || 0
  const add = Number(order?.details?.additionalPlants ?? order?.additionalPlants ?? 0) || 0
  return Math.max(0, base + add)
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
  const user = useUserData()
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
  const [freightChargesByOrder, setFreightChargesByOrder] = useState({})
  const [editOrderTarget, setEditOrderTarget] = useState(null)
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false)
  const [showQuickOrderDialog, setShowQuickOrderDialog] = useState(false)
  const [showReassignDialog, setShowReassignDialog] = useState(false)
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

  const [tripData, setTripData] = useState({ kmRun: "", rent: "", otherCharges: "", remark: "", expanded: false })

  const [orderActions, setOrderActions] = useState({})
  const [additionalPlantInputs, setAdditionalPlantInputs] = useState({})
  const [paymentDraftByOrder, setPaymentDraftByOrder] = useState({})
  const [paymentFormExpandedByOrder, setPaymentFormExpandedByOrder] = useState({})
  const [paymentReceiptBusy, setPaymentReceiptBusy] = useState(false)
  const [paymentOcrBusy, setPaymentOcrBusy] = useState(false)

  useEffect(() => {
    if (!localDispatch?.orderIds) return
    const initialActions = {}
    const initialAdditional = {}
    const initialPay = {}
    const initialBatch = {}
    const initialFreight = {}
    const initialExpectedNursery = {}
    localDispatch.orderIds.forEach((order) => {
      const k = rowKey(order)
      if (!k) return
      initialActions[k] = { completeOrder: true }
      const existingAdditional =
        Number(order.details?.additionalPlants ?? order.additionalPlants ?? 0) || 0
      initialAdditional[k] = existingAdditional
      initialPay[k] = [defaultPaymentDraft()]
      const bn = order.details?.batchNumber ?? order.batchNumber
      initialBatch[k] = bn != null && bn !== "" ? String(bn) : ""
      const fc = order.details?.freightCharges ?? order.freightCharges
      initialFreight[k] = fc != null && fc !== "" ? String(fc) : "0"
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
    setFreightChargesByOrder(initialFreight)
    setExpectedNurseryByOrder(initialExpectedNursery)
    setReturnedPlants({})
    setDamagedPlants({})
    setReturnReasons({})
    setExpandedRows(new Set())
    setPaymentFormExpandedByOrder({})
    setPaymentReceiptBusy(false)
    setPaymentOcrBusy(false)
    setTripData({ kmRun: "", rent: "", otherCharges: "", remark: "", expanded: false })
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

  const handleFreightChargesChange = (k, value) => {
    setFreightChargesByOrder((prev) => ({ ...prev, [k]: value }))
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

  const setPaymentDraftsForOrder = (k, draftsOrUpdater) => {
    setPaymentDraftByOrder((prev) => {
      const current = (() => {
        const raw = prev[k]
        if (Array.isArray(raw)) return raw.length ? raw : [defaultPaymentDraft()]
        if (raw && typeof raw === "object" && !Array.isArray(raw)) return [raw]
        return [defaultPaymentDraft()]
      })()
      const next =
        typeof draftsOrUpdater === "function" ? draftsOrUpdater(current) : draftsOrUpdater
      return { ...prev, [k]: next }
    })
  }

  const getPaymentDraftsForOrder = (k) => {
    const raw = paymentDraftByOrder[k]
    if (Array.isArray(raw)) return raw.length ? raw : [defaultPaymentDraft()]
    if (raw && typeof raw === "object") return [raw]
    return [defaultPaymentDraft()]
  }

  const uploadPaymentReceiptFiles = async (files) => {
    if (!files?.length) return []
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        Toast.error("Please select image files only")
        return []
      }
      if (file.size > 8 * 1024 * 1024) {
        Toast.error("Max 8MB per image")
        return []
      }
    }
    setPaymentReceiptBusy(true)
    try {
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
      if (!uploadedUrls.length) {
        Toast.error("Upload did not return a URL")
        return []
      }
      Toast.success("Receipt uploaded")
      return uploadedUrls
    } catch (error) {
      console.error("Receipt upload:", error)
      Toast.error("Failed to upload receipt")
      return []
    } finally {
      setPaymentReceiptBusy(false)
    }
  }

  const applyOcrToPaymentDraft = async (imageUrl, draft, { overwrite = false } = {}) => {
    if (!imageUrl || !/^https?:\/\//i.test(String(imageUrl))) return null
    setPaymentOcrBusy(true)
    try {
      const ocr = await extractUpiFromReceiptImageUrl(imageUrl)
      if (ocr?.success && ocr?.data) {
        return mergeUpiOcrIntoPaymentState(draft || defaultPaymentDraft(), ocr.data, {
          fillAmount: true,
          overwrite,
        })
      }
      Toast.error("Could not read receipt — enter payment details manually")
      return null
    } catch (err) {
      console.warn("UPI OCR:", err)
      Toast.error(err?.message || "Could not read receipt")
      return null
    } finally {
      setPaymentOcrBusy(false)
    }
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

  const refreshAfterDispatchOrderChange = async () => {
    const rid = String(localDispatch?._id || dispatchData?._id || "")
    const ok = await refreshDispatchPayload(rid)
    if (!ok) Toast.error("Updated, but could not refresh the list — close and reopen.")
    onSuccess?.()
  }

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

  const processReturnedPlants = (
    dispatchData,
    returnedPlants,
    damagedPlants,
    returnReasons,
    orderActions,
    paymentDraftByOrder,
    batchNumbersByOrderKey = {},
    freightChargesByOrderKey = {},
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

      const undispatchedAtNursery = getUndispatchedAtNursery(order)

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

      const draftRows = (() => {
        const raw = paymentDraftByOrder[k]
        if (Array.isArray(raw)) return raw
        if (raw && typeof raw === "object") return [raw]
        return [defaultPaymentDraft()]
      })()
      const newPayments = []
      const orderLabel = displayOrderNumber(order)
      const filledRows = draftRows.filter((d) => {
        const amt = Number(d.paidAmount)
        return d.paidAmount && !Number.isNaN(amt) && amt > 0
      })
      const partialRows = draftRows.filter((d) => {
        const amt = Number(d.paidAmount)
        const hasAmt = d.paidAmount && !Number.isNaN(amt) && amt > 0
        const hasMode = d.isWalletPayment || d.modeOfPayment
        return !hasAmt && hasMode
      })
      if (partialRows.length) {
        throw new Error(`Complete payment rows for order #${orderLabel} (amount missing)`)
      }
      filledRows.forEach((draft, di) => {
        const row = di + 1
        const amt = Number(draft.paidAmount)
        if (!draft.isWalletPayment && !draft.modeOfPayment) {
          throw new Error(`Row ${row}: select payment mode (order #${orderLabel})`)
        }
        const mode = draft.isWalletPayment ? "Wallet" : draft.modeOfPayment
        const needsReceiptScreenshot =
          !draft.isWalletPayment &&
          mode &&
          mode !== "Cash" &&
          mode !== "NEFT/RTGS" &&
          mode !== "UPI"
        if (needsReceiptScreenshot && !(draft.receiptPhoto && draft.receiptPhoto.length > 0)) {
          throw new Error(
            mode === "Cheque"
              ? `Row ${row}: receipt required for Cheque (order #${orderLabel})`
              : `Row ${row}: receipt required for ${mode} (order #${orderLabel})`
          )
        }
        if (mode === "UPI" && !draft.isWalletPayment && !paymentTxnOrUtrTrimmed(draft)) {
          throw new Error(`Row ${row}: UTR required for UPI (order #${orderLabel})`)
        }
        const payload = draftToApiPayload(draft)
        newPayments.push({
          paidAmount: amt,
          paymentStatus: "PENDING",
          paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
          bankName: payload.bankName || "",
          receiptPhoto: payload.receiptPhoto || [],
          modeOfPayment: payload.modeOfPayment,
          isWalletPayment: payload.isWalletPayment,
          remark: buildRemarkWithReceiptPayee(draft.remark, draft.receiptPayeeName) || "",
          utrNumber: payload.utrNumber,
          transactionId: payload.transactionId || payload.utrNumber,
          chequeNumber: payload.chequeNumber,
        })
      })

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
        freightCharges: Math.max(0, Number(freightChargesByOrderKey[k]) || 0),
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
      const payload = {
        ...processReturnedPlants(
          localDispatch,
          returnedPlants,
          damagedPlants,
          returnReasons,
          orderActions,
          paymentDraftByOrder,
          batchNumbers,
          freightChargesByOrder,
          expectedNurseryByOrder,
          nurserySites
        )
      }
      if (tripData.kmRun !== "" || tripData.rent !== "" || tripData.otherCharges !== "" || tripData.remark) {
        payload.tripData = {
          kmRun: tripData.kmRun !== "" ? Number(tripData.kmRun) : null,
          rent: tripData.rent !== "" ? Number(tripData.rent) : null,
          otherCharges: tripData.otherCharges !== "" ? Number(tripData.otherCharges) : null,
          remark: tripData.remark || "",
        }
      }
      const user = await instance.request(payload, [localDispatch?._id || dispatchData?._id])
      if (user?.data?.status) {
        Toast.success(user?.data?.message)
        // Server auto-builds complete invoice PDF after DELIVERED; refresh parent list/URLs.
        onSuccess?.()
        onClose()
        const dispatchId = String(localDispatch?._id || dispatchData?._id || "")
        if (dispatchId) {
          setTimeout(() => {
            void (async () => {
              try {
                const pdfInst = NetworkManager(API.DISPATCHED.GENERATE_PDFS)
                await pdfInst.request({ types: ["complete_invoice"] }, [dispatchId])
              } catch (e) {
                console.warn("Invoice PDF auto-generate after complete:", e?.message || e)
              }
            })()
          }, 400)
        }
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
              <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
                <button
                  type="button"
                  onClick={() => setShowQuickOrderDialog(true)}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 sm:text-sm">
                  <Zap className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Quick order
                </button>
                <button
                  type="button"
                  onClick={() => setShowReassignDialog(true)}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 sm:text-sm">
                  <Repeat className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Reassign refused
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddOrderDialog}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50 sm:text-sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Link order
                </button>
              </div>
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
                const undispatchedAtNursery = getUndispatchedAtNursery(order)
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
                const freightAmount = Math.max(0, Number(freightChargesByOrder[k]) || 0)
                const grossOrderValue = round2(rate * totalPlants + freightAmount)
                const returnCreditDelta = round2(returnedQuantity * rate)
                const damagedCreditDelta = round2(damagedQuantity * rate)
                const dispatchCreditsThisSubmit = round2(returnCreditDelta + damagedCreditDelta)
                const estimatedAfterSubmit = round2(
                  grossOrderValue - collected - dispatchCreditsThisSubmit
                )

                const payDrafts = getPaymentDraftsForOrder(k)
                const payDraftTotal = payDrafts.reduce((s, d) => s + (Number(d.paidAmount) || 0), 0)
                const payFormExpanded = Boolean(paymentFormExpandedByOrder[k])

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
                          {(order?.isFieldReassignment || order?.details?.isFieldReassignment) && (
                            <span
                              className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                              title="Created on field from a refused delivery (no slot impact)">
                              Field order
                            </span>
                          )}
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
                          title="Quick edit rate, quantity, delivery"
                          disabled={isLoading}
                          onClick={() => setEditOrderTarget(order)}
                          className="inline-flex h-fit items-center gap-0.5 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-50">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
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
                            <label className="text-[11px] font-medium text-gray-600">Freight (₹)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs"
                              placeholder="0"
                              value={freightChargesByOrder[k] != null ? freightChargesByOrder[k] : "0"}
                              onChange={(e) => handleFreightChargesChange(k, e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
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
                                {freightAmount > 0 ? ` + freight ₹${freightAmount.toLocaleString()}` : ""}
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
                        onClick={() =>
                          setPaymentFormExpandedByOrder((prev) => ({ ...prev, [k]: !payFormExpanded }))
                        }
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">
                        {payFormExpanded ? "Hide payment form" : "Add Payment"}
                      </button>
                      {payDraftTotal > 0 ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                          ₹{payDraftTotal.toLocaleString()} in {payDrafts.filter((d) => Number(d.paidAmount) > 0).length} payment
                          {payDrafts.filter((d) => Number(d.paidAmount) > 0).length !== 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {payFormExpanded && (
                        <div className="mt-3 rounded-md border border-gray-200 bg-[#fafafa] p-3">
                          <CompactPaymentForm
                            order={order.details ? { ...order.details, ...order } : order}
                            user={user}
                            balanceDue={Math.max(0, estimatedAfterSubmit)}
                            loading={isLoading || paymentReceiptBusy || paymentOcrBusy}
                            hideSubmit
                            drafts={payDrafts}
                            onDraftsChange={(drafts) => setPaymentDraftsForOrder(k, drafts)}
                            onUploadReceiptFile={uploadPaymentReceiptFiles}
                            onApplyOcr={applyOcrToPaymentDraft}
                          />
                          <p className="mt-2 text-xs leading-snug text-gray-600">
                            Saved with delivery submit · all new payments stay{" "}
                            <span className="font-medium">Pending</span>
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

            {/* Vehicle trip details — dispatch-level optional accordion */}
            <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setTripData((prev) => ({ ...prev, expanded: !prev.expanded }))}
                className="flex w-full items-center gap-1.5 text-left text-xs font-semibold text-violet-800 hover:text-violet-900">
                {tripData.expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}
                Trip settlement (km / rent)
                <span className="ml-1 font-normal text-violet-600">(optional — km, rent, charges)</span>
                {(tripData.kmRun !== "" || tripData.rent !== "" || tripData.otherCharges !== "") && (
                  <span className="ml-auto inline-flex items-center rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-medium text-violet-900">
                    filled
                  </span>
                )}
              </button>
              {tripData.expanded && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-gray-600">KM Run</label>
                      <input
                        type="number"
                        min={0}
                        className="mt-0.5 w-full rounded border border-violet-200 bg-white px-2 py-1 text-xs focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                        placeholder="km"
                        value={tripData.kmRun}
                        onChange={(e) => setTripData((prev) => ({ ...prev, kmRun: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-600">Rent (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className="mt-0.5 w-full rounded border border-violet-200 bg-white px-2 py-1 text-xs focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                        placeholder="₹"
                        value={tripData.rent}
                        onChange={(e) => setTripData((prev) => ({ ...prev, rent: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-600">Other Charges (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className="mt-0.5 w-full rounded border border-violet-200 bg-white px-2 py-1 text-xs focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                        placeholder="₹"
                        value={tripData.otherCharges}
                        onChange={(e) => setTripData((prev) => ({ ...prev, otherCharges: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-600">Remark</label>
                    <textarea
                      rows={2}
                      className="mt-0.5 w-full rounded border border-violet-200 bg-white px-2 py-1 text-xs focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                      placeholder="Optional note about this trip"
                      value={tripData.remark}
                      onChange={(e) => setTripData((prev) => ({ ...prev, remark: e.target.value }))}
                    />
                  </div>
                </div>
              )}
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
          onLinked={() => {
            void refreshAfterDispatchOrderChange()
          }}
        />
      )}

      <QuickOrderDialog
        open={showQuickOrderDialog}
        onClose={() => setShowQuickOrderDialog(false)}
        dispatchId={String(localDispatch?._id || dispatchData?._id || "")}
        dispatchLabel={`Dispatch #${localDispatch?.transportId ?? dispatchData?.transportId ?? "—"}`}
        dispatchSnapshot={localDispatch || dispatchData}
        autoSlotSelection
        onSuccess={() => {
          setShowQuickOrderDialog(false)
          void refreshAfterDispatchOrderChange()
        }}
      />

      <RefusedReassignDialog
        open={showReassignDialog}
        onClose={() => setShowReassignDialog(false)}
        dispatchData={localDispatch || dispatchData}
        onSuccess={() => {
          setShowReassignDialog(false)
          void refreshAfterDispatchOrderChange()
        }}
      />

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

      <EditOrderModal
        open={Boolean(editOrderTarget)}
        order={editOrderTarget ? orderForEditModal(editOrderTarget) : null}
        onClose={() => setEditOrderTarget(null)}
        onSuccess={async () => {
          setEditOrderTarget(null)
          const rid = localDispatch?._id || dispatchData?._id
          if (rid) await refreshDispatchPayload(String(rid))
          Toast.success("Order updated")
        }}
      />
    </>
  )
}

export default OrderCompleteDialog
