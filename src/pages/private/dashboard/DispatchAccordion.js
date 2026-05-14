import React, { useState, useEffect } from "react"
import {
  ChevronDown,
  ChevronUp,
  Truck,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  FileText,
  Trash2,
  Download
} from "lucide-react"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"
import OrderCompleteDialog from "./OrderCompleteDialog"

const DispatchAccordion = ({ 
  dispatch, 
  onRefresh, 
  onDispatchPdfFields,
  onViewDispatch, 
  onCollectSlip, 
  onDeliveryChallan, 
  onCompleteInvoice,
  onCompleteOrder, 
  onDeleteDispatch 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [relatedOrders, setRelatedOrders] = useState([])
  const [dcInvoiceByOrder, setDcInvoiceByOrder] = useState({})
  const [dcInvoiceSavingByOrder, setDcInvoiceSavingByOrder] = useState({})
  const [invoicePrefix, setInvoicePrefix] = useState("R")
  const [invoiceNext, setInvoiceNext] = useState(null)
  const [loading, setLoading] = useState(false)
  const [orderCompleteOpen, setOrderCompleteOpen] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  // Debug: Log dispatch data
  useEffect(() => {
    console.log('Dispatch data:', dispatch)
    console.log('Order Dispatch Details:', dispatch?.orderDispatchDetails)
  }, [dispatch])

  useEffect(() => {
    if (relatedOrders.length > 0) {
      console.log('Related orders updated:', relatedOrders)
      console.log('First order sample:', relatedOrders[0])
    }
  }, [relatedOrders])

  useEffect(() => {
    let cancelled = false
    const loadInvoiceSequence = async () => {
      try {
        const inst = NetworkManager(API.INVOICE_SEQUENCE.GET)
        const res = await inst.request({})
        const payload = res?.data?.data || {}
        const prefix = String(payload.prefix || "R").trim() || "R"
        const next = Number(payload.nextNumber)
        if (cancelled) return
        setInvoicePrefix(prefix)
        setInvoiceNext(Number.isFinite(next) ? next : null)
      } catch (error) {
        if (cancelled) return
        setInvoicePrefix("R")
        setInvoiceNext(null)
      }
    }
    void loadInvoiceSequence()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!Array.isArray(relatedOrders) || relatedOrders.length === 0) {
      setDcInvoiceByOrder({})
      return
    }
    setDcInvoiceByOrder((prev) => {
      const nextByOrder = {}
      let generatedCounter = Number.isFinite(invoiceNext) ? invoiceNext : 1
      relatedOrders.forEach((order) => {
        const orderKey = String(order?._id || "")
        if (!orderKey) return
        const official = String(
          order?.officialDeliveryChallanNumber ??
            order?.details?.officialDeliveryChallanNumber ??
            ""
        ).trim()
        const rawManual = String(
          order?.deliveryChallanInvoiceNumber ??
            order?.details?.deliveryChallanInvoiceNumber ??
            ""
        ).trim()
        const manualStored = official && rawManual === official ? "" : rawManual
        if (manualStored) {
          nextByOrder[orderKey] = manualStored
          return
        }
        const prevDraft = Object.prototype.hasOwnProperty.call(prev, orderKey)
          ? String(prev[orderKey] ?? "").trim()
          : ""
        if (prevDraft) {
          nextByOrder[orderKey] = prev[orderKey]
          return
        }
        if (official) {
          nextByOrder[orderKey] = ""
          return
        }
        const generated = `${invoicePrefix}${generatedCounter}`
        nextByOrder[orderKey] = generated
        generatedCounter += 1
      })
      return nextByOrder
    })
  }, [relatedOrders, invoicePrefix, invoiceNext])

  useEffect(() => {
    if (isExpanded && dispatch?.orderIds?.length > 0) {
      fetchRelatedOrders()
    }
  }, [isExpanded, dispatch])

  const fetchRelatedOrders = async (opts = {}) => {
    const silent = Boolean(opts.silent)
    try {
      if (!silent) setLoading(true)
      const orderIds = dispatch.orderIds.map((order) => order._id)

      const instance = NetworkManager(API.ORDER.GET_ORDERS)
      const response = await instance.request({}, {
        orderIds: orderIds.join(","),
        limit: 1000
      })

      console.log('Fetched related orders response:', response.data)

      const pickOfficial = (row) =>
        row?.officialDeliveryChallanNumber ??
        row?.details?.officialDeliveryChallanNumber ??
        null

      /** Keep manual `deliveryChallanInvoiceNumber` separate from system `officialDeliveryChallanNumber`. */
      const normalizeOrders = (rows) =>
        (rows || []).map((row) => {
          const official = pickOfficial(row)
          const officialStr = official != null ? String(official).trim() : ""
          let manual =
            row?.deliveryChallanInvoiceNumber ??
            row?.details?.deliveryChallanInvoiceNumber ??
            null
          if (manual != null && String(manual).trim() === "") manual = null
          if (manual != null && officialStr && String(manual).trim() === officialStr) {
            manual = null
          }
          return {
            ...row,
            officialDeliveryChallanNumber: official,
            deliveryChallanInvoiceNumber: manual,
            details: {
              ...(row.details || {}),
              ...(official ? { officialDeliveryChallanNumber: official } : {}),
              deliveryChallanInvoiceNumber: manual,
            },
          }
        })

      const raw = response.data
      let list = null
      if (raw?.data?.data && Array.isArray(raw.data.data)) list = raw.data.data
      else if (raw?.data && Array.isArray(raw.data)) list = raw.data
      else if (Array.isArray(raw)) list = raw

      if (list) {
        setRelatedOrders(normalizeOrders(list))
      } else {
        console.warn("API returned non-array data for related orders:", response.data?.data)
        setRelatedOrders([])
      }
    } catch (error) {
      console.error("Error fetching related orders:", error)
      Toast.error("Failed to load related orders")
      setRelatedOrders([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "DISPATCH_PROCESS":
        return <Clock className="text-blue-600" size={16} />
      case "DISPATCHED":
        return <Truck className="text-green-600" size={16} />
      case "COMPLETED":
        return <CheckCircle className="text-green-600" size={16} />
      case "CANCELLED":
        return <AlertCircle className="text-red-600" size={16} />
      default:
        return <Package className="text-gray-600" size={16} />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "DISPATCH_PROCESS":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "DISPATCHED":
        return "bg-green-100 text-green-800 border-green-200"
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200"
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Get dispatched quantity for a specific order from dispatch details
  const getDispatchedQuantity = (orderId) => {
    if (dispatch?.orderDispatchDetails && Array.isArray(dispatch.orderDispatchDetails)) {
      const dispatchDetail = dispatch.orderDispatchDetails.find(
        (detail) => detail.orderId?.toString() === orderId?.toString()
      )
      if (dispatchDetail) {
        console.log(`Found dispatch detail for order ${orderId}:`, dispatchDetail)
        return dispatchDetail.dispatchQuantity || 0
      }
    }
    // Fallback to plantsDetails if orderDispatchDetails not available
    if (dispatch?.plantsDetails && Array.isArray(dispatch.plantsDetails)) {
      const totalFromPlants = dispatch.plantsDetails.reduce(
        (sum, plant) => sum + (plant.quantity || 0),
        0
      )
      // Distribute evenly across orders as fallback
      const orderCount = dispatch.orderIds?.length || 1
      console.log(`Using fallback calculation for order ${orderId}: ${Math.floor(totalFromPlants / orderCount)}`)
      return Math.floor(totalFromPlants / orderCount)
    }
    console.log(`No dispatch details found for order ${orderId}, returning 0`)
    return 0
  }

  const getTotalPlants = () => {
    // Calculate total from orderDispatchDetails if available
    if (dispatch?.orderDispatchDetails && Array.isArray(dispatch.orderDispatchDetails)) {
      return dispatch.orderDispatchDetails.reduce(
        (total, detail) => total + (detail.dispatchQuantity || 0),
        0
      )
    }
    // Fallback to plantsDetails total
    if (dispatch?.plantsDetails && Array.isArray(dispatch.plantsDetails)) {
      return dispatch.plantsDetails.reduce(
        (total, plant) => total + (plant.quantity || 0),
        0
      )
    }
    return 0
  }

  const getTotalAmount = () => {
    // Calculate based on dispatched quantities and rates
    if (relatedOrders && relatedOrders.length > 0) {
      const totalAmount = relatedOrders.reduce((total, order) => {
        const dispatchedQty = getDispatchedQuantity(order._id)
        const rate = order.rate || 0
        const amount = dispatchedQty * rate
        console.log(`Order ${order.orderId}: ${dispatchedQty} plants × ₹${rate} = ₹${amount}`)
        return total + amount
      }, 0)
      console.log('Total dispatch amount:', totalAmount)
      return totalAmount
    }
    return 0
  }

  const getTotalPaid = () => {
    if (relatedOrders && relatedOrders.length > 0) {
      const totalPaid = relatedOrders.reduce((total, order) => {
        const paid = (order.payment || [])
          .filter(p => p.paymentStatus === "COLLECTED")
          .reduce((sum, p) => sum + (p.paidAmount || 0), 0)
        console.log(`Order ${order.orderId} paid: ₹${paid}`)
        return total + paid
      }, 0)
      console.log('Total paid amount:', totalPaid)
      return totalPaid
    }
    return 0
  }

  const getTotalRemaining = () => {
    return getTotalAmount() - getTotalPaid()
  }

  const handleDcInvoiceChange = (orderId, value) => {
    const key = String(orderId || "")
    if (!key) return
    setDcInvoiceByOrder((prev) => ({ ...prev, [key]: value }))
  }

  const handleDcInvoiceSave = async (order) => {
    const orderId = String(order?._id || order?.details?.orderid || "")
    if (!orderId) return
    const nextValue = String(dcInvoiceByOrder[orderId] || "").trim()
    setDcInvoiceSavingByOrder((prev) => ({ ...prev, [orderId]: true }))
    try {
      const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
      const response = await instance.request({
        id: orderId,
        deliveryChallanInvoiceNumber: nextValue === "" ? null : nextValue
      })
      if (response?.data?.status !== "Success") {
        throw new Error(response?.data?.message || "Could not update DC number")
      }
      const rejected = Array.isArray(response?.data?.rejectedFields)
        ? response.data.rejectedFields
        : []
      const dcRejected = rejected.find((r) => r?.field === "deliveryChallanInvoiceNumber")
      if (dcRejected) {
        Toast.error(dcRejected.detail || dcRejected.reason || "DC label was not saved")
        return
      }
      setRelatedOrders((prev) =>
        (prev || []).map((item) =>
          String(item?._id || "") === orderId
            ? {
                ...item,
                deliveryChallanInvoiceNumber: nextValue === "" ? null : nextValue,
                details: {
                  ...(item.details || {}),
                  deliveryChallanInvoiceNumber: nextValue === "" ? null : nextValue,
                },
              }
            : item
        )
      )
      Toast.success(`DC updated for order #${order.orderId || "—"}`)
      void fetchRelatedOrders()
      onRefresh?.()
    } catch (error) {
      Toast.error(error?.response?.data?.message || error?.message || "Failed to update DC")
    } finally {
      setDcInvoiceSavingByOrder((prev) => ({ ...prev, [orderId]: false }))
    }
  }

  const isDelivered = dispatch?.transportStatus === "DELIVERED"
  const dispatchName = (dispatch?.name || "").trim() || "Unnamed Dispatch"
  const agriLoadBlocked = Boolean(dispatch?.agriLoadBlocked)
  const agriLoadBlockedBy = Array.isArray(dispatch?.agriLoadBlockedBy) ? dispatch.agriLoadBlockedBy : []
  const dcPdfUrl = String(dispatch?.deliveryChallanPdfUrl || "").trim()
  const invPdfUrl = String(dispatch?.completeInvoicePdfUrl || "").trim()

  /** Persist manual (secondary) DC numbers typed in the order cards so server PDFs match the old flow. */
  const persistUnsavedManualDcNumbers = async () => {
    const rows = Array.isArray(relatedOrders) ? relatedOrders : []
    const updates = []
    for (const order of rows) {
      const orderId = String(order?._id || "")
      if (!orderId) continue
      const officialStr = String(
        order?.officialDeliveryChallanNumber ??
          order?.details?.officialDeliveryChallanNumber ??
          ""
      ).trim()
      const rawPersisted = String(
        order?.deliveryChallanInvoiceNumber ??
          order?.details?.deliveryChallanInvoiceNumber ??
          ""
      ).trim()
      const persisted =
        officialStr && rawPersisted === officialStr ? "" : rawPersisted
      const draft = String(dcInvoiceByOrder[orderId] ?? "").trim()
      if (draft === persisted) continue
      updates.push({ orderId, draft, order })
    }
    if (!updates.length) return
    for (const { orderId, draft } of updates) {
      const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
      const response = await instance.request({
        id: orderId,
        deliveryChallanInvoiceNumber: draft === "" ? null : draft,
      })
      if (response?.data?.status !== "Success") {
        throw new Error(response?.data?.message || `Could not save DC for order ${orderId}`)
      }
      const rejected = Array.isArray(response?.data?.rejectedFields)
        ? response.data.rejectedFields
        : []
      const dcRejected = rejected.find((r) => r?.field === "deliveryChallanInvoiceNumber")
      if (dcRejected) {
        throw new Error(
          dcRejected.detail || dcRejected.reason || `DC label was not saved for order ${orderId}`
        )
      }
    }
    setRelatedOrders((prev) =>
      (prev || []).map((item) => {
        const oid = String(item?._id || "")
        const u = updates.find((x) => x.orderId === oid)
        if (!u) return item
        const val = u.draft === "" ? null : u.draft
        return {
          ...item,
          deliveryChallanInvoiceNumber: val,
          details: {
            ...(item.details || {}),
            deliveryChallanInvoiceNumber: val,
          },
        }
      })
    )
  }

  const handleRegenerateServerPdfs = async (types) => {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      await persistUnsavedManualDcNumbers()
      if (Array.isArray(dispatch.orderIds) && dispatch.orderIds.length > 0) {
        await fetchRelatedOrders({ silent: true })
      }
      const inst = NetworkManager(API.DISPATCHED.GENERATE_PDFS)
      const res = await inst.request({ types }, [String(dispatch._id)])
      const raw = res?.data?.data ?? res?.data
      const data =
        raw && typeof raw === "object" && !Array.isArray(raw) ? raw : raw?.data
      if (data && typeof data === "object") {
        onDispatchPdfFields?.(String(dispatch._id), {
          deliveryChallanPdfUrl: data.deliveryChallanPdfUrl || "",
          deliveryChallanPdfGeneratedAt: data.deliveryChallanPdfGeneratedAt ?? null,
          completeInvoicePdfUrl: data.completeInvoicePdfUrl || "",
          completeInvoicePdfGeneratedAt: data.completeInvoicePdfGeneratedAt ?? null,
        })
      }
      Toast.success("PDF link(s) updated")
      void onRefresh?.()
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to generate PDFs"
      Toast.error(msg)
    } finally {
      setPdfBusy(false)
    }
  }

  const orderIdsForComplete =
    relatedOrders.length > 0 ? relatedOrders : dispatch.orderIds || []

  return (
    <>
    <div className={`border rounded-lg mb-4 shadow-sm ${isDelivered ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isDelivered ? 'hover:bg-green-50' : 'hover:bg-gray-50'}`}
        onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          {isDelivered ? (
            <CheckCircle className="text-green-600" size={20} />
          ) : (
            <Truck className="text-green-600" size={20} />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Dispatch #{dispatch.transportId}</h3>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                {dispatchName}
              </span>
              {isDelivered && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  DELIVERED
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {dispatch.driverName} • {dispatch.orderIds?.length || 0} orders •{" "}
              {getTotalPlants().toLocaleString()} plants dispatched
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Summary Stats */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                ₹{getTotalAmount().toLocaleString()}
              </div>
              <div className="text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">₹{getTotalPaid().toLocaleString()}</div>
              <div className="text-gray-500">Paid</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">
                ₹{getTotalRemaining().toLocaleString()}
              </div>
              <div className="text-gray-500">Remaining</div>
            </div>
          </div>

          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronUp className="text-gray-400" size={20} />
          ) : (
            <ChevronDown className="text-gray-400" size={20} />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                <div className={`grid gap-3 ${isDelivered ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-5'}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewDispatch(dispatch)
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                    <Eye size={16} className="mr-2" />
                    View
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCollectSlip(dispatch)
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                    <Download size={16} className="mr-2" />
                    Collect Slip
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (agriLoadBlocked) return
                      const dispatchWithOrders = {
                        ...dispatch,
                        orderIds: relatedOrders.length > 0 ? relatedOrders : dispatch.orderIds || []
                      }
                      onDeliveryChallan(dispatchWithOrders)
                    }}
                    disabled={agriLoadBlocked}
                    title={agriLoadBlocked ? "Agri Input pending load by Agri admin" : ""}
                    className={`inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                      agriLoadBlocked
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                    }`}>
                    <FileText size={16} className="mr-2" />
                    Delivery Challan
                  </button>
                  {isDelivered && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const dispatchWithOrders = {
                          ...dispatch,
                          orderIds: relatedOrders.length > 0 ? relatedOrders : dispatch.orderIds || []
                        }
                        onCompleteInvoice?.(dispatchWithOrders)
                      }}
                      className="inline-flex items-center justify-center px-4 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                      <Download size={16} className="mr-2" />
                      Complete Invoice
                    </button>
                  )}
                  
                  {!isDelivered && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOrderCompleteOpen(true)
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
                        <CheckCircle size={16} className="mr-2" />
                        Complete Order
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteDispatch(dispatch)
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                        <Trash2 size={16} className="mr-2" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
                {isDelivered && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle size={16} />
                      <span className="text-sm font-medium">This dispatch has been delivered and is completed.</span>
                    </div>
                  </div>
                )}
              </div>
              {agriLoadBlocked && (
                <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Agri Input pending load by Agri admin. Delivery challan is blocked until loaded.
                  {agriLoadBlockedBy.length > 0 && (
                    <span>
                      {" "}Pending: {agriLoadBlockedBy.map((row) => row.agriOrderNumber || row.agriOrderId).filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              )}

              {/* Summary Stats */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-3">Dispatch Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {getTotalPlants().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Dispatched Plants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      ₹{getTotalAmount().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Dispatch Amount</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{getTotalPaid().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Paid Amount</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      ₹{getTotalRemaining().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Remaining</div>
                  </div>
                </div>
              </div>

              {/* Orders List — compact grid: 1 col mobile, 2 tablet, 3 wide desktop */}
              <div className="min-w-0">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Related Orders</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 min-w-0">
                  {Array.isArray(relatedOrders) && relatedOrders.length > 0 ? (
                    relatedOrders.map((order) => {
                      const dispatchedQty = getDispatchedQuantity(order._id)
                      const dispatchedAmount = dispatchedQty * (order.rate || 0)
                      const additionalPlants =
                        Number(order.additionalPlants ?? order.details?.additionalPlants) || 0
                      const grossBookedPlants =
                        Number(order.totalPlants ?? order.details?.totalPlants) ||
                        (Number(order.numberOfPlants ?? order.details?.numberOfPlants) || 0) +
                          additionalPlants
                      const returnedOnOrder =
                        Number(order.returnedPlants ?? order.details?.returnedPlants) || 0
                      const damagedOnOrder =
                        Number(order.damagedPlants ?? order.details?.damagedPlants) || 0
                      const isPartialDispatch = dispatchedQty < grossBookedPlants
                      
                      // Calculate total paid from payment array
                      const totalPaid = (order.payment || [])
                        .filter(p => p.paymentStatus === "COLLECTED")
                        .reduce((sum, p) => sum + (p.paidAmount || 0), 0)
                      
                      const totalOrderAmount = grossBookedPlants * (order.rate || 0)
                      const remainingAmount = totalOrderAmount - totalPaid
                      
                      return (
                        <div
                          key={order._id}
                          className={`bg-white rounded-lg border p-2.5 hover:shadow-sm transition-shadow min-w-0 flex flex-col ${
                            isPartialDispatch ? 'border-orange-300' : 'border-gray-200'
                          }`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              {getStatusIcon(order.orderStatus)}
                              <span className="font-semibold text-sm text-gray-900">#{order.orderId}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] leading-tight border shrink-0 ${getStatusColor(
                                  order.orderStatus
                                )}`}>
                                {order.orderStatus?.replace(/_/g, " ")}
                              </span>
                              {isPartialDispatch && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
                                  Partial
                                </span>
                              )}
                            </div>
                            <div className="text-right text-[11px] shrink-0 leading-tight">
                              <div className="font-bold text-blue-600">
                                ₹{dispatchedAmount.toLocaleString()}
                              </div>
                              <div className="text-blue-600 font-semibold">
                                {dispatchedQty.toLocaleString()} plants
                              </div>
                              {isPartialDispatch && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  of {grossBookedPlants.toLocaleString()} booked
                                </div>
                              )}
                              <div className="text-[10px] text-gray-600 mt-0.5">
                                @ ₹{order.rate}/plant
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] mb-2">
                            <div className="min-w-0">
                              <span className="text-gray-500">Farmer</span>
                              <div className="font-medium text-gray-900 truncate" title={order.farmer?.name || ""}>
                                {order.farmer?.name || "N/A"}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <span className="text-gray-500">Village</span>
                              <div className="font-medium text-gray-900 truncate" title={order.farmer?.village || ""}>
                                {order.farmer?.village || "N/A"}
                              </div>
                            </div>
                            <div className="min-w-0 col-span-2">
                              <span className="text-gray-500">Plant</span>
                              <div className="font-medium text-gray-900 line-clamp-2 leading-snug">
                                {order.plantType?.name || "N/A"}
                                {order.plantSubtype?.name ? (
                                  <span className="text-gray-600"> · {order.plantSubtype.name}</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-1.5 rounded border border-gray-100 bg-gray-50/90 px-2 py-1 text-[10px] leading-snug text-gray-700">
                            <span className="font-medium text-gray-600">Plants </span>
                            booked {grossBookedPlants}
                            {additionalPlants > 0 ? (
                              <span className="text-gray-500"> ({order.numberOfPlants}+{additionalPlants})</span>
                            ) : null}
                            {returnedOnOrder > 0 ? (
                              <span className="text-green-800"> · ret {returnedOnOrder}</span>
                            ) : null}
                            {damagedOnOrder > 0 ? (
                              <span className="text-red-800"> · dmg {damagedOnOrder}</span>
                            ) : null}
                            {typeof order.remainingPlants === "number" ? (
                              <span className="text-gray-600"> · nursery {order.remainingPlants}</span>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] mb-2">
                            <div className="min-w-0">
                              <span className="text-gray-500">Slot</span>
                              <div className="font-medium text-gray-900 leading-snug line-clamp-2">
                                {order.bookingSlot?.[0]?.startDay && order.bookingSlot?.[0]?.endDay
                                  ? `${order.bookingSlot[0].startDay} – ${order.bookingSlot[0].endDay}`
                                  : "—"}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Rate</span>
                              <div className="font-medium">₹{order.rate || 0}/plant</div>
                            </div>
                          </div>

                          <div className="mb-2 rounded border border-stone-200 bg-stone-50 px-2 py-1.5">
                            {String(
                              order?.officialDeliveryChallanNumber ??
                                order?.details?.officialDeliveryChallanNumber ??
                                ""
                            ).trim() ? (
                              <div className="mb-2 pb-2 border-b border-stone-200">
                                <div className="text-[10px] font-medium text-stone-700 mb-0.5">
                                  System DC (generated)
                                </div>
                                <div className="text-[11px] font-mono font-semibold text-stone-900">
                                  {String(
                                    order?.officialDeliveryChallanNumber ??
                                      order?.details?.officialDeliveryChallanNumber ??
                                      ""
                                  ).trim()}
                                </div>
                              </div>
                            ) : null}
                            <div className="text-[10px] font-medium text-stone-700 mb-0.5">
                              Optional manual DC
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={dcInvoiceByOrder[String(order._id || "")] ?? ""}
                                onChange={(e) => handleDcInvoiceChange(order._id, e.target.value)}
                                className="w-full rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-mono"
                                placeholder={
                                  String(
                                    order?.officialDeliveryChallanNumber ??
                                      order?.details?.officialDeliveryChallanNumber ??
                                      ""
                                  ).trim()
                                    ? "e.g. secondary / sticker number"
                                    : "Enter DC number"
                                }
                              />
                              <button
                                type="button"
                                onClick={() => handleDcInvoiceSave(order)}
                                disabled={Boolean(dcInvoiceSavingByOrder[String(order._id || "")])}
                                className="shrink-0 rounded border border-stone-300 bg-white px-2 py-1 text-[10px] font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50">
                                {dcInvoiceSavingByOrder[String(order._id || "")] ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>

                          {/* Dispatch Quantity Info */}
                          {isPartialDispatch && (
                            <div className="mt-auto mb-2 pt-2 border-t border-orange-100 bg-orange-50/90 px-2 py-1.5 rounded">
                              <h5 className="font-medium text-orange-900 mb-1 text-[10px] uppercase tracking-wide">Partial</h5>
                              <div className="grid grid-cols-3 gap-1 text-[10px]">
                                <div>
                                  <span className="text-orange-700">Now</span>
                                  <div className="font-bold text-orange-900">{dispatchedQty.toLocaleString()}</div>
                                </div>
                                <div>
                                  <span className="text-orange-700">Rem</span>
                                  <div className="font-bold text-orange-900">{(order.remainingPlants || 0).toLocaleString()}</div>
                                </div>
                                <div>
                                  <span className="text-orange-700">Booked</span>
                                  <div className="font-bold text-orange-900">{grossBookedPlants.toLocaleString()}</div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Dispatch History for this order */}
                          {order.dispatchHistory && order.dispatchHistory.length > 0 && (
                            <div className="mt-auto mb-2 pt-2 border-t border-blue-100 bg-blue-50/80 px-2 py-1.5 rounded">
                              <h5 className="font-medium text-blue-900 mb-1 text-[10px]">
                                Trail ({order.dispatchHistory.length})
                              </h5>
                              <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
                                {order.dispatchHistory.map((dispatch, idx) => (
                                  <div key={idx} className="bg-white px-1.5 py-1 rounded border border-blue-200 text-[10px] leading-snug">
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                      <span className="font-semibold text-blue-700 shrink-0">
                                        {dispatch.quantity} plants
                                      </span>
                                      <span className="text-gray-500 shrink-0">
                                        {moment(dispatch.date).format("DD/MM HH:mm")}
                                      </span>
                                    </div>
                                    {dispatch.dispatch && (
                                      <div className="text-gray-600 line-clamp-2">
                                        #{dispatch.dispatch.transportId} · {dispatch.dispatch.vehicleName || dispatch.dispatch.driverName}
                                      </div>
                                    )}
                                    {!dispatch.dispatch && (dispatch.vehicleName || dispatch.driverName) && (
                                      <div className="text-gray-600 line-clamp-2">
                                        {dispatch.vehicleName || ""}{dispatch.vehicleName && dispatch.driverName ? " · " : ""}{dispatch.driverName || ""}
                                      </div>
                                    )}
                                    <div className="text-gray-600">
                                      After: {dispatch.remainingAfterDispatch} plants
                                    </div>
                                    {dispatch.processedBy && (
                                      <div className="text-gray-500 truncate">
                                        {dispatch.processedBy.name}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Payment Summary */}
                          <div className="mt-auto pt-2 border-t border-gray-100">
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                              <div>
                                <span className="text-gray-500">Order ₹</span>
                                <div className="font-semibold text-gray-900">
                                  ₹{totalOrderAmount.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Paid</span>
                                <div className="font-semibold text-green-600">
                                  ₹{totalPaid.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Due</span>
                                <div className="font-semibold text-red-600">
                                  ₹{remainingAmount.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Payment</span>
                                <div className="font-medium truncate" title={order.paymentCompleted ? "Completed" : "Pending"}>
                                  {order.paymentCompleted ? "Complete" : "Pending"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="col-span-full bg-white rounded-lg border border-gray-200 p-6 text-center">
                      <div className="text-gray-500 mb-1 text-sm">No related orders found</div>
                      <div className="text-xs text-gray-400">
                        This dispatch has no associated orders
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-1">PDF (server)</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Enter manual DC numbers on each order above (when there is no system DC), then Save — or use
                  Regenerate: any unsaved manual DC values are saved first, then the PDF is built from the server
                  (same labels as the browser preview).
                </p>
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-gray-600 shrink-0">Delivery challan</span>
                    {dcPdfUrl ? (
                      <a
                        href={dcPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}>
                        Open
                      </a>
                    ) : (
                      <span className="text-gray-400">Not generated</span>
                    )}
                    <button
                      type="button"
                      disabled={pdfBusy || agriLoadBlocked}
                      title={agriLoadBlocked ? "Agri Input pending load" : ""}
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleRegenerateServerPdfs(["delivery_challan"])
                      }}
                      className="text-purple-700 hover:underline disabled:opacity-40 disabled:cursor-not-allowed">
                      {pdfBusy ? "Working…" : "Regenerate"}
                    </button>
                  </div>
                  {isDelivered ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2">
                      <span className="text-gray-600 shrink-0">Complete invoice</span>
                      {invPdfUrl ? (
                        <a
                          href={invPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}>
                          Open
                        </a>
                      ) : (
                        <span className="text-gray-400">Not generated</span>
                      )}
                      <button
                        type="button"
                        disabled={pdfBusy}
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleRegenerateServerPdfs(["complete_invoice"])
                        }}
                        className="text-slate-700 hover:underline disabled:opacity-40">
                        {pdfBusy ? "Working…" : "Regenerate"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    <OrderCompleteDialog
      open={orderCompleteOpen}
      onClose={() => setOrderCompleteOpen(false)}
      dispatchData={{
        ...dispatch,
        orderIds: orderIdsForComplete
      }}
      onSuccess={() => {
        onRefresh?.()
        onCompleteOrder?.(dispatch)
      }}
    />
    </>
  )
}

export default DispatchAccordion
