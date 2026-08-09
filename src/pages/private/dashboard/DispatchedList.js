import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { NetworkManager, API } from "network/core"
import { Truck, Search, User, Package } from "lucide-react"
import DispatchForm from "./DispatchedForm"
import CollectSlipPDF from "./CollectSlipPDF"
import DeliveryChallanPDF from "./DeliveryChallan"
import RamBiotechInvoicePDF from "./RamBiotechInvoicePDF.js"
import { useInvoiceAadharPrompt } from "../DispatchedVehicles/useInvoiceAadharPrompt"
import OrderCompleteDialog from "./OrderCompleteDialog"
import DispatchAccordion from "./DispatchAccordion"
import DispatchDateFilter from "../DispatchedVehicles/DispatchDateFilter"
import {
  groupDispatchesByDate,
  resolveDatePresetRange,
} from "../DispatchedVehicles/dispatchVehiclesUtils"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"
const DISPATCH_PAGE_SIZE = 20
const DEFAULT_DATE_PRESET = "last7"

/** Parse GET /dispatched/:id body (handles generateResponse nesting). */
function parseDispatchFromGetByIdResponse(res) {
  const raw = res?.data?.data ?? res?.data
  if (raw && raw._id && typeof raw === "object" && !Array.isArray(raw)) return raw
  const inner = raw?.data
  if (inner && inner._id && typeof inner === "object" && !Array.isArray(inner)) return inner
  return null
}

/**
 * Merge list-row dispatch with GET_BY_ID payload while keeping list-shaped `orderIds`
 * (so CollectSlip / transformDispatchForForm keep working) but overlay fresh DC, payment, farmer.
 */
function mergeDispatchWithFreshDetail(listRow, freshDetail) {
  if (!freshDetail?._id) return listRow
  const freshOrders = Array.isArray(freshDetail.orderIds) ? freshDetail.orderIds : []
  const byId = new Map(freshOrders.map((o) => [String(o?._id ?? ""), o]))
  const mergedOrderIds = (Array.isArray(listRow.orderIds) ? listRow.orderIds : []).map((o) => {
    const id = String(o?._id ?? o?.details?.orderid ?? o?.details?.orderId ?? "")
    const f = id ? byId.get(id) : null
    if (!f) return o
    const fromFresh =
      f.deliveryChallanInvoiceNumber != null && String(f.deliveryChallanInvoiceNumber).trim() !== ""
        ? String(f.deliveryChallanInvoiceNumber).trim()
        : ""
    const fromDetails = o.details?.deliveryChallanInvoiceNumber
    const dcVal = fromFresh || (fromDetails != null ? String(fromDetails).trim() : "")
    const fromFreshOff =
      f.officialDeliveryChallanNumber != null &&
      String(f.officialDeliveryChallanNumber).trim() !== ""
        ? String(f.officialDeliveryChallanNumber).trim()
        : ""
    const fromDetailsOff = o.details?.officialDeliveryChallanNumber
    const offVal =
      fromFreshOff ||
      (fromDetailsOff != null ? String(fromDetailsOff).trim() : "")
    const farmer =
      f.farmer && typeof f.farmer === "object"
        ? {
            name: f.farmer.name,
            mobileNumber: f.farmer.mobileNumber,
            village: f.farmer.village,
          }
        : o.details?.farmer
    const freightVal =
      f.freightCharges != null && f.freightCharges !== ""
        ? Math.max(0, Number(f.freightCharges) || 0)
        : null
    return {
      ...o,
      ...(dcVal ? { deliveryChallanInvoiceNumber: dcVal } : {}),
      ...(offVal ? { officialDeliveryChallanNumber: offVal } : {}),
      ...(freightVal != null ? { freightCharges: freightVal } : {}),
      details: {
        ...(o.details || {}),
        ...(dcVal ? { deliveryChallanInvoiceNumber: dcVal } : {}),
        ...(offVal ? { officialDeliveryChallanNumber: offVal } : {}),
        ...(Array.isArray(f.payment) ? { payment: f.payment } : {}),
        ...(farmer ? { farmer } : {}),
        ...(freightVal != null ? { freightCharges: freightVal } : {}),
      },
    }
  })
  return {
    ...listRow,
    ...freshDetail,
    plantsDetails: freshDetail.plantsDetails ?? listRow.plantsDetails,
    orderDispatchDetails: freshDetail.orderDispatchDetails ?? listRow.orderDispatchDetails,
    transportStatus: freshDetail.transportStatus ?? listRow.transportStatus,
    orderIds: mergedOrderIds,
  }
}

function normalizeDispatchListOrder(entry, dispatch) {
  const det = entry?.details || {}
  const farmer = det.farmer || {}
  const qty = Number(entry.quantity ?? entry.numberOfPlants ?? 0)
  const rate = Number(entry.rate ?? 0)
  const plantLines = Array.isArray(entry.plantLineItems)
    ? entry.plantLineItems
    : Array.isArray(det.plantLineItems)
      ? det.plantLineItems
      : []
  const firstLine = plantLines[0]
  const plantName =
    firstLine?.plantNameSnapshot ||
    entry.plantDetails?.name ||
    entry.plantType?.name ||
    "—"
  const plantSubtype =
    firstLine?.plantSubtypeSnapshot ||
    entry.plantDetails?.subtype ||
    entry.plantSubtype?.name ||
    ""
  const plantLabel =
    plantLines.length > 1
      ? `${[plantName, plantSubtype].filter(Boolean).join(" · ")} +${plantLines.length - 1} more`
      : [plantName, plantSubtype].filter(Boolean).join(" · ") || "—"
  return {
    orderMongoId: String(entry._id ?? det.orderid ?? ""),
    orderId: entry.order ?? entry.orderId ?? "—",
    farmerName: entry.farmerName || farmer.name || "—",
    farmerMobile: entry.contact || farmer.mobileNumber || "",
    village: farmer.village || "",
    plantName,
    plantSubtype,
    plantLabel,
    plantLineItems: plantLines,
    quantity: qty,
    rate,
    amount: qty * rate,
    orderStatus: entry.orderStatus || "",
    dispatchId: String(dispatch?._id || ""),
    transportId: dispatch?.transportId ?? "—",
    driverName: dispatch?.driverName || "",
  }
}

function collectDispatchSearchHits(dispatches = []) {
  const hits = []
  const seen = new Set()
  for (const dispatch of dispatches) {
    for (const entry of dispatch.orderIds || []) {
      const row = normalizeDispatchListOrder(entry, dispatch)
      if (!row.orderMongoId || seen.has(row.orderMongoId)) continue
      seen.add(row.orderMongoId)
      hits.push(row)
    }
  }
  return hits
}

const DispatchList = ({ setisDispatchtab, viewMode, refresh, hideHeader = false, dispatchSearch = "" }) => {
  const initialRange = resolveDatePresetRange(DEFAULT_DATE_PRESET)
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [dispatchHasMore, setDispatchHasMore] = useState(true)
  const [datePreset, setDatePreset] = useState(DEFAULT_DATE_PRESET)
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const [selectedDispatch, setSelectedDispatch] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState(null)
  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false)
  const [isCollectSlipOpen, setIsCollectSlipOpen] = useState(false)
  const [isDCOpen, setIsDCOpen] = useState(false)
  const [isRamInvoiceOpen, setIsRamInvoiceOpen] = useState(false)
  const [invoiceAadharByOrderId, setInvoiceAadharByOrderId] = useState({})
  const [isOrderCompleteOpen, setIsOrderCompleteOpen] = useState(false)
  const { prompt: promptInvoiceAadhar, dialog: invoiceAadharDialog } = useInvoiceAadharPrompt()

  const enrichDispatchLoadStatus = useCallback(async (dispatchRows = []) => {
    if (!Array.isArray(dispatchRows) || dispatchRows.length === 0) return []
    const allHaveFlags = dispatchRows.every((d) => typeof d.agriLoadBlocked === "boolean")
    if (allHaveFlags) return dispatchRows

    const allOrderIds = []
    for (const dispatch of dispatchRows) {
      for (const entry of dispatch.orderIds || []) {
        if (entry == null) continue
        if (typeof entry === "object") {
          let id = entry._id ?? entry.id ?? null
          if (id == null || id === "") {
            const det = entry.details
            if (det && typeof det === "object") {
              id = det.orderid ?? det.orderId ?? null
            }
          }
          if (id) allOrderIds.push(String(id))
        } else {
          allOrderIds.push(String(entry))
        }
      }
    }
    const uniqueOrderIds = [...new Set(allOrderIds)]
    if (uniqueOrderIds.length === 0) {
      return dispatchRows.map((d) => ({ ...d, agriLoadBlocked: false, agriLoadBlockedBy: [] }))
    }

    try {
      const instance = NetworkManager(API.INVENTORY.GET_DISPATCH_LOAD_STATUS)
      const response = await instance.request({ orderIds: uniqueOrderIds })
      const data = response?.data?.data || {}
      const blockedBy = Array.isArray(data.blockedBy) ? data.blockedBy : []

      return dispatchRows.map((dispatch) => {
        const dispatchOrderIds = (dispatch.orderIds || [])
          .map((entry) => {
            if (entry == null) return null
            if (typeof entry === "object") {
              return String(entry._id ?? entry.id ?? entry.details?.orderid ?? "")
            }
            return String(entry)
          })
          .filter(Boolean)
        const dispatchBlockedBy = blockedBy.filter((row) =>
          dispatchOrderIds.includes(String(row?.linkedNurseryOrderId ?? row?.nurseryOrderId ?? ""))
        )
        return {
          ...dispatch,
          agriLoadBlocked: dispatchBlockedBy.length > 0,
          agriLoadBlockedBy: dispatchBlockedBy,
        }
      })
    } catch (error) {
      return dispatchRows.map((d) => ({ ...d, agriLoadBlocked: false, agriLoadBlockedBy: [] }))
    }
  }, [])

  const loadDispatchPage = useCallback(async (page) => {
    const instance = NetworkManager(API.DISPATCHED.GET_TRAYS)
    const query = { paged: "1", page, limit: DISPATCH_PAGE_SIZE }
    const q = String(dispatchSearch || "").trim()
    if (q) query.search = q
    else if (startDate && endDate) {
      query.startDate = startDate
      query.endDate = endDate
    }
    const response = await instance.request({}, query)
    const rows = Array.isArray(response.data?.data) ? response.data.data : []
    const pag = response.data?.pagination
    const totalPages = Number(pag?.pages)
    const curPage = Number(pag?.page) || page
    let more = true
    if (Number.isFinite(totalPages) && totalPages > 0) {
      more = curPage < totalPages
    } else if (Number.isFinite(Number(pag?.total))) {
      const loadedSoFar = (curPage - 1) * DISPATCH_PAGE_SIZE + rows.length
      more = loadedSoFar < Number(pag.total)
    } else {
      more = rows.length >= DISPATCH_PAGE_SIZE
    }
    return { rows, curPage, more }
  }, [dispatchSearch, endDate, startDate])

  const handleDatePreset = useCallback((presetId) => {
    const range = resolveDatePresetRange(presetId)
    setDatePreset(presetId)
    setStartDate(range.startDate)
    setEndDate(range.endDate)
  }, [])

  const handleDateRangeChange = useCallback((from, to, preset = "custom") => {
    setDatePreset(preset)
    setStartDate(from)
    setEndDate(to)
  }, [])

  const refreshList = useCallback(async () => {
    setLoading(true)
    try {
      pageRef.current = 1
      hasMoreRef.current = true
      setDispatchHasMore(true)
      const { rows, curPage, more } = await loadDispatchPage(1)
      pageRef.current = curPage
      hasMoreRef.current = more
      setDispatchHasMore(more)
      const enriched = await enrichDispatchLoadStatus(rows)
      setDispatches(enriched)
      setisDispatchtab(enriched[0])
    } catch (error) {
      console.error("Error fetching dispatches:", error)
    } finally {
      setLoading(false)
    }
  }, [enrichDispatchLoadStatus, loadDispatchPage, setisDispatchtab])

  const patchDispatchPdfFields = useCallback((dispatchId, patch) => {
    setDispatches((prev) =>
      prev.map((d) => (String(d._id) === String(dispatchId) ? { ...d, ...patch } : d))
    )
  }, [])

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current) return
    setLoadingMore(true)
    try {
      const nextPage = pageRef.current + 1
      const { rows, curPage, more } = await loadDispatchPage(nextPage)
      pageRef.current = curPage
      hasMoreRef.current = more
      setDispatchHasMore(more)
      const enriched = await enrichDispatchLoadStatus(rows)
      setDispatches((prev) => {
        const seen = new Set(prev.map((d) => String(d._id)))
        const extra = enriched.filter((d) => !seen.has(String(d._id)))
        return [...prev, ...extra]
      })
    } catch (error) {
      console.error("Error loading more dispatches:", error)
    } finally {
      setLoadingMore(false)
    }
  }, [enrichDispatchLoadStatus, loadDispatchPage])

  useEffect(() => {
    void refreshList()
    setIsCollectSlipOpen(false)
    setIsDCOpen(false)
    setIsRamInvoiceOpen(false)
    setIsDispatchFormOpen(false)
    setIsOrderCompleteOpen(false)
  }, [viewMode, dispatchSearch, startDate, endDate, refreshList])

  const searchTrim = String(dispatchSearch || "").trim()
  const searchActive = searchTrim.length >= 2

  const dateGroups = useMemo(() => groupDispatchesByDate(dispatches), [dispatches])

  const searchHits = useMemo(() => {
    if (!searchActive) return []
    return collectDispatchSearchHits(dispatches)
  }, [dispatches, searchActive])

  const searchDispatchIds = useMemo(
    () => new Set(searchHits.map((h) => h.dispatchId).filter(Boolean)),
    [searchHits]
  )

  const [focusedOrderId, setFocusedOrderId] = useState(null)

  useEffect(() => {
    setFocusedOrderId(null)
  }, [dispatchSearch])

  const scrollToDispatch = useCallback((dispatchId, orderMongoId) => {
    if (orderMongoId) setFocusedOrderId(String(orderMongoId))
    const el = document.getElementById(`dispatch-accordion-${dispatchId}`)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    el.dataset.highlightOrder = orderMongoId || ""
    el.classList.add("ring-2", "ring-teal-400", "ring-offset-2")
    window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-teal-400", "ring-offset-2")
      delete el.dataset.highlightOrder
    }, 2400)
  }, [])

  /** Build DispatchForm `selectedOrders` Map from GET /dispatched/:id payload. */
  const transformGetDispatchToMap = (d) => {
    const m = new Map()
    const rows = Array.isArray(d?.orderIds) ? d.orderIds : []
    for (const o of rows) {
      const id = o?._id
      if (!id) continue
      const subtypes = Array.isArray(o.plantName?.subtypes) ? o.plantName.subtypes : []
      const stName =
        subtypes.find((s) => String(s?._id) === String(o.plantSubtype))?.name || "Unknown"
      const cavity = o.cavity
      const cavityIdRaw =
        typeof cavity === "object" && cavity?._id != null
          ? String(cavity._id)
          : cavity != null
          ? String(cavity)
          : ""
      const qty = Number(o.numberOfPlants || 0) + Number(o.additionalPlants || 0)
      m.set(String(id), {
        order: o.orderId,
        farmerName: o.farmer?.name || "Unknown",
        plantType: `${o.plantName?.name || "Unknown"} -> ${stName}`,
        quantity: qty,
        orderDate: o.orderBookingDate ? moment(o.orderBookingDate).format("DD-MM-YYYY") : "",
        rate: o.rate,
        total: qty * Number(o.rate || 0),
        "Paid Amt": 0,
        "remaining Amt": 0,
        orderStatus: o.orderStatus,
        Delivery: o.deliveryDate ? moment(o.deliveryDate).format("DD-MM-YYYY") : "",
        details: {
          farmer: o.farmer || {},
          orderid: id,
          remainingPlants: Number(o.remainingPlants ?? qty),
          plantID: o.plantName?._id || o.plantName,
          plantSubtypeID: o.plantSubtype,
          cavity: cavity ?? null,
          cavityId: cavityIdRaw || undefined,
          cavityName:
            (typeof cavity === "object" && cavity?.name) || (cavityIdRaw ? "Tray" : ""),
        },
      })
    }
    return m
  }

  const transformDispatchForForm = (dispatchData) => {
    const plants = dispatchData.plantsDetails?.map((plant) => {
      const plantOrders = dispatchData.orderIds?.map((order) => {
        const firstPickup =
          Array.isArray(plant.pickupDetails) && plant.pickupDetails.length > 0
            ? plant.pickupDetails[0]
            : null
        return {
          order: order.order,
          farmerName: order.farmerName,
          plantType: plant.name,
          quantity: order.quantity,
          orderDate: order.orderDate,
          rate: order.rate,
          total: order.total,
          "Paid Amt": order["Paid Amt"],
          "remaining Amt": order["remaining Amt"],
          orderStatus: order.orderStatus,
          Delivery: order.Delivery,
          details: {
            ...(order.details || {}),
            farmer: order.details?.farmer || {},
            plantID: plant.plantId,
            plantSubtypeID: plant.subTypeId,
            cavityName:
              order.details?.cavityName ??
              firstPickup?.cavityName,
            cavityId:
              order.details?.cavityId ??
              (order.details?.cavity && typeof order.details.cavity === "object"
                ? order.details.cavity._id ?? order.details.cavity.id
                : undefined) ??
              firstPickup?.cavity
          }
        }
      })
      
      return {
        id: plant.id,
        name: plant.name,
        quantity: plant.quantity,
        pickupDetails: plant.pickupDetails?.map((pickup) => ({
          shade: pickup.shade,
          quantity: pickup.quantity,
          shadeName: pickup.shadeName,
          cavityName: pickup.cavityName,
          cavity: pickup.cavity,
          cavitySize: pickup.cavitySize,
          numberPerCrate: pickup.numberPerCrate
        })),
        crates: plant.crates?.map((crate) => ({
          cavity: crate.cavity,
          cavityName: crate.cavityName,
          cavitySize: crate.cavitySize,
          numberPerCrate: crate.numberPerCrate,
          crateCount: crate.crateCount,
          plantCount: crate.plantCount,
          crateDetails: crate.crateDetails || []
        })),
        orders: plantOrders
      }
    })

    return {
      _id: dispatchData._id,
      name: dispatchData.name || "",
      driverName: dispatchData.driverName,
      driverMobile: dispatchData.driverMobile,
      vehicleName: dispatchData.vehicleName,
      transportId: dispatchData.transportId,
      plants: plants,
      orderIds: Array.isArray(dispatchData.orderIds) ? dispatchData.orderIds : [],
      orderDispatchDetails: Array.isArray(dispatchData.orderDispatchDetails)
        ? dispatchData.orderDispatchDetails
        : []
    }
  }
  const handleOrderComplete = (dispatch, e) => {
    e.stopPropagation()
    
    // Calculate payment check based on dispatched quantities, not total order
    const incompletePayments = dispatch.orderIds.filter((order) => {
      // Find the dispatched quantity for this order from orderDispatchDetails
      const dispatchDetail = dispatch.orderDispatchDetails?.find(
        (detail) => detail.orderId?.toString() === order._id?.toString()
      )
      
      // If no dispatch detail found, use dispatched plants (fallback)
      const dispatchedQty = dispatchDetail?.dispatchQuantity || 
        (dispatch.plantsDetails?.reduce((sum, plant) => sum + (plant.quantity || 0), 0) / dispatch.orderIds.length) || 0
      
      // Calculate required payment based on dispatched quantity
      const dispatchedAmount = dispatchedQty * (order.rate || 0)
      
      // Get total paid amount
      const totalPaid = order["Paid Amt"] || 0
      
      // Check if payment is sufficient for dispatched plants
      return totalPaid < dispatchedAmount
    })

    if (incompletePayments.length > 0) {
      // Create error message with order details
      const errorMessage = incompletePayments
        .map((order) => {
          const dispatchDetail = dispatch.orderDispatchDetails?.find(
            (detail) => detail.orderId?.toString() === order._id?.toString()
          )
          const dispatchedQty = dispatchDetail?.dispatchQuantity || 
            (dispatch.plantsDetails?.reduce((sum, plant) => sum + (plant.quantity || 0), 0) / dispatch.orderIds.length) || 0
          const dispatchedAmount = dispatchedQty * (order.rate || 0)
          
          return `Order #${order.order} - ${order.farmerName}: Payment incomplete for dispatched plants\n` +
            `Dispatched: ${dispatchedQty} plants × ₹${order.rate} = ₹${dispatchedAmount}\n` +
            `Paid Amount: ₹${order["Paid Amt"] || 0}\n` +
            `Required for dispatch: ₹${dispatchedAmount}`
        })
        .join("\n\n")

      Toast.error("Cannot complete order due to pending payments:\n" + errorMessage)
      return
    }
    setSelectedDispatch(dispatch)
    setIsOrderCompleteOpen(true)
  }

  function transformDataToMap(data) {
    const map = new Map()

    data.orderIds.forEach((order) => {
      const {
        details: { farmer, contact, orderid, salesPerson, bookingSlot, payment },
        plantDetails,
        quantity,
        rate,
        total,
        remainingAmt,
        PaidAmt,
        orderStatus,
        orderDate
      } = order

      // Construct delivery string
      const delivery =
        bookingSlot.startDay && bookingSlot.endDay && bookingSlot.month
          ? `${bookingSlot.startDay} - ${bookingSlot.endDay} ${
              bookingSlot.month
            }, ${new Date().getFullYear()}`
          : ""

      // Create a transformed object for each order
      const transformedOrder = {
        order: order.order,
        farmerName: farmer.name,
        plantType: plantDetails.name,
        quantity: quantity,
        orderDate: orderDate,
        rate: rate,
        total: total,
        "Paid Amt": PaidAmt,
        "remaining Amt": remainingAmt,
        orderStatus: orderStatus,
        Delivery: delivery,
        details: {
          farmer: {
            name: farmer.name,
            mobileNumber: farmer.mobileNumber,
            village: farmer.village
          },
          contact: contact,
          orderNotes: order.details.orderNotes || "",
          payment: payment,
          orderid: orderid,
          salesPerson: {
            name: salesPerson.name,
            phoneNumber: salesPerson.phoneNumber
          },
          plantID: order.details.bookingSlot.plantId || "",
          plantSubtypeID: order.details.bookingSlot.subtypeId || "",
          cavityId: order.cavity || order.details?.cavity || order.details?.cavityId,
          bookingSlot: {
            slotId: bookingSlot._id || "",
            startDay: bookingSlot.startDay || "",
            endDay: bookingSlot.endDay || "",
            subtypeId: bookingSlot.subtypeId || "",
            month: bookingSlot.month || ""
          }
        }
      }

      // Add to the map with the order ID as the key
      map.set(orderid, transformedOrder)
    })

    return map
  }

  // Example usage

  const handleDialogOpen = (type, dispatch, e) => {
    e.stopPropagation() // Prevent the event from bubbling up

    // Prevent multiple opens by checking if already open
    if (
      isCollectSlipOpen ||
      isDCOpen ||
      isDispatchFormOpen ||
      isOrderCompleteOpen ||
      isRamInvoiceOpen
    ) {
      return
    }

    switch (type) {
      case "view": {
        const openView = async () => {
          try {
            const inst = NetworkManager(API.DISPATCHED.GET_BY_ID)
            const res = await inst.request({}, [String(dispatch._id)])
            const raw = res?.data?.data ?? res?.data
            const d = raw && raw._id ? raw : raw?.data
            const merged = d?._id ? { ...dispatch, ...d } : dispatch
            const fd = transformDispatchForForm(merged)
            setSelectedDispatch(fd)
            setSelectedOrders(d?._id ? transformGetDispatchToMap(d) : transformDataToMap(merged))
            setIsDispatchFormOpen(true)
          } catch (err) {
            console.error("getDispatch for edit:", err)
            const fd = transformDispatchForForm(dispatch)
            setSelectedDispatch(fd)
            setSelectedOrders(transformDataToMap(dispatch))
            setIsDispatchFormOpen(true)
          }
        }
        void openView()
        break
      }
      case "collectSlip": {
        const openCollectSlip = async () => {
          try {
            const inst = NetworkManager(API.DISPATCHED.GET_BY_ID)
            const res = await inst.request({}, [String(dispatch._id)])
            const d = parseDispatchFromGetByIdResponse(res)
            const merged = mergeDispatchWithFreshDetail(dispatch, d || {})
            const fd = transformDispatchForForm(merged)
            setSelectedDispatch(fd)
            setIsCollectSlipOpen(true)
          } catch (err) {
            console.error("getDispatch for collect slip:", err)
            setSelectedDispatch(transformDispatchForForm(dispatch))
            setIsCollectSlipOpen(true)
          }
        }
        void openCollectSlip()
        break
      }
      case "dc": {
        const openDc = async () => {
          try {
            const inst = NetworkManager(API.DISPATCHED.GET_BY_ID)
            const res = await inst.request({}, [String(dispatch._id)])
            const d = parseDispatchFromGetByIdResponse(res)
            const merged = mergeDispatchWithFreshDetail(dispatch, d || {})
            setSelectedDispatch(merged)
            setIsDCOpen(true)
          } catch (err) {
            console.error("getDispatch for delivery challan:", err)
            setSelectedDispatch(dispatch)
            setIsDCOpen(true)
          }
        }
        void openDc()
        break
      }
      case "completeInvoice":
      case "ramInvoice": {
        const openRam = async () => {
          try {
            const inst = NetworkManager(API.DISPATCHED.GET_BY_ID)
            const res = await inst.request({}, [String(dispatch._id)])
            const d = parseDispatchFromGetByIdResponse(res)
            const merged = mergeDispatchWithFreshDetail(dispatch, d || {})
            const { confirmed, aadharByOrderId } = await promptInvoiceAadhar(merged)
            if (!confirmed) return
            setInvoiceAadharByOrderId(aadharByOrderId || {})
            setSelectedDispatch(merged)
            setIsRamInvoiceOpen(true)
          } catch (err) {
            console.error("getDispatch for ram invoice:", err)
            const { confirmed, aadharByOrderId } = await promptInvoiceAadhar(dispatch)
            if (!confirmed) return
            setInvoiceAadharByOrderId(aadharByOrderId || {})
            setSelectedDispatch(dispatch)
            setIsRamInvoiceOpen(true)
          }
        }
        void openRam()
        break
      }
      default:
        break
    }
  }

  const handleDialogOpenView = (type, dispatch, e) => {
    e.stopPropagation()
    handleDialogOpen("view", dispatch, { stopPropagation: () => {} })
  }

  const handleDelete = async (dispatch) => {
    if (
      !window.confirm(
        "Remove this transport and restore orders to farm ready queue? This cannot be undone."
      )
    ) {
      return
    }
    try {
      const instance = NetworkManager(API.DISPATCHED.DELETE_TRANSPORT)
      await instance.request({}, [dispatch.transportId])
      Toast.success("Transport removed.")
      void refreshList()
      if (typeof refresh === "function") refresh()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dispatchCreated"))
      }
    } catch (error) {
      console.error("Error deleting dispatch:", error)
      Toast.error(error?.response?.data?.message || error?.message || "Failed to remove transport")
    }
  }
  const getStatusChipStyles = (status) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800 border-green-200"
      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200"
      default: // PENDING
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
  }
  const handleRowClick = (dispatch, e) => {
    // Don't open the view dialog if clicked on any button or if a dialog is already open
    if (
      e.target.closest("button") ||
      isDispatchFormOpen ||
      isCollectSlipOpen ||
      isDCOpen ||
      isRamInvoiceOpen ||
      isOrderCompleteOpen
    ) {
      return
    }

    // Only open the view dialog if nothing else is open
    handleDialogOpenView("view", dispatch, e)
  }

  if (viewMode !== "dispatch_process") {
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px] px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <>
        <div className="space-y-4 px-4 py-3 border-b border-gray-100">
          {!hideHeader && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Dispatch List</h2>
              <button
                type="button"
                onClick={() => void refreshList()}
                className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                Refresh List
              </button>
            </div>
          )}

          <DispatchDateFilter
            startDate={startDate}
            endDate={endDate}
            activePreset={datePreset}
            onPreset={handleDatePreset}
            onRangeChange={handleDateRangeChange}
          />

          {searchActive && !loading ? (
            searchHits.length > 0 ? (
              <div className="mb-4 rounded-xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 to-white p-3 shadow-sm">
                <div className="mb-2 flex items-start gap-2">
                  <Search className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-teal-800">
                      Search matches for &ldquo;{searchTrim}&rdquo;
                    </p>
                    <p className="text-sm text-teal-900">
                      {searchHits.length} order{searchHits.length !== 1 ? "s" : ""} in{" "}
                      {searchDispatchIds.size} dispatch
                      {searchDispatchIds.size !== 1 ? "es" : ""}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {searchHits.slice(0, 3).map((hit) => (
                    <button
                      key={hit.orderMongoId}
                      type="button"
                      onClick={() => scrollToDispatch(hit.dispatchId, hit.orderMongoId)}
                      className="rounded-lg border border-teal-200 bg-white p-3 text-left shadow-sm transition hover:border-teal-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-gray-900">#{hit.orderId}</span>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                          Dispatch #{hit.transportId}
                        </span>
                      </div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-800">
                        <User className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                        <span className="truncate font-medium" title={hit.farmerName}>
                          {hit.farmerName}
                        </span>
                      </div>
                      {hit.farmerMobile ? (
                        <p className="mb-1 text-[11px] text-gray-600">{hit.farmerMobile}</p>
                      ) : null}
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
                        <Package className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                        <span className="line-clamp-1" title={hit.plantLabel || hit.plantName}>
                          {hit.plantLabel ||
                            [hit.plantName, hit.plantSubtype].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-blue-700">
                        {hit.quantity.toLocaleString()} plants · ₹{hit.amount.toLocaleString()}
                      </p>
                      {hit.driverName ? (
                        <p className="mt-0.5 truncate text-[10px] text-gray-500">{hit.driverName}</p>
                      ) : null}
                    </button>
                  ))}
                </div>
                {searchHits.length > 3 ? (
                  <p className="mt-2 text-center text-xs font-semibold text-teal-800">
                    +{searchHits.length - 3} more order{searchHits.length - 3 !== 1 ? "s" : ""} in
                    the dispatch list below
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No dispatches found for &ldquo;{searchTrim}&rdquo;. Try order ID, farmer name,
                mobile, or transport #.
              </div>
            )
          ) : null}

          {dispatches.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="text-gray-400 mx-auto mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Dispatches Found</h3>
              <p className="text-gray-500">
                {searchActive
                  ? `No loading dispatches match "${searchTrim}".`
                  : startDate && endDate
                    ? `No dispatches between ${startDate} and ${endDate}.`
                    : "No dispatches are currently in process."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {dateGroups.map((group) => (
                <section key={group.dateKey} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <h3 className="text-sm font-bold text-gray-800">{group.label}</h3>
                    <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      {group.rows.length} dispatch{group.rows.length === 1 ? "" : "es"}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {group.rows.map((dispatch) => (
                      <DispatchAccordion
                        key={dispatch._id}
                        dispatch={dispatch}
                        expandOnMount={searchActive && searchDispatchIds.has(String(dispatch._id))}
                        highlightOrderId={
                          searchActive
                            ? focusedOrderId &&
                              searchHits.some(
                                (h) =>
                                  h.dispatchId === String(dispatch._id) &&
                                  h.orderMongoId === focusedOrderId
                              )
                              ? focusedOrderId
                              : searchHits.find((h) => h.dispatchId === String(dispatch._id))
                                  ?.orderMongoId || null
                            : null
                        }
                        onRefresh={refreshList}
                        onDispatchPdfFields={patchDispatchPdfFields}
                        onViewDispatch={(dispatch) =>
                          handleDialogOpen("view", dispatch, { stopPropagation: () => {} })
                        }
                        onCollectSlip={(dispatch) =>
                          handleDialogOpen("collectSlip", dispatch, { stopPropagation: () => {} })
                        }
                        onDeliveryChallan={(dispatch) =>
                          handleDialogOpen("dc", dispatch, { stopPropagation: () => {} })
                        }
                        onCompleteInvoice={(dispatch, aadharByOrderId = {}) => {
                          setInvoiceAadharByOrderId(aadharByOrderId)
                          setSelectedDispatch(dispatch)
                          setIsRamInvoiceOpen(true)
                        }}
                        onCompleteOrder={(dispatch) =>
                          handleOrderComplete(dispatch, { stopPropagation: () => {} })
                        }
                        onDeleteDispatch={(dispatch) => handleDelete(dispatch)}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {dispatchHasMore ? (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    {loadingMore ? "Loading…" : "Load more dispatches"}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {isDispatchFormOpen && selectedDispatch && (
            <DispatchForm
              open={isDispatchFormOpen}
              onClose={() => {
                setIsDispatchFormOpen(false)
                setSelectedDispatch(null) // Reset selected dispatch when closing
                if (typeof refresh === "function") refresh()
              }}
              dispatchData={selectedDispatch}
              mode="view"
              selectedOrders={selectedOrders}
            />
          )}

          {isCollectSlipOpen && selectedDispatch && (
            <CollectSlipPDF
              open={isCollectSlipOpen}
              onClose={() => {
                setIsCollectSlipOpen(false)
                setSelectedDispatch(null) // Reset selected dispatch when closing
              }}
              dispatchData={selectedDispatch}
            />
          )}

          {isDCOpen && selectedDispatch && (
            <DeliveryChallanPDF
              open={isDCOpen}
              onClose={() => {
                setIsDCOpen(false)
                setSelectedDispatch(null) // Reset selected dispatch when closing
              }}
              dispatchData={selectedDispatch}
            />
          )}

          {isRamInvoiceOpen && selectedDispatch && (
            <RamBiotechInvoicePDF
              open={isRamInvoiceOpen}
              onClose={() => {
                setIsRamInvoiceOpen(false)
                setSelectedDispatch(null)
              }}
              dispatchData={selectedDispatch}
              aadharByOrderId={invoiceAadharByOrderId}
            />
          )}

          {invoiceAadharDialog}

          {isOrderCompleteOpen && selectedDispatch && (
            <OrderCompleteDialog
              open={isOrderCompleteOpen}
              onClose={() => {
                setIsOrderCompleteOpen(false)
                setSelectedDispatch(null) // Reset selected dispatch when closing
              }}
              dispatchData={selectedDispatch}
              onSuccess={() => {
                void refreshList()
              }}
            />
          )}
        </div>
    </>
  )
}

export default DispatchList
