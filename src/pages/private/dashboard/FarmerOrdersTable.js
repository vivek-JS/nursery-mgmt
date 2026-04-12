import React, { useState, useEffect, useRef, useLayoutEffect, lazy, Suspense } from "react"

const OrderMapView = lazy(() => import("../Dispatch/components/OrderMapView"))
import ReactDOM from "react-dom"
import {
  Edit2Icon,
  CheckIcon,
  XIcon,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  CalendarRange
} from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { API, NetworkManager } from "network/core"
import { PageLoader, ExcelExport } from "components"
import moment from "moment"
import debounce from "lodash.debounce"
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Switch,
  CircularProgress,
  LinearProgress
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import DownloadPDFButton from "./OrdereRecipt"
import DispatchForm from "./DispatchedForm"
import DispatchList from "./DispatchedList"
import AddAgriSalesOrderForm from "../inventory/AddAgriSalesOrderForm"
import { Toast } from "helpers/toasts/toastHelper"
import { FaUser, FaCreditCard, FaEdit, FaFileAlt, FaWhatsapp, FaCopy } from "react-icons/fa"
import ConfirmDialog from "components/Modals/ConfirmDialog"
import BulkPaymentEntryDialog from "components/Modals/BulkPaymentEntryDialog"
import PaymentQRModal from "components/Modals/PaymentQRModal"
import axiosInstance from "services/axiosConfig"
import { getStatementMatchPresentation } from "lib/bankMatchLabels"
import {
  useCanAddPayment,
  useIsOfficeAdmin,
  useIsSuperAdmin,
  useIsAccountant,
  useIsDealer,
  useDealerWallet,
  useDealerWalletById,
  useUserData,
  useIsDispatchManager
} from "utils/roleUtils"
import {
  isWhatsappMessagingDisabled,
  setWhatsappMessagingDisabled
} from "utils/whatsappMessagingPref"
import { getCavityDisplayLabel, getCavityIdString } from "utils/cavityDisplay"
import {
  extractUpiFromReceiptImageUrl,
  mergeUpiOcrIntoPaymentState,
  buildRemarkWithReceiptPayee
} from "utils/upiReceiptOcr"
import { watiPlantAndSubtypeParams, isMergedSubtypePlaceholder } from "utils/watiPlantDisplay"
import { TableVirtuoso, Virtuoso } from "react-virtuoso"

/** User-visible order dates in table/modals — e.g. 12-March-2025 (API payloads still use DD-MM-YYYY / YYYY-MM-DD). */
const ORDER_DATE_DISPLAY = "DD-MMMM-YYYY"
const ORDER_DATETIME_DISPLAY = "DD-MMMM-YYYY HH:mm"
const DASHBOARD_ORDERS_PAGE_SIZE = 10

/** Maps orderStatus to CSS class suffix: READY_FOR_DISPATCH → ready-for-dispatch (all underscores → hyphens). */
const toStatusBadgeCssClass = (status) => {
  if (status == null || status === "") return "unknown"
  return String(status).toLowerCase().replace(/_/g, "-")
}

/** Statuses where base plant quantity must not be edited (enforced in API as well). */
const STATUSES_BLOCK_QUANTITY_EDIT = new Set([
  "READY_FOR_DISPATCH",
  "DISPATCH_PROCESS",
  "DISPATCHED",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "CANCELLED",
  "REJECTED",
])

const canEditOrderPlantQuantity = (orderStatus) =>
  orderStatus != null && !STATUSES_BLOCK_QUANTITY_EDIT.has(String(orderStatus))

/** Short labels for order status chips / grid (Farmer orders table). */
const ORDER_STATUS_LABELS = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  ASSIGNED: "Assigned",
  FARM_READY: "Ready to farm",
  READY_FOR_DISPATCH: "Ready for dispatch",
  DISPATCH_PROCESS: "Dispatch in progress",
  DISPATCHED: "Dispatched",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  TEMPORARY_CANCELLED: "Temp. cancelled",
  PROCESSING: "Processing",
  PARTIALLY_COMPLETED: "Partially completed",
}

/** WATI accept/dispatch preview text (dashboard); plant/subtype via watiPlantAndSubtypeParams. */
function buildDashboardFarmerOrdersWatiPreviewText(watiDialogOrder, watiDialogMode) {
  if (!watiDialogOrder) return ""
  const rawFarmer = watiDialogOrder.details?.farmer
  const f = Array.isArray(rawFarmer) ? rawFarmer[0] : rawFarmer
  const name = f?.name || watiDialogOrder.farmerName || "Farmer"
  const village = f?.village || "N/A"
  const mobile = f?.mobileNumber || watiDialogOrder.details?.contact || "N/A"
  const plantType =
    watiDialogOrder.plantType?.split?.(" -> ")?.[0] || watiDialogOrder.details?.plantName?.name || "Plants"
  const subtype =
    watiDialogOrder.plantType?.split?.(" -> ")?.[1] || watiDialogOrder.details?.plantSubtype?.name || "N/A"
  const { plantParam, subtypeParam } = watiPlantAndSubtypeParams(plantType, subtype)
  const isPapayaOrder = /papaya/i.test(`${plantParam} ${subtypeParam}`)
  const watiPlantBlock = isMergedSubtypePlaceholder(subtypeParam)
    ? `🌱 रोप: *${plantParam}*`
    : `🌱 रोप प्रकार: *${plantParam}*
🔖 उप-प्रकार: *${subtypeParam}*`
  const orderCode = watiDialogOrder.details?.publicOrderCode || watiDialogOrder.order || "N/A"
  const fmt = (d) =>
    !d ? "N/A" : typeof d === "string" ? d : moment(d).format(ORDER_DATE_DISPLAY)

  if (watiDialogMode === "dispatch") {
    const hist = watiDialogOrder.details?.dispatchHistory || []
    const latest = hist.length > 0 ? hist[hist.length - 1] : null
    const totalDispatched =
      hist.reduce((s, h) => s + (Number(h.quantity) || 0), 0) ||
      (watiDialogOrder.orderStatus === "DISPATCHED"
        ? watiDialogOrder.totalPlants || watiDialogOrder.quantity || 0
        : 0)
    const driverContactBlock = isPapayaOrder
      ? `कृपया ड्रायव्हरशी संपर्क साधा.
📞 ड्रायव्हर नंबर: {{3}}
धन्यवाद.`
      : `🚛 ड्रायव्हर तपशील:
👨 ड्रायव्हर नाव: ${latest?.driverName || "N/A"}
🚚 वाहन क्रमांक: ${latest?.vehicleName || "N/A"}
📅 डिस्पॅच तारीख: ${fmt(latest?.date)}
आभार! 🙏
डिलिव्हरी बाबत कृपया ड्रायव्हरशी संपर्क करावा.`
    return `🚚 नमस्कार ${name}
आपली रोपांची ऑर्डर यशस्वीरित्या रवाना करण्यात आली आहे.
📝 ऑर्डर / डिस्पॅच तपशील:
🆔 ऑर्डर आयडी: ${orderCode}
👤 नाव: *${name}*
🏡 गाव: *${village}*
${watiPlantBlock}
🌿 पाठवलेली एकूण रोपे: *${totalDispatched}*
${driverContactBlock}`
  }

  const paid =
    watiDialogOrder.details?.payment?.filter((p) => p.paymentStatus === "COLLECTED")
      .reduce((s, p) => s + (p.paidAmount || 0), 0) || 0
  const totalPlants =
    watiDialogOrder.totalPlants ??
    (watiDialogOrder.quantity || 0) + (watiDialogOrder.additionalPlants || 0)
  const total = (watiDialogOrder.rate || 0) * totalPlants
  const rem = total - paid
  const delivery =
    watiDialogOrder.details?.deliveryDate ||
    watiDialogOrder.deliveryDate ||
    watiDialogOrder.Delivery ||
    "To be confirmed"
  return `👋 नमस्कार *${name}*
आपली ऑर्डर स्वीकारली आहे!:

📝 ऑर्डर तपशील:
🆔 ऑर्डर आयडी: *${orderCode}*
👤 नाव: *${name}*
🏡 गाव: *${village}*
📞 मोबाईल नंबर: *${mobile}*
${watiPlantBlock}
🌿 बुक केलेली एकूण रोपे: *${totalPlants}*

💰 पेमेंट तपशील:
प्रति रोप दर: *₹${watiDialogOrder.rate || 0}*
एकूण रक्कम: *₹${total}*
प्राप्त रक्कम: *₹${paid}*
शिल्लक रक्कम: *₹${rem}*

🚚 डिलिव्हरी तारीख:
 *${fmt(delivery)}*

आपली ऑर्डर मध्ये काही बदल असल्यास आम्हाला कळवा.
आभार! 🙏
राम बायोटेक,
7276386452`
}

/** Row/grid status dropdown: only these choices (plus current value if outside list). */
const ORDER_STATUS_SELECT_OPTIONS = [
  { label: "Pending", value: "PENDING" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Ready to farm", value: "FARM_READY" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Dispatched", value: "DISPATCHED" },
]

/** Only sales / dealer / RAM agri sales may choose Ready to farm in the row status dropdown. */
function canSelectFarmReadyInOrderStatus(user) {
  const jt = user?.jobTitle || user?.role
  return jt === "DEALER" || jt === "SALES" || jt === "RAM_AGRI_SALES"
}

function orderStatusSelectOptionsForRow(currentStatus, user) {
  const base = canSelectFarmReadyInOrderStatus(user)
    ? ORDER_STATUS_SELECT_OPTIONS
    : ORDER_STATUS_SELECT_OPTIONS.filter((o) => o.value !== "FARM_READY")
  const cur = currentStatus != null && currentStatus !== "" ? String(currentStatus) : ""
  if (!cur || base.some((o) => o.value === cur)) {
    return base
  }
  const label = ORDER_STATUS_LABELS[cur] || String(cur).replace(/_/g, " ")
  return [...base, { label, value: cur }]
}

/** Vehicle grouping for dispatched orders tab (uses latest dispatchHistory entry). */
const getLatestDispatchVehicleMeta = (row) => {
  const hist = row?.details?.dispatchHistory || []
  if (!hist.length) {
    return {
      key: "unknown",
      displayTitle: "Unknown vehicle",
      vehicleName: "—",
      driverName: "—",
      transportId: null,
    }
  }
  const latest = hist[hist.length - 1]
  const driverName = latest?.dispatch?.driverName || latest?.driverName || ""
  const vehicleName = latest?.dispatch?.vehicleName || latest?.vehicleName || ""
  const transportId =
    latest?.dispatch?.transportId ?? latest?.transportId ?? null
  const key =
    [String(transportId ?? ""), vehicleName, driverName].filter(Boolean).join("|") ||
    "unknown"
  const displayTitle =
    vehicleName || driverName
      ? [vehicleName || "—", driverName ? `Driver: ${driverName}` : null]
          .filter(Boolean)
          .join(" · ")
      : transportId != null && transportId !== ""
        ? `Dispatch #${transportId}`
        : "Unknown vehicle"
  return {
    key,
    displayTitle,
    vehicleName: vehicleName || "—",
    driverName: driverName || "—",
    transportId,
  }
}

/** Matches `<th>` count in farmer orders table (incl. hidden Actions). */
const getFarmerOrdersTableColumnCount = ({
  showAgriSalesOrders,
  hidePaymentDetails,
  viewMode,
}) => {
  let n = 0
  if (showAgriSalesOrders) n += 1
  if (
    viewMode !== "booking" &&
    viewMode !== "pending" &&
    viewMode !== "accepted" &&
    viewMode !== "cancelled" &&
    !showAgriSalesOrders
  )
    n += 1
  n += 8 // SR, Order, Farmer, Plant, Delivery, Qty, Rate, Amount
  if (!(showAgriSalesOrders && hidePaymentDetails)) n += 1
  if (showAgriSalesOrders) n += 1
  n += 2 // Status + Actions (hidden)
  return n
}

/** Flat list: group header rows + order rows with sr and dataIndex for tbody. */
const buildDispatchedVehicleTableBodyItems = (filteredOrders) => {
  const map = new Map()
  filteredOrders.forEach((row, dataIndex) => {
    const meta = getLatestDispatchVehicleMeta(row)
    if (!map.has(meta.key)) {
      map.set(meta.key, { meta, entries: [], totalPlants: 0 })
    }
    const g = map.get(meta.key)
    g.entries.push({ row, dataIndex })
    g.totalPlants += row.totalPlants ?? row.quantity ?? 0
  })
  const transportSort = (meta) => {
    const t = meta.transportId
    const n = parseInt(String(t ?? ""), 10)
    return Number.isFinite(n) ? n : 1e12
  }
  const groups = Array.from(map.values()).sort((a, b) => {
    const c = transportSort(a.meta) - transportSort(b.meta)
    if (c !== 0) return c
    return String(a.meta.displayTitle).localeCompare(String(b.meta.displayTitle))
  })
  const items = []
  let sr = 0
  for (const g of groups) {
    items.push({
      kind: "groupHeader",
      meta: g.meta,
      orderCount: g.entries.length,
      totalPlants: g.totalPlants,
    })
    for (const { row, dataIndex } of g.entries) {
      sr += 1
      items.push({ kind: "order", row, sr, dataIndex })
    }
  }
  return items
}

/** Merge two API order rows by id; primary list wins on duplicate (e.g. DISPATCH_PROCESS kept over duplicate). */
const mergeOrdersByIdPrimaryFirst = (primary, secondary) => {
  const map = new Map()
  for (const row of primary || []) {
    if (row?.id != null) map.set(String(row.id), row)
  }
  for (const row of secondary || []) {
    const key = row?.id != null ? String(row.id) : null
    if (key && !map.has(key)) map.set(key, row)
  }
  return Array.from(map.values())
}

/** Total row count from GET /order/getOrders pagination envelope (aligned with backend factory getAll for Order). */
const getOrdersListEnvelopeTotal = (res) => {
  const envelope = res?.data?.data
  if (envelope && typeof envelope.total === "number") return envelope.total
  return Array.isArray(envelope?.data) ? envelope.data.length : 0
}

/**
 * Query params for GET /order/getOrders (Farmer orders regular tabs).
 * Keeps list fetch, load-more, refresh, and tab-count requests aligned.
 */
function buildRegularOrderListParams({
  viewMode,
  startDate,
  endDate,
  debouncedSearchTerm,
  orderDateRangeBy,
  selectedSalesPerson,
  selectedVillage,
  selectedDistrict,
  selectedPlant,
  selectedSubtype,
  user,
  page = 1,
  limit = DASHBOARD_ORDERS_PAGE_SIZE,
}) {
  const isCancelledTab = viewMode === "cancelled"
  const isBookingLikeTab =
    viewMode === "booking" ||
    viewMode === "pending" ||
    viewMode === "accepted" ||
    isCancelledTab
  const isReadyForDispatchTab = viewMode === "ready_for_dispatch"
  const isDispatchedVehicleTab = viewMode === "dispatched_vehicle"

  const params = {
    search: debouncedSearchTerm,
    dispatched: isBookingLikeTab ? false : true,
    limit,
    page,
  }

  if (startDate && endDate && !debouncedSearchTerm?.trim()) {
    const date = new Date(startDate)
    const formattedStartDate = moment(date).format("DD-MM-YYYY")
    const edate = new Date(endDate)
    const formattedEndtDate = moment(edate).format("DD-MM-YYYY")
    params.startDate = formattedStartDate
    params.endDate = formattedEndtDate
  }

  const isDealerOrSales = user?.jobTitle === "DEALER" || user?.jobTitle === "SALES"
  if (isDealerOrSales && (user?._id || user?.id)) {
    params.salesPerson = user._id || user.id
  } else if (selectedSalesPerson) {
    params.salesPerson = selectedSalesPerson
  }
  if (selectedVillage) {
    params.village = selectedVillage
  }
  if (selectedDistrict) {
    params.district = selectedDistrict
  }
  if (selectedPlant) {
    params.plantId = selectedPlant
  }
  if (selectedSubtype) {
    params.subtypeId = selectedSubtype
  }

  if (
    startDate &&
    endDate &&
    (viewMode === "booking" ||
      viewMode === "pending" ||
      viewMode === "accepted" ||
      isCancelledTab) &&
    !debouncedSearchTerm?.trim()
  ) {
    params.dateRangeField = orderDateRangeBy
  }

  if (isCancelledTab) {
    params.status = "CANCELLED"
  } else if (viewMode === "pending") {
    params.status = "PENDING"
  } else if (viewMode === "accepted") {
    params.status = "ACCEPTED,ASSIGNED"
  }

  if (viewMode === "farmready") {
    params.farmReady = "true"
    delete params.status
  }

  if (viewMode === "dispatch_process") {
    params.startDate = null
    params.endDate = null
  }

  if (isDispatchedVehicleTab) {
    params.dispatched = true
    params.status = "DISPATCHED"
    params.startDate = null
    params.endDate = null
  }

  if (isReadyForDispatchTab) {
    params.ready_for_dispatch = "true"
    params.startDate = null
    params.endDate = null
    delete params.status
  }

  if (viewMode === "dispatch_process") {
    params.status = "DISPATCH_PROCESS"
    params.dispatched = false
  }

  return params
}

const DISPATCH_DAY_KEY_OFFSET = { TODAY: 0, TOMORROW: 1, DAY_AFTER: 2 }

const resolveRowDispatchTargetMoment = (row) => {
  const targetDate = row?.details?.dispatchTargetDate
  if (targetDate) {
    const target = moment(targetDate).startOf("day")
    return target.isValid() ? target : null
  }
  const key = String(row?.details?.dispatchDayKey || "").toUpperCase()
  const off = DISPATCH_DAY_KEY_OFFSET[key]
  if (off === undefined) return null
  return moment().startOf("day").add(off, "days")
}

const getReadyDispatchMarathiBadge = (row) => {
  const target = resolveRowDispatchTargetMoment(row)
  if (!target) return null

  const dateStr = target.format("DD-MMM-YYYY")
  const today = moment().startOf("day")
  const diff = target.diff(today, "days")
  const isNotDispatched = !["DISPATCHED", "COMPLETED"].includes(row?.orderStatus)

  if (diff < 0 && isNotDispatched) {
    return {
      label: `Kaal · ${dateStr}`,
      className: "bg-red-100 text-red-700 border border-red-300 animate-pulse"
    }
  }
  if (diff === 0) {
    return {
      label: `Aaj · ${dateStr}`,
      className: "bg-red-100 text-red-700 border border-red-300 animate-pulse"
    }
  }
  if (diff === 1) {
    return {
      label: `Udya · ${dateStr}`,
      className: "bg-green-100 text-green-700 border border-green-300"
    }
  }
  if (diff === 2) {
    return {
      label: `Parva · ${dateStr}`,
      className: "bg-teal-100 text-teal-700 border border-teal-300"
    }
  }
  return null
}

// Custom CSS for blinking animation and enhanced dropdowns
const customStyles = `
  @keyframes paymentBlink {
    0%, 50% {
      background-color: #fef3c7;
      border-color: #f59e0b;
      box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
    }
    25%, 75% {
      background-color: #fefce8;
      border-color: #fbbf24;
      box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2);
    }
    100% {
      background-color: #fef3c7;
      border-color: #f59e0b;
      box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
    }
  }
  
  @keyframes paymentGlow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(245, 158, 11, 0.3);
    }
    50% {
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.6), 0 0 25px rgba(245, 158, 11, 0.3);
    }
  }
  
  .payment-blink {
    animation: paymentBlink 2s ease-in-out infinite, paymentGlow 1.5s ease-in-out infinite;
  }

  /* Enhanced Dropdown Styles */
  .enhanced-select {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    outline: none;
  }

  .enhanced-select:hover {
    border-color: #0f766e;
    box-shadow: 0 4px 12px rgba(15, 118, 110, 0.15);
    transform: translateY(-1px);
  }

  .enhanced-select:focus {
    border-color: #0f766e;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
  }

  .enhanced-select option {
    padding: 8px 12px;
    background: white;
    color: #374151;
    font-weight: 500;
  }

  .enhanced-select option:hover {
    background: #f3f4f6;
  }

  /* Material-UI Select Enhancement */
  .mui-select-enhanced .MuiOutlinedInput-root {
    border-radius: 12px;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    transition: all 0.3s ease;
  }

  .mui-select-enhanced .MuiOutlinedInput-root:hover {
    box-shadow: 0 4px 12px rgba(15, 118, 110, 0.15);
    transform: translateY(-1px);
  }

  .mui-select-enhanced .MuiOutlinedInput-root.Mui-focused {
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
  }

  .mui-select-enhanced .MuiSelect-select {
    padding: 12px 16px;
    font-weight: 500;
    color: #374151;
  }

  .mui-select-enhanced .MuiMenuItem-root {
    padding: 12px 16px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .mui-select-enhanced .MuiMenuItem-root:hover {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  }

  .mui-select-enhanced .MuiMenuItem-root.Mui-selected {
    background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
    color: white;
  }

  /* Status Badge Enhancement */
  .status-badge-enhanced {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 2px solid #e2e8f0;
    border-radius: 20px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    transition: all 0.3s ease;
    cursor: pointer;
    outline: none;
    min-width: 120px;
    text-align: center;
  }

  .status-badge-enhanced:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .status-badge-enhanced:focus {
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
  }

  /* Status-specific colors */
  .status-accepted {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    border-color: #22c55e;
    color: #166534;
  }

  .status-pending {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-color: #f59e0b;
    color: #92400e;
  }

  .status-assigned {
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
    border-color: #a855f7;
    color: #6b21a8;
  }

  .status-rejected {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border-color: #ef4444;
    color: #991b1b;
  }

  .status-dispatched {
    background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
    border-color: #0f766e;
    color: #0f766e;
  }

  .status-completed {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    border-color: #6b7280;
    color: #374151;
  }

  .status-farm-ready {
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border-color: #10b981;
    color: #065f46;
  }

  .status-ready-for-dispatch {
    background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
    border-color: #0d9488;
    color: #115e59;
  }

  .status-dispatch-process {
    background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
    border-color: #06b6d4;
    color: #0e7490;
  }

  .status-temporary-cancelled {
    background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
    border-color: #f97316;
    color: #9a3412;
  }

  .status-cancelled {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border-color: #ef4444;
    color: #991b1b;
  }

  .status-unknown {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    border-color: #9ca3af;
    color: #4b5563;
  }

  /* Order For highlighting */
  .order-for-highlight {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 2px solid #f59e0b;
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
    animation: orderForGlow 2s ease-in-out infinite;
    padding: 2px 8px;
  }

  @keyframes orderForGlow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(245, 158, 11, 0.3);
    }
    50% {
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.6), 0 0 25px rgba(245, 158, 11, 0.3);
    }
  }

  /* Farmer Name highlighting */
  .farmer-name-highlight {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 2px solid #f59e0b;
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
    animation: farmerNameGlow 2s ease-in-out infinite;
    padding: 2px 8px;
  }

  @keyframes farmerNameGlow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(245, 158, 11, 0.3);
    }
    50% {
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.6), 0 0 25px rgba(245, 158, 11, 0.3);
    }
  }

  /* Searchable Dropdown Styles */
  .searchable-dropdown {
    position: relative;
    width: 100%;
  }

  .searchable-dropdown-button {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    outline: none;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
  }

  .searchable-dropdown-button:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-1px);
  }

  .searchable-dropdown-button:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .searchable-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    max-height: 600px;
    overflow-y: auto;
    margin-top: 4px;
    opacity: 1;
    transform: translateY(0);
    transition: all 0.2s ease-in-out;
  }

  .searchable-dropdown-menu.closing {
    opacity: 0;
    transform: translateY(-10px);
  }

  .searchable-dropdown-search {
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    background: white;
    border-radius: 12px 12px 0 0;
  }

  .searchable-dropdown-search input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
  }

  .searchable-dropdown-search input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .searchable-dropdown-options {
    max-height: 500px;
    overflow-y: auto;
  }

  .searchable-dropdown-option {
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .searchable-dropdown-option:hover {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  }

  .searchable-dropdown-option.selected {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  .searchable-dropdown-option:last-child {
    border-bottom: none;
  }

  .searchable-dropdown-empty {
    padding: 16px;
    text-align: center;
    color: #6b7280;
    font-style: italic;
  }

  .searchable-dropdown-clear {
    position: absolute;
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .searchable-dropdown-clear:hover {
    background: #dc2626;
    transform: translateY(-50%) scale(1.1);
  }

  .searchable-dropdown-count {
    background: #3b82f6;
    color: white;
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
  }

  /* Compact status dropdown - appears above to avoid scroll */
  .searchable-dropdown.status-dropdown {
    min-width: 120px;
  }

  .searchable-dropdown.status-dropdown .searchable-dropdown-button {
    padding: 8px 12px;
    min-height: 40px;
    font-size: 12px;
    font-weight: 700;
  }

  .searchable-dropdown.status-dropdown .searchable-dropdown-menu {
    min-width: 150px;
    z-index: 9999;
    top: auto;
    bottom: 100%;
    margin-top: 0;
    margin-bottom: 4px;
    transform: translateY(0);
  }

  .searchable-dropdown.status-dropdown .searchable-dropdown-menu.closing {
    transform: translateY(10px);
  }
`

// SearchableDropdown Component
const SearchableDropdown = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  showCount = false,
  maxHeight = "500px",
  isStatusDropdown = false,
  usePortal = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, minWidth: 0 })

  const needsPortal = isStatusDropdown || usePortal

  // Update menu position for portal dropdowns
  const updateMenuPosition = () => {
    if (buttonRef.current && needsPortal) {
      const rect = buttonRef.current.getBoundingClientRect()
      if (isStatusDropdown) {
        setMenuPosition({
          top: rect.top,
          left: rect.left,
          minWidth: rect.width
        })
      } else {
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.left,
          minWidth: rect.width
        })
      }
    }
  }

  useLayoutEffect(() => {
    if (isOpen && needsPortal) {
      updateMenuPosition()
    }
  }, [isOpen, needsPortal])

  useEffect(() => {
    if (!isOpen || !needsPortal) return
    const handleScrollOrResize = () => updateMenuPosition()
    window.addEventListener("scroll", handleScrollOrResize, true)
    window.addEventListener("resize", handleScrollOrResize)
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true)
      window.removeEventListener("resize", handleScrollOrResize)
    }
  }, [isOpen, needsPortal])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const menuEls = document.querySelectorAll(".searchable-dropdown-menu-portal")
      const clickedInsidePortal = Array.from(menuEls).some((el) => el.contains(event.target))
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !clickedInsidePortal
      ) {
        handleClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
      setSearchTerm("")
    }, 200)
  }

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get selected option label
  const selectedOption = options.find((option) => option.value === value)
  const displayValue = selectedOption ? selectedOption.label : placeholder

  const handleOptionClick = (option) => {
    onChange(option.value)
    handleClose()
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange("")
    handleClose()
  }

  const menuContent = (
    <div
      className={`searchable-dropdown-menu ${isClosing ? "closing" : ""} ${needsPortal ? "searchable-dropdown-menu-portal" : ""}`}
      style={
        needsPortal && isOpen
          ? isStatusDropdown
            ? {
                position: "fixed",
                top: menuPosition.top - 4,
                left: menuPosition.left,
                minWidth: menuPosition.minWidth,
                transform: isClosing ? "translateY(-100%) translateY(10px)" : "translateY(-100%)",
                zIndex: 99999
              }
            : {
                position: "fixed",
                top: menuPosition.top,
                left: menuPosition.left,
                minWidth: menuPosition.minWidth,
                zIndex: 99999
              }
          : undefined}>
      <div className="searchable-dropdown-search">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4"
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        </div>
      </div>

      <div className="searchable-dropdown-options" style={{ maxHeight }}>
        {filteredOptions.length === 0 ? (
          <div className="searchable-dropdown-empty">
            {searchTerm ? "No results found" : "No options available"}
          </div>
        ) : (
          filteredOptions.map((option) => (
            <div
              key={option.value}
              className={`searchable-dropdown-option ${
                option.value === value ? "selected" : ""
              }`}
              onClick={() => handleOptionClick(option)}>
              <span className="truncate">{option.label}</span>
              {option.value === value && <CheckIcon size={16} />}
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div
      className={`searchable-dropdown ${isStatusDropdown ? "status-dropdown" : ""}`}
      ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {showCount && <span className="searchable-dropdown-count ml-2">{options.length}</span>}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        className={`searchable-dropdown-button ${
          isStatusDropdown
            ? `status-badge-enhanced status-${toStatusBadgeCssClass(value)}`
            : ""
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return
          e.preventDefault()
          e.stopPropagation()
          if (!isOpen) {
            // Small delay when opening to prevent immediate closing
            setTimeout(() => {
              setIsOpen(true)
            }, 50)
          } else {
            handleClose()
          }
        }}
        onFocus={() => {
          if (disabled) return
          if (!isOpen) {
            setTimeout(() => {
              setIsOpen(true)
            }, 50)
          }
        }}>
        <span className="truncate">{displayValue}</span>
        <div className="flex items-center gap-2">
          {value && !isStatusDropdown && (
            <button
              type="button"
              className="searchable-dropdown-clear"
              onClick={handleClear}
              title="Clear selection">
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen &&
        (needsPortal ? (
          ReactDOM.createPortal(menuContent, document.body)
        ) : (
          menuContent
        ))}
    </div>
  )
}

/** Compact trigger for react-datepicker range in filters block */
const OrderDateRangeField = React.forwardRef(function OrderDateRangeField(
  { startDate, endDate, onClick, onKeyDown, disabled, id, placeholder },
  ref
) {
  let primary = placeholder || "Choose date range"
  if (startDate && endDate) {
    const a = moment(startDate)
    const b = moment(endDate)
    primary = `${a.format(ORDER_DATE_DISPLAY)} — ${b.format(ORDER_DATE_DISPLAY)}`
  } else if (startDate) {
    primary = `${moment(startDate).format(ORDER_DATE_DISPLAY)} — pick end date`
  }

  return (
    <button
      type="button"
      id={id}
      ref={ref}
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={disabled}
      aria-label={primary}
      className="w-full flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-left shadow-sm transition hover:border-teal-400 hover:bg-teal-50/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-100 text-teal-800">
        <CalendarRange className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-500">
          Order date range
        </span>
        <span className="block truncate text-[12px] font-semibold text-gray-900">{primary}</span>
      </span>
    </button>
  )
})

function isAbortedRequestError(err) {
  return err?.code === "ERR_CANCELED" || err?.name === "CanceledError"
}

const FarmerOrdersTable = ({ slotId, monthName, startDay, endDay }) => {
  const today = new Date()
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [editingRows, setEditingRows] = useState(new Set())
  const [selectedDateRange, setSelectedDateRange] = useState([
    new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    today
  ])
  const [loading, setLoading] = useState(false)
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersPage, setOrdersPage] = useState(1)
  const [hasMoreOrders, setHasMoreOrders] = useState(false)
  const [patchLoading, setpatchLoading] = useState(false)
  const [startDate, endDate] = selectedDateRange
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [refresh, setRefresh] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
  const [showAgriSalesOrders, setShowAgriSalesOrders] = useState(false) // Regular orders by default (true = Ram Agri Inputs)
  const [showAddAgriSalesOrderForm, setShowAddAgriSalesOrderForm] = useState(false) // Dialog for adding Agri Sales order
  const [linkedAgriSourceOrder, setLinkedAgriSourceOrder] = useState(null)
  const [agriSalesPendingCount, setAgriSalesPendingCount] = useState(0) // Pending payments count for badge
  const [agriStatusCounts, setAgriStatusCounts] = useState({
    ALL: 0,
    ACCEPTED: 0,
    ASSIGNED: 0,
    DISPATCHED: 0,
    COMPLETED: 0,
  }) // Counts for each Ram Agri status tab
  
  // Ram Agri Inputs Dispatch State
  const [selectedAgriSalesOrders, setSelectedAgriSalesOrders] = useState([]) // Selected orders for dispatch
  const [showAgriDispatchModal, setShowAgriDispatchModal] = useState(false) // Dispatch modal
  const [agriDispatchForm, setAgriDispatchForm] = useState({
    dispatchMode: "VEHICLE", // VEHICLE or COURIER
    vehicleId: "",
    vehicleNumber: "",
    driverName: "",
    driverMobile: "",
    // Courier fields
    courierName: "",
    courierTrackingId: "",
    courierContact: "",
    dispatchNotes: "",
  })
  const [agriDispatchLoading, setAgriDispatchLoading] = useState(false)
  const [agriVehicles, setAgriVehicles] = useState([])
  const [agriDispatchPrefillLoading, setAgriDispatchPrefillLoading] = useState(false)
  const [agriDispatchPrefillMeta, setAgriDispatchPrefillMeta] = useState(null)
  const [ramAgriSalesUsers, setRamAgriSalesUsers] = useState([]) // Ram Agri Inputs users for "Dispatched By" filter
  const [selectedDispatchedBy, setSelectedDispatchedBy] = useState("") // Filter by who dispatched
  const [hidePaymentDetails, setHidePaymentDetails] = useState(false) // Toggle to hide payment details
  const [agriDispatchStatusFilter, setAgriDispatchStatusFilter] = useState("ALL") // Ram Agri: ALL | ACCEPTED | ASSIGNED | DISPATCHED | COMPLETED
  const [todayPendingAgriLoads, setTodayPendingAgriLoads] = useState([])
  const [agriLoadActionBusyId, setAgriLoadActionBusyId] = useState(null)
  // Complete order state (for marking dispatched orders as delivered)
  const [selectedAgriOrdersForComplete, setSelectedAgriOrdersForComplete] = useState([])
  const [showAgriCompleteModal, setShowAgriCompleteModal] = useState(false)
  const [agriCompleteForm, setAgriCompleteForm] = useState({
    returnQuantities: {}, // { orderId: returnQty }
    returnReason: "",
    returnNotes: "",
  })
  const [agriCompleteLoading, setAgriCompleteLoading] = useState(false)
  // Assignment state (Admin assigns to sales person)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignToUser, setAssignToUser] = useState("")
  const [assignmentNotes, setAssignmentNotes] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)
  // Bulk payment dialog (shared); accept only on /payments page
  const [showBulkPaymentDialog, setShowBulkPaymentDialog] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [upiOcrLoading, setUpiOcrLoading] = useState(false)
  /** Farmer order "Add payment" accordion: upload + OCR — do not use global `loading` (submit uses that). */
  const [paymentReceiptBusy, setPaymentReceiptBusy] = useState(false)
  const [paymentQRModalOpen, setPaymentQRModalOpen] = useState(false)
  const [paymentQRModalData, setPaymentQRModalData] = useState(null)
  const [verifyIciciLoadingPaymentId, setVerifyIciciLoadingPaymentId] = useState(null)
  const [generateQRLoading, setGenerateQRLoading] = useState(false)
  const ordersTableScrollRef = useRef(null)
  const loadMoreOrdersRef = useRef(null)
  const getOrdersAbortRef = useRef(null)
  const loadMoreOrdersAbortRef = useRef(null)
  const getOrdersRequestSeqRef = useRef(0)
  const [farmerOrdersGridColumnCount, setFarmerOrdersGridColumnCount] = useState(1)
  useLayoutEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1536) setFarmerOrdersGridColumnCount(4)
      else if (w >= 1280) setFarmerOrdersGridColumnCount(3)
      else if (w >= 768) setFarmerOrdersGridColumnCount(2)
      else setFarmerOrdersGridColumnCount(1)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // Inject custom CSS for blinking animation and enhanced dropdowns
  useEffect(() => {
    const styleElement = document.createElement("style")
    styleElement.textContent = customStyles
    document.head.appendChild(styleElement)

    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  // Role-based access control
  const canAddPayment = useCanAddPayment() // Anyone can add payments
  const isOfficeAdmin = useIsOfficeAdmin()
  const isSuperAdmin = useIsSuperAdmin()
  const isAccountant = useIsAccountant()
  const canEditOrderCore = isOfficeAdmin || isSuperAdmin || isAccountant
  /** Reassign booked-by sales / dealer (same roles as full order status changes). */
  const canReassignSalesPerson = isOfficeAdmin || isSuperAdmin
  const isDealer = useIsDealer()
  const isDispatchManager = useIsDispatchManager()
  const { walletData, loading: walletLoading } = useDealerWallet()
  const user = useUserData() // Get current user data
  const isAgriLoadAdmin = ["RAM_AGRI_SALES_MANAGER", "ADMIN", "SUPER_ADMIN"].includes(
    String(user?.jobTitle || user?.role || "").toUpperCase()
  )
  const canChangeOrderStatus = !isDealer && (isOfficeAdmin || isSuperAdmin)

  const resolvePlantCounts = React.useCallback((order) => {
    if (!order) {
      return { base: 0, additional: 0, total: 0 }
    }

    const base =
      order.basePlants ??
      order?.details?.numberOfPlants ??
      order.quantity ??
      0

    const additional =
      order.additionalPlants ?? order?.details?.additionalPlants ?? 0

    const total =
      order.totalPlants ??
      order?.details?.totalPlants ??
      base + additional

    return { base, additional, total }
  }, [])

  // State to track dealer ID for wallet data
  const [dealerIdForWallet, setDealerIdForWallet] = useState(null)

  // Dealer wallet data for when sales person is a dealer
  const {
    walletData: dealerWalletData,
    loading: dealerWalletLoading,
    refetch: refetchDealerWallet
  } = useDealerWalletById(dealerIdForWallet)

  // Debug wallet data
  useEffect(() => {}, [dealerIdForWallet, dealerWalletData, dealerWalletLoading])


  // Filter states
  const [selectedSalesPerson, setSelectedSalesPerson] = useState("")
  const [selectedVillage, setSelectedVillage] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState("")
const [selectedPlant, setSelectedPlant] = useState("")
const [selectedSubtype, setSelectedSubtype] = useState("")
const [plants, setPlants] = useState([])
const [subtypes, setSubtypes] = useState([])
const [subtypesLoading, setSubtypesLoading] = useState(false)

  // Filter options
  const [salesPeople, setSalesPeople] = useState([])
  const [villages, setVillages] = useState([])
  const [districts, setDistricts] = useState([])

  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [updatedObject, setUpdatedObject] = useState(null)
  const [quantityDeltaInput, setQuantityDeltaInput] = useState("")
  const [viewMode, setViewMode] = useState("booking")
  const isCancelledTab = viewMode === "cancelled"
  const isReadyForDispatchTab = viewMode === "ready_for_dispatch"
  const isDispatchedVehicleTab = viewMode === "dispatched_vehicle"
  const [orderViewTabTotals, setOrderViewTabTotals] = useState({
    booking: 0,
    pending: 0,
    accepted: 0,
    cancelled: 0,
    farmready: 0,
    ready_for_dispatch: 0,
    dispatch_process: 0,
    dispatched_vehicle: 0,
  })
  /** API `dateRangeField`: booking vs delivery for date-range filter (see factory.controller getOrders). */
  // Default date-range field should be "booking" (Booking date).
  const [orderDateRangeBy, setOrderDateRangeBy] = useState("booking")
  const [viewType, setViewType] = useState("table") // "table" or "grid"
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [readyDispatchGroups, setReadyDispatchGroups] = useState([])
  const [clubDialogOpen, setClubDialogOpen] = useState(false)
  const [routeMapOpen, setRouteMapOpen] = useState(false)
  const [clubCapacityMax, setClubCapacityMax] = useState(3000)
  const [clubCapacityType, setClubCapacityType] = useState("PLANTS")
  const [clubCapacityUnit, setClubCapacityUnit] = useState("plants")
  const [clubSuggestedGroups, setClubSuggestedGroups] = useState([])
  const [clubLoading, setClubLoading] = useState(false)
  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false)
  const [dispatchSourceGroupId, setDispatchSourceGroupId] = useState(null)
  const [isDispatchtab, setisDispatchtab] = useState(false)
  const [newRemark, setNewRemark] = useState("")
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [expandedAddPaymentAccordion, setExpandedAddPaymentAccordion] = useState(false)
  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false)
  const [newPayment, setNewPayment] = useState({
    paidAmount: "",
    paymentDate: moment().format("YYYY-MM-DD"),
    modeOfPayment: "",
    bankName: "",
    transactionId: "",
    utrNumber: "",
    chequeNumber: "",
    remark: "",
    receiptPhoto: [],
    receiptPayeeName: "",
    paymentStatus: "PENDING", // Default to PENDING, will be updated based on payment type
    isWalletPayment: false
  })
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [linkedAgriItems, setLinkedAgriItems] = useState([])
  const [linkedAgriLoading, setLinkedAgriLoading] = useState(false)

  const selectedOrderCounts = React.useMemo(
    () => resolvePlantCounts(selectedOrder),
    [resolvePlantCounts, selectedOrder]
  )

  const selectedOrderDispatchStats = React.useMemo(() => {
    if (!selectedOrder) {
      return {
        dispatchedPlants: 0,
        netWithFarmer: 0,
        remainingToDispatch: 0,
        total: 0
      }
    }
    const total = selectedOrderCounts?.total ?? 0
    const remainingToDispatch = Number(selectedOrder["remaining Plants"] ?? 0) || 0
    const returned = Number(selectedOrder["returned Plants"] ?? 0) || 0
    const history = selectedOrder?.details?.dispatchHistory || []
    const dispatchedFromHistory = history.reduce(
      (s, d) => s + (Number(d.quantity) || 0),
      0
    )
    const dispatchedPlants =
      dispatchedFromHistory > 0
        ? dispatchedFromHistory
        : Math.max(0, total - remainingToDispatch)
    const netWithFarmer = Math.max(0, total - returned - remainingToDispatch)
    return { dispatchedPlants, netWithFarmer, remainingToDispatch, total }
  }, [selectedOrder, selectedOrderCounts])
  const quantityDeltaParsed = React.useMemo(
    () => parseDeltaInput(quantityDeltaInput),
    [quantityDeltaInput]
  )
  const editBaseQuantity = Number(selectedOrderCounts?.base || 0)
  const editFinalQuantity = editBaseQuantity + (quantityDeltaParsed?.delta || 0)
  const [activeTab, setActiveTab] = useState("overview")
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null
  })
  const [statusRemarkDialog, setStatusRemarkDialog] = useState({
    open: false,
    title: "",
    description: "",
    remark: "",
    confirmLabel: "Apply",
    onSubmit: null
  })
  const [readyDispatchDialog, setReadyDispatchDialog] = useState({
    open: false,
    row: null,
    newStatus: "READY_FOR_DISPATCH",
    dispatchDayKey: ""
  })
  const [watiDialogOpen, setWatiDialogOpen] = useState(false)
  const [watiDialogOrder, setWatiDialogOrder] = useState(null)
  const [watiDialogMode, setWatiDialogMode] = useState("accept")
  const [watiSending, setWatiSending] = useState(false)
  const [recentQtyEditsOpen, setRecentQtyEditsOpen] = useState(false)
  const [whatsappMessagingEnabled, setWhatsappMessagingEnabled] = useState(
    () => !isWhatsappMessagingDisabled()
  )

  const recentPlantQuantityEdits = React.useMemo(() => {
    const rows = []
    for (const o of orders || []) {
      if (o?.isAgriSalesOrder) continue
      const hist = o?.details?.orderEditHistory || []
      for (const e of hist) {
        if (e?.field !== "numberOfPlants") continue
        const when = e.createdAt || e.updatedAt
        rows.push({
          key: `${o.details?.orderid || o.order}-${when || ""}-${e.newValue}-${e.previousValue}`,
          orderRef: o.order,
          farmer: o.farmerName,
          when,
          prev: e.previousValue,
          next: e.newValue,
          notes: e.notes || "",
          byName: e.changedBy?.name || null,
        })
      }
    }
    rows.sort((a, b) => {
      const ta = a.when ? new Date(a.when).getTime() : 0
      const tb = b.when ? new Date(b.when).getTime() : 0
      return tb - ta
    })
    return rows.slice(0, 120)
  }, [orders])
  const showPageLoader = loading && orders.length === 0
  // Add these handler functions
  const handleAddRemark = (orderId) => {
    if (!newRemark.trim()) return

    pacthOrders(
      {
        id: orderId,
        orderRemarks: newRemark
      },
      selectedRow
    ).then(async () => {
      // Refresh both modal data and main list
      await getOrders()
      setTimeout(() => {
        refreshModalData()
      }, 500)
    })

    setNewRemark("")
  }

  const handleCopyLinkedOrderCode = async (linkedOrderCode, event) => {
    if (event?.stopPropagation) event.stopPropagation()
    if (!linkedOrderCode) return
    try {
      await navigator.clipboard.writeText(String(linkedOrderCode))
      Toast.success(`Linked order ID copied: ${linkedOrderCode}`)
    } catch (err) {
      Toast.error("Unable to copy linked order ID")
    }
  }

  const handleAddPayment = async (orderId) => {
    if (!newPayment.paidAmount) {
      Toast.error("Please fill in payment amount")
      return
    }

    // Check if this is an Agri Sales order
    const isAgriSalesOrder = selectedOrder?.isAgriSalesOrder || orders.find(o => o.details?.orderid === orderId)?.isAgriSalesOrder

    // For Agri Sales orders, wallet payment is not available (simpler flow)
    if (isAgriSalesOrder && newPayment.isWalletPayment) {
      Toast.error("Wallet payment is not available for Agri Sales orders")
      return
    }

    // Only require modeOfPayment if not using wallet payment
    if (!newPayment.isWalletPayment && !newPayment.modeOfPayment) {
      Toast.error("Please select payment mode")
      return
    }

    // Validate image requirement for non-Cash payments (except NEFT/RTGS)
    if (newPayment.paidAmount && newPayment.modeOfPayment && newPayment.modeOfPayment !== "Cash" && newPayment.modeOfPayment !== "NEFT/RTGS") {
      if (!newPayment.receiptPhoto || newPayment.receiptPhoto.length === 0) {
        Toast.error(`Payment image is mandatory for ${newPayment.modeOfPayment} payments`)
        return
      }
    }

    // Validate wallet payment for dealers
    if (isDealer && newPayment.isWalletPayment) {
      const availableAmount = walletData?.financial?.availableAmount || 0
      const paymentAmount = Number(newPayment.paidAmount)

      if (paymentAmount > availableAmount) {
        Toast.error(`Insufficient wallet balance. Available: ₹${availableAmount.toLocaleString()}`)
        return
      }
    }

    // Validate dealer wallet payment for accountants (when sales person is dealer)
    if (
      !isDealer &&
      selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
      newPayment.isWalletPayment
    ) {
      const availableAmount = dealerWalletData?.financial?.availableAmount || 0
      const paymentAmount = Number(newPayment.paidAmount)

      if (paymentAmount > availableAmount) {
        Toast.error(
          `Insufficient dealer wallet balance. Available: ₹${availableAmount.toLocaleString()}`
        )
        return
      }
    }

    // Validate dealer wallet payment for any user when dealer is present in order
    if (selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" && newPayment.isWalletPayment) {
      const availableAmount = dealerWalletData?.financial?.availableAmount || 0
      const paymentAmount = Number(newPayment.paidAmount)

      if (paymentAmount > availableAmount) {
        Toast.error(
          `Insufficient dealer wallet balance. Available: ₹${availableAmount.toLocaleString()}`
        )
        return
      }
    }

    // Process dealer wallet payment if applicable
    if (
      selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
      newPayment.isWalletPayment &&
      dealerWalletData
    ) {
      console.log("Processing dealer wallet payment")
      const paymentAmount = Number(newPayment.paidAmount)
      const isValid = await processDealerWalletPayment(orderId, paymentAmount)

      if (!isValid) {
        return
      }
    }

    setLoading(true)
    try {
      // Handle Agri Sales orders differently
      if (isAgriSalesOrder) {
        const instance = NetworkManager(API.INVENTORY.ADD_AGRI_SALES_ORDER_PAYMENT)
        const payload = {
          paidAmount: newPayment.paidAmount,
          paymentDate: newPayment.paymentDate,
          modeOfPayment: newPayment.isWalletPayment ? "Wallet" : newPayment.modeOfPayment,
          bankName: newPayment.bankName || "",
          transactionId: newPayment.transactionId || "",
          utrNumber: newPayment.utrNumber?.trim() || "",
          chequeNumber: newPayment.chequeNumber?.trim() || "",
          receiptPhoto: newPayment.receiptPhoto || [],
          remark: buildRemarkWithReceiptPayee(newPayment.remark, newPayment.receiptPayeeName) || "",
          isWalletPayment: false, // Agri Sales orders don't support wallet payments
          paymentStatus: "PENDING",
        }

        const response = await instance.request(payload, [`${orderId}/payment`])
        
        if (response?.data) {
          Toast.success("Payment added successfully")
          setShowPaymentForm(false)
          setExpandedAddPaymentAccordion(false)
          resetPaymentForm(false)
          
          // Refresh orders
          await getOrders()
          refreshComponent()
          
          // Update selected order if modal is open
          if (selectedOrder) {
            setTimeout(() => {
              refreshModalData()
            }, 500)
          }
        } else {
          Toast.error("Failed to add payment")
        }
        setLoading(false)
        return
      }

      // Handle regular orders (existing flow)
      const instance = NetworkManager(API.ORDER.ADD_PAYMENT)

      // Ensure isWalletPayment is a boolean and construct payload explicitly
      const isWalletPayment = Boolean(newPayment.isWalletPayment)

      // Set payment status - use the status from newPayment, default to PENDING
      const paymentStatus = newPayment.paymentStatus || "PENDING"

      const payload = {
        paidAmount: newPayment.paidAmount,
        paymentDate: newPayment.paymentDate,
        modeOfPayment: newPayment.modeOfPayment,
        bankName: newPayment.bankName,
        transactionId: newPayment.transactionId || "",
        utrNumber: newPayment.utrNumber?.trim() || "",
        chequeNumber: newPayment.chequeNumber?.trim() || "",
        remark: buildRemarkWithReceiptPayee(newPayment.remark, newPayment.receiptPayeeName),
        receiptPhoto: newPayment.receiptPhoto || [],
        isWalletPayment: isWalletPayment,
        paymentStatus: paymentStatus
      }

      console.log("Payment payload:", payload)
      console.log("isWalletPayment value:", isWalletPayment)
      console.log("newPayment.isWalletPayment:", newPayment.isWalletPayment)

      const response = await instance.request(payload, [orderId])

      if (response?.data) {
        // Log dealer wallet payment processing
        if (
          selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
          newPayment.isWalletPayment
        ) {
          console.log("Dealer wallet payment processed successfully")
          console.log("Payment response:", response?.data)
        }
        Toast.success(response?.data?.message || "Payment added successfully")
        setShowPaymentForm(false)
        setExpandedAddPaymentAccordion(false)
        resetPaymentForm(false)

        // Refresh wallet data if it was a wallet payment
        if (newPayment.isWalletPayment) {
          if (selectedOrder?.details?.salesPerson?.jobTitle === "DEALER") {
            await refetchDealerWallet()
          }
        }

        // Set pending update and force refresh
        setPendingOrderUpdate(orderId)

        // Direct API call to refresh orders data
        try {
          const instance = NetworkManager(API.ORDER.GET_ORDERS)
          const params = buildRegularOrderListParams({
            viewMode,
            startDate,
            endDate,
            debouncedSearchTerm,
            orderDateRangeBy,
            selectedSalesPerson,
            selectedVillage,
            selectedDistrict,
            selectedPlant,
            selectedSubtype,
            user,
            page: 1,
            limit: DASHBOARD_ORDERS_PAGE_SIZE,
          })

          let ordersData = []
          if (viewMode === "dispatch_process") {
            const paramsInProcess = { ...params }
            const paramsDispatchedTab = {
              ...params,
              dispatched: true,
              status: "ACCEPTED,FARM_READY",
            }
            delete paramsDispatchedTab.startDate
            delete paramsDispatchedTab.endDate
            const refreshParallel = new AbortController()
            const refreshSig = refreshParallel.signal
            const [resInProcess, resDispatched] = await Promise.all([
              instance.request({}, paramsInProcess, { signal: refreshSig }),
              instance.request({}, paramsDispatchedTab, { signal: refreshSig }),
            ])
            ordersData = mergeOrdersByIdPrimaryFirst(
              resInProcess?.data?.data?.data || [],
              resDispatched?.data?.data?.data || []
            )
          } else {
            const response = await instance.request({}, params)
            ordersData = response?.data?.data?.data || []
          }

          // Process the fresh orders data
          const freshOrders = (ordersData || [])
            .map((data) => {
              const {
                farmer,
                numberOfPlants,
                additionalPlants = 0,
                totalPlants,
                rate,
                salesPerson,
                createdAt,
                orderStatus,
                id,
                payment,
                bookingSlot,
                orderId,
                publicOrderCode,
                whatsappAcceptedSentAt,
                whatsappAcceptedMessageKey,
                whatsappDispatchSentAt,
                whatsappDispatchMessageKey,
                plantType,
                plantSubtype,
                remainingPlants,
                returnedPlants,
                statusChanges,
                orderRemarks,
                dealerOrder,
                farmReadyDate,
                orderBookingDate,
                deliveryDate,
                orderFor
              } = data || {}
              const basePlants = numberOfPlants || 0
              const extraPlants = additionalPlants || 0
              const totalPlantCount =
                typeof totalPlants === "number" ? totalPlants : basePlants + extraPlants
              const remainingPlantCount =
                typeof remainingPlants === "number" ? remainingPlants : totalPlantCount
              const totalOrderAmount = Number(rate * totalPlantCount)
              const latestSlot = mapSlotForUi(bookingSlot)
              const { startDay, endDay } = latestSlot || {}
              const start = startDay ? moment(startDay, "DD-MM-YYYY").format("D") : "N/A"
              const end = endDay ? moment(endDay, "DD-MM-YYYY").format("D") : "N/A"
              const monthYear = startDay
                ? moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")
                : "N/A"
              return {
                order: orderId != null && orderId !== "" ? orderId : publicOrderCode,
                farmerName: orderFor
                  ? `Order for: ${orderFor.name}`
                  : dealerOrder
                  ? `via ${salesPerson?.name || "Unknown"}`
                  : farmer?.name || "Unknown",
                plantType: `${plantType?.name || "Unknown"} -> ${plantSubtype?.name || "Unknown"}`,
                quantity: basePlants,
                totalPlants: totalPlantCount,
                additionalPlants: extraPlants,
                basePlants,
                orderDate: moment(orderBookingDate || createdAt).format(ORDER_DATE_DISPLAY),
                deliveryDate: deliveryDate ? moment(deliveryDate).format(ORDER_DATE_DISPLAY) : "-", // Specific delivery date
                rate,
                total: `₹ ${Number(totalOrderAmount).toFixed(2)}`,
                "Paid Amt": `₹ ${Number(getTotalPaidAmount(payment)).toFixed(2)}`,
                "remaining Amt": `₹ ${(totalOrderAmount - Number(getTotalPaidAmount(payment))).toFixed(2)}`,
                "remaining Plants": remainingPlantCount,
                "returned Plants": returnedPlants || 0,
                orderStatus: orderStatus,
                Delivery: `${start} - ${end} ${monthYear}`,
                "Farm Ready":
                  farmReadyDate && farmReadyDate.length > 0
                    ? moment(farmReadyDate[0]).format(ORDER_DATE_DISPLAY)
                    : "-",
              details: {
                farmer,
                contact: farmer?.mobileNumber,
                orderNotes: "Premium quality seed potatoes",
                soilType: "Sandy loam",
                irrigationType: "Sprinkler system",
                lastDelivery: "2024-11-05",
                payment,
                orderid: id,
                salesPerson,
                plantID: plantType?.id,
                plantSubtypeID: plantSubtype?.id,
                bookingSlot: latestSlot,
                slotHistory: Array.isArray(bookingSlot)
                  ? bookingSlot.filter(Boolean)
                  : bookingSlot
                  ? [bookingSlot]
                  : [],
                rate: rate,
                numberOfPlants: basePlants,
                additionalPlants: extraPlants,
                totalPlants: totalPlantCount,
                remainingPlants: remainingPlantCount,
                orderFor: orderFor || null,
                statusChanges: statusChanges || [],
                orderRemarks: orderRemarks || [],
                deliveryChanges: data.deliveryChanges || [],
                returnHistory: data?.returnHistory || [],
                dispatchHistory: data?.dispatchHistory || [],
              orderEditHistory: data?.orderEditHistory || [], // Include order edit history
              publicOrderCode: publicOrderCode || null,
              whatsappAcceptedSentAt: whatsappAcceptedSentAt || null,
              whatsappAcceptedMessageKey: whatsappAcceptedMessageKey || null,
              whatsappDispatchSentAt: whatsappDispatchSentAt || null,
              whatsappDispatchMessageKey: whatsappDispatchMessageKey || null,
              dealerOrder: dealerOrder || false,
              farmReadyDate: farmReadyDate,
              deliveryDate: deliveryDate || null, // Include deliveryDate in details
              dispatchDayKey: data?.dispatchDayKey || null,
              dispatchTargetDate: data?.dispatchTargetDate || null
              }
              }
            })
            .filter((order) => order != null && order.order != null && order.order !== "")

          // Update the orders state with fresh data
          setOrders(freshOrders)

          // Find and update the selected order
          const updatedOrder = freshOrders.find((order) => order.details.orderid === orderId)
          if (updatedOrder) {
            setSelectedOrder(updatedOrder)
          }
        } catch (error) {
          console.error("Error refreshing orders after payment:", error)
          // Fallback to the original refresh method
          setRefresh(!refresh)
        }
      } else {
        Toast.error("Failed to add payment")
      }
    } catch (error) {
      console.error("Error adding payment:", error)
      Toast.error("Failed to add payment")
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentInputChange = (field, value) => {
    setNewPayment((prev) => {
      const updatedPayment = {
        ...prev,
        [field]: value
      }

      // Update payment status when wallet payment is toggled
      if (field === "isWalletPayment") {
        // Ensure value is a boolean
        const isWalletPayment = Boolean(value)
        updatedPayment.isWalletPayment = isWalletPayment

        // For OFFICE_ADMIN, always keep payment status as PENDING
        // For other roles, keep as PENDING by default - only COLLECTED payments impact wallet
        if (user?.role === "OFFICE_ADMIN") {
          updatedPayment.paymentStatus = "PENDING"
          console.log("OFFICE_ADMIN wallet payment - status set to PENDING")
        } else {
          updatedPayment.paymentStatus = "PENDING" // Default to PENDING for all roles
          console.log(
            "Wallet payment toggled:",
            value,
            "Boolean value:",
            isWalletPayment,
            "Payment status set to:",
            updatedPayment.paymentStatus
          )
        }
      }

      return updatedPayment
    })
  }

  // Function to get dealer wallet balance for payment validation
  const getDealerWalletBalance = () => {
    if (selectedOrder?.details?.salesPerson?.jobTitle === "DEALER") {
      return dealerWalletData?.financial?.availableAmount || 0
    }
    return walletData?.financial?.availableAmount || 0
  }

  // Function to check if dealer wallet payment is available
  const isDealerWalletPaymentAvailable = () => {
    return selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" && dealerWalletData
  }

  // Function to process dealer wallet payment
  const processDealerWalletPayment = async (orderId, paymentAmount) => {
    try {
      console.log("=== processDealerWalletPayment DEBUG ===")
      console.log("Processing dealer wallet payment for order:", orderId)
      console.log("Payment amount:", paymentAmount)
      console.log("Dealer wallet data:", dealerWalletData)

      if (!dealerWalletData?.financial) {
        console.error("No dealer wallet data available")
        return false
      }

      const availableAmount = dealerWalletData.financial.availableAmount || 0

      if (paymentAmount > availableAmount) {
        console.error("Insufficient dealer wallet balance")
        Toast.error(
          `Insufficient dealer wallet balance. Available: ₹${availableAmount.toLocaleString()}`
        )
        return false
      }

      console.log("Dealer wallet payment validation passed")
      return true
    } catch (error) {
      console.error("Error processing dealer wallet payment:", error)
      return false
    }
  }

  // Function to get payment status display text
  const getPaymentStatusDisplay = () => {
    const isWalletPayment = Boolean(newPayment.isWalletPayment)
    const paymentStatus = newPayment.paymentStatus || "PENDING"

    console.log("getPaymentStatusDisplay - newPayment.isWalletPayment:", newPayment.isWalletPayment)
    console.log("getPaymentStatusDisplay - isWalletPayment:", isWalletPayment)
    console.log("getPaymentStatusDisplay - paymentStatus:", paymentStatus)

    if (paymentStatus === "COLLECTED") {
      return {
        status: "COLLECTED",
        color: "text-green-700",
        bgColor: "bg-green-100",
        borderColor: "border-green-200",
        message: isWalletPayment ? "Wallet Payment (Collected)" : "Payment Collected"
      }
    } else {
      return {
        status: "PENDING",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        borderColor: "border-gray-200",
        message: isWalletPayment
          ? "Wallet Payment (Pending)"
          : "Contact Accountant to change status"
      }
    }
  }

  // Function to reset payment form with correct status
  const resetPaymentForm = (isWalletPayment = false) => {
    // Always default to PENDING - only COLLECTED payments impact wallet
    const paymentStatus = "PENDING"

    console.log("Resetting payment form:")
    console.log("isWalletPayment parameter:", isWalletPayment)
    console.log("paymentStatus:", paymentStatus)

    setNewPayment({
      paidAmount: "",
      paymentDate: moment().format("YYYY-MM-DD"),
      modeOfPayment: "",
      bankName: "",
      transactionId: "",
      utrNumber: "",
      chequeNumber: "",
      remark: "",
      receiptPhoto: [],
      receiptPayeeName: "",
      paymentStatus: paymentStatus,
      isWalletPayment: Boolean(isWalletPayment)
    })
  }

  // Function to initialize payment form when opened
  const initializePaymentForm = () => {
    // Always default to false for wallet payment - user must explicitly choose
    const shouldUseWalletPayment = false

    console.log("Initializing payment form:")
    console.log("shouldUseWalletPayment:", shouldUseWalletPayment)

    resetPaymentForm(shouldUseWalletPayment)
  }

  const refreshModalData = async () => {
    if (selectedOrder) {
      try {
        // Fast refresh: hydrate modal from current orders state (avoid full list refetch).
        const updatedOrder = orders.find(
          (order) => order.details.orderid === selectedOrder.details.orderid
        )

        if (updatedOrder) {
          setSelectedOrder(updatedOrder)
        }
      } catch (error) {
        console.error("Error refreshing modal data:", error)
      }
    }
  }

  // Add function to handle row selection
  const toggleRowSelection = (orderId, rowData) => {
    setSelectedRows((prevSelectedRows) => {
      const newSelectedRows = new Map(prevSelectedRows)

      // If row is already selected, remove it
      if (newSelectedRows.has(orderId)) {
        newSelectedRows.delete(orderId)
      } else {
        // Add the full row data to the map
        newSelectedRows.set(orderId, {
          ...rowData,
          details: {
            ...rowData.details,
            orderid: orderId
          }
        })
      }

      return newSelectedRows
    })
  }
  // Add function to handle "Select All" functionality
  const toggleSelectAll = () => {
    if (!orders || orders.length === 0) return

    if (selectedRows.size === orders.length) {
      setSelectedRows(new Set())
    } else {
      const allOrderIds = orders.map((order) => order.details.orderid)
      setSelectedRows(new Set(allOrderIds))
    }
  }

  const getReadyDispatchGroups = async () => {
    if (!isReadyForDispatchTab || showAgriSalesOrders) return
    try {
      const [draftRes, lockedRes, dispatchedRes] = await Promise.all([
        NetworkManager(API.READY_DISPATCH_GROUP.GET_ALL, false, { abortScope: "draft" }).request(
          {},
          { status: "DRAFT" }
        ),
        NetworkManager(API.READY_DISPATCH_GROUP.GET_ALL, false, { abortScope: "locked" }).request(
          {},
          { status: "LOCKED" }
        ),
        NetworkManager(API.READY_DISPATCH_GROUP.GET_ALL, false, { abortScope: "dispatched" }).request(
          {},
          { status: "DISPATCHED" }
        ),
      ])
      const draftList = Array.isArray(draftRes?.data?.data) ? draftRes.data.data : []
      const lockedList = Array.isArray(lockedRes?.data?.data) ? lockedRes.data.data : []
      const dispatchedList = Array.isArray(dispatchedRes?.data?.data)
        ? dispatchedRes.data.data
        : []
      const seen = new Set()
      const merged = []
      for (const g of [...draftList, ...lockedList, ...dispatchedList]) {
        const id = g?._id || g?.id
        const key = id != null ? String(id) : null
        if (!key || seen.has(key)) continue
        seen.add(key)
        merged.push(g)
      }
      merged.sort((a, b) => {
        const ta = new Date(a?.createdAt || 0).getTime()
        const tb = new Date(b?.createdAt || 0).getTime()
        return tb - ta
      })
      setReadyDispatchGroups(merged)
    } catch (error) {
      console.error("Error fetching ready dispatch groups:", error)
      setReadyDispatchGroups([])
    }
  }

  const handleSuggestClubGroups = async () => {
    if (!Number(clubCapacityMax) || Number(clubCapacityMax) <= 0) {
      Toast.error("Please enter valid vehicle capacity")
      return
    }

    const selectedFromMap = selectedRows instanceof Map ? Array.from(selectedRows.values()) : []
    const readyRows = selectedFromMap.length > 0
      ? selectedFromMap
      : (orders || []).filter((r) => !r?.isAgriSalesOrder && r?.orderStatus === "READY_FOR_DISPATCH")

    if (!readyRows.length) {
      Toast.error("No ready-for-dispatch orders available for clubbing")
      return
    }

    setClubLoading(true)
    try {
      const instance = NetworkManager(API.READY_DISPATCH_GROUP.SUGGEST)
      const response = await instance.request({
        orderIds: readyRows.map((r) => r?.details?.orderid).filter(Boolean),
        capacityMeta: {
          type: clubCapacityType,
          unit: clubCapacityUnit,
          max: Number(clubCapacityMax),
        },
      })
      const groups = response?.data?.data?.groups || []
      setClubSuggestedGroups(Array.isArray(groups) ? groups : [])
    } catch (error) {
      console.error("Error suggesting club groups:", error)
      Toast.error(error?.response?.data?.message || "Failed to suggest club groups")
    } finally {
      setClubLoading(false)
    }
  }

  const handleSaveClubGroups = async () => {
    if (!clubSuggestedGroups.length) {
      Toast.error("No suggested groups to save")
      return
    }

    setClubLoading(true)
    try {
      const instance = NetworkManager(API.READY_DISPATCH_GROUP.CREATE)
      await instance.request({
        groups: clubSuggestedGroups.map((g) => ({
          orderIds: g.orderIds,
          capacityMeta: g.capacityMeta,
        })),
      })
      Toast.success("Clubbed groups saved")
      setClubDialogOpen(false)
      setClubSuggestedGroups([])
      await getReadyDispatchGroups()
    } catch (error) {
      console.error("Error saving club groups:", error)
      Toast.error(error?.response?.data?.message || "Failed to save club groups")
    } finally {
      setClubLoading(false)
    }
  }

  const handleConvertGroupToDispatch = async (group) => {
    try {
      const gid = group?._id || group?.id
      if (!gid) return
      const instance = NetworkManager(API.READY_DISPATCH_GROUP.CONVERT_TO_DISPATCH)
      await instance.request({}, [gid])

      const groupedOrderIds = (group?.orderIds || [])
        .map((o) => (typeof o === "string" ? o : o?._id))
        .filter(Boolean)
        .map(String)

      const preselected = new Map()
      ;(orders || []).forEach((row) => {
        const oid = String(row?.details?.orderid || "")
        if (groupedOrderIds.includes(oid)) {
          preselected.set(oid, row)
        }
      })

      if (!preselected.size) {
        Toast.error("No valid orders found for this group in current list")
        return
      }

      setSelectedRows(preselected)
      setDispatchSourceGroupId(String(gid))
      setIsDispatchFormOpen(true)
    } catch (error) {
      console.error("Error converting group to dispatch:", error)
      Toast.error(error?.response?.data?.message || "Failed to open group for dispatch")
    }
  }

  // Tab badges: totals from GET /order/getOrders pagination (`total`), same filters as the list.
  useEffect(() => {
    if (showAgriSalesOrders) return
    if (slotId) {
      setOrderViewTabTotals({
        booking: 0,
        pending: 0,
        accepted: 0,
        cancelled: 0,
        farmready: 0,
        ready_for_dispatch: 0,
        dispatch_process: 0,
        dispatched_vehicle: 0,
      })
      return
    }
    const ac = new AbortController()
    const { signal } = ac
    const baseArgs = {
      startDate,
      endDate,
      debouncedSearchTerm,
      orderDateRangeBy,
      selectedSalesPerson,
      selectedVillage,
      selectedDistrict,
      selectedPlant,
      selectedSubtype,
      user,
      limit: 1,
      page: 1,
    }
    const run = async () => {
      try {
        const instance = NetworkManager(API.ORDER.GET_ORDERS)
        const tabIds = [
          "booking",
          "pending",
          "accepted",
          "cancelled",
          "farmready",
          "ready_for_dispatch",
          "dispatched_vehicle",
        ]
        const singlePromises = tabIds.map((vm) =>
          instance.request(
            {},
            buildRegularOrderListParams({ ...baseArgs, viewMode: vm }),
            { signal }
          )
        )
        const pIn = buildRegularOrderListParams({
          ...baseArgs,
          viewMode: "dispatch_process",
        })
        const pDisp = { ...pIn, dispatched: true, status: "ACCEPTED,FARM_READY" }
        const dispatchPromises = [
          instance.request({}, pIn, { signal }),
          instance.request({}, pDisp, { signal }),
        ]
        const results = await Promise.all([...singlePromises, ...dispatchPromises])
        const nDispatch =
          getOrdersListEnvelopeTotal(results[results.length - 2]) +
          getOrdersListEnvelopeTotal(results[results.length - 1])
        setOrderViewTabTotals({
          booking: getOrdersListEnvelopeTotal(results[0]),
          pending: getOrdersListEnvelopeTotal(results[1]),
          accepted: getOrdersListEnvelopeTotal(results[2]),
          cancelled: getOrdersListEnvelopeTotal(results[3]),
          farmready: getOrdersListEnvelopeTotal(results[4]),
          ready_for_dispatch: getOrdersListEnvelopeTotal(results[5]),
          dispatched_vehicle: getOrdersListEnvelopeTotal(results[6]),
          dispatch_process: nDispatch,
        })
      } catch (e) {
        if (isAbortedRequestError(e)) return
        console.error("Error fetching farmer order tab totals:", e)
      }
    }
    run()
    return () => ac.abort()
  }, [
    showAgriSalesOrders,
    slotId,
    debouncedSearchTerm,
    refresh,
    startDate,
    endDate,
    orderDateRangeBy,
    selectedSalesPerson,
    selectedVillage,
    selectedDistrict,
    selectedPlant,
    selectedSubtype,
    user,
  ])

  // Load initial data
  useEffect(() => {
    getOrders()
    if (showAgriSalesOrders) {
      fetchAgriStatusCounts()
    }
  }, [
    debouncedSearchTerm,
    refresh,
    startDate,
    endDate,
    viewMode,
    selectedSalesPerson,
    selectedVillage,
    selectedDistrict,
    selectedPlant,
    selectedSubtype,
    showAgriSalesOrders, // Reload when switching between regular and Agri Sales orders
    selectedDispatchedBy, // Filter by who dispatched (Ram Agri Inputs)
    agriDispatchStatusFilter, // Reload when status filter tab changes (Ram Agri Inputs)
    orderDateRangeBy,
  ])

  useEffect(() => {
    getReadyDispatchGroups()
  }, [viewMode, showAgriSalesOrders, refresh])

  // Function to fetch sales person data

  // State to track if we need to update modal after payment
  const [pendingOrderUpdate, setPendingOrderUpdate] = useState(null)

  // Update dealer ID for wallet when selectedOrder changes
  useEffect(() => {
    const salesPerson = selectedOrder?.details?.salesPerson

    if (salesPerson?.jobTitle === "DEALER" && salesPerson?._id) {
      console.log("Setting dealer ID for wallet:", salesPerson._id)
      setDealerIdForWallet(salesPerson._id)
    } else {
      console.log("Clearing dealer ID for wallet")
      setDealerIdForWallet(null)
    }
  }, [selectedOrder])

  // Load dealer wallet data when dealer ID changes
  useEffect(() => {
    if (dealerIdForWallet) {
      console.log("Loading dealer wallet for dealer ID:", dealerIdForWallet)
      refetchDealerWallet()
    }
  }, [dealerIdForWallet, refetchDealerWallet])

  // Effect to update modal when orders change and we have a pending update
  useEffect(() => {
    if (pendingOrderUpdate && orders.length > 0) {
      const updatedOrder = orders.find((order) => order.details.orderid === pendingOrderUpdate)
      if (updatedOrder) {
        setSelectedOrder(updatedOrder)
        setPendingOrderUpdate(null) // Clear the pending update
      }
    }
  }, [orders, pendingOrderUpdate])

  // Load filter options on component mount
  useEffect(() => {
    loadFilterOptions()
  }, [])

useEffect(() => {
  if (!selectedPlant) {
    setSubtypes([])
    setSelectedSubtype("")
    return
  }
  loadSubtypeOptions(selectedPlant)
}, [selectedPlant])

  // Listen for dispatch creation events to refresh the list
  useEffect(() => {
    const handleDispatchCreated = () => {
      getOrders()
      getReadyDispatchGroups()
    }

    window.addEventListener("dispatchCreated", handleDispatchCreated)

    return () => {
      window.removeEventListener("dispatchCreated", handleDispatchCreated)
    }
  }, [])

  // Load slots when selectedOrder changes (for modal edit functionality)
  useEffect(() => {
    if (selectedOrder?.details?.plantID && selectedOrder?.details?.plantSubtypeID) {
      getSlots(selectedOrder?.details?.plantID, selectedOrder?.details?.plantSubtypeID)
    }
  }, [selectedOrder])

  useEffect(() => {
    const orderId = selectedOrder?.details?.orderid
    if (!isOrderModalOpen || !orderId || selectedOrder?.isAgriSalesOrder || selectedOrder?.details?.isRamAgriProduct) {
      setLinkedAgriItems([])
      setLinkedAgriLoading(false)
      return
    }

    let mounted = true
    const fetchLinkedAgriItems = async () => {
      try {
        setLinkedAgriLoading(true)
        const instance = NetworkManager(API.INVENTORY.GET_LINKED_AGRI_BY_NURSERY_ORDER)
        const response = await instance.request({}, [orderId])
        const rows = response?.data?.data || []
        if (mounted) {
          setLinkedAgriItems(Array.isArray(rows) ? rows : [])
        }
      } catch (error) {
        if (mounted) setLinkedAgriItems([])
      } finally {
        if (mounted) setLinkedAgriLoading(false)
      }
    }

    fetchLinkedAgriItems()
    return () => {
      mounted = false
    }
  }, [isOrderModalOpen, selectedOrder])

  // Load slots when selectedRow changes (for inline editing)
  useEffect(() => {
    if (selectedRow?.details?.plantID && selectedRow?.details?.plantSubtypeID) {
      getSlots(selectedRow?.details?.plantID, selectedRow?.details?.plantSubtypeID)
    }
  }, [selectedRow])

  // Initialize updatedObject when edit tab is active and selectedOrder changes
  useEffect(() => {
    if (activeTab === "edit" && !canEditOrderCore) {
      setActiveTab("overview")
    }
  }, [activeTab, canEditOrderCore])

  useEffect(() => {
    if (activeTab === "edit" && selectedOrder && canEditOrderCore) {
      const { base } = resolvePlantCounts(selectedOrder)
      setUpdatedObject({
        rate: selectedOrder.rate,
        quantity: base,
        bookingSlot: selectedOrder?.details?.bookingSlot?.slotId,
        deliveryDate: selectedOrder?.details?.deliveryDate 
          ? new Date(selectedOrder.details.deliveryDate) 
          : null,
        salesPerson: selectedOrder?.details?.salesPerson?._id
          ? String(selectedOrder.details.salesPerson._id)
          : ""
      })
      setQuantityDeltaInput("")
    }
  }, [activeTab, selectedOrder, resolvePlantCounts, canEditOrderCore])

const loadPlantOptions = async () => {
  try {
    const instance = NetworkManager(API.slots.GET_PLANTS)
    const response = await instance.request()
    const rawPlants = response?.data || response?.data?.data || []

    const formattedPlants = (rawPlants || [])
      .map((plant) => {
        const id = plant.plantId || plant._id || plant.id || ""
        return {
          label: plant.name,
          value: id ? String(id) : "",
          sowingAllowed: plant.sowingAllowed || false // Track if sowing is allowed (same as AddOrderForm)
        }
      })
      .filter((plant) => plant.value)

    setPlants(formattedPlants)
  } catch (error) {
    console.error("Error loading plants:", error)
    setPlants([])
  }
}

const loadSubtypeOptions = async (plantId) => {
  if (!plantId) {
    setSubtypes([])
    return
  }

  setSubtypesLoading(true)
  try {
    const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
    const response = await instance.request(null, {
      plantId,
      year: currentYear
    })

    const rawSubtypes = response?.data?.subtypes || []
    const formattedSubtypes = rawSubtypes
      .map((subtype) => {
        const id = subtype.subtypeId || subtype._id || ""
        return {
          label: subtype.subtypeName || subtype.name,
          value: id ? String(id) : ""
        }
      })
      .filter((subtype) => subtype.value)

    setSubtypes(formattedSubtypes)
  } catch (error) {
    console.error("Error loading subtypes:", error)
    setSubtypes([])
  } finally {
    setSubtypesLoading(false)
  }
}

const loadFilterOptions = async () => {
    try {
    await loadPlantOptions()
      // Load all salespeople and dealers in a single list
      const salesInstance = NetworkManager(API.USER.GET_USERS)
      const salesResponse = await salesInstance.request(null, { jobTitle: "SALES" })

      const dealersInstance = NetworkManager(API.USER.GET_DEALERS)
      const dealersResponse = await dealersInstance.request()

      // Combine salespeople and dealers
      const combinedData = []

      // Add salespeople
      if (salesResponse?.data?.data) {
        salesResponse.data.data.forEach((salesperson) => {
          combinedData.push({
            label: salesperson.name,
            value: salesperson._id,
            isDealer: false
          })
        })
      }

      // Add dealers with (Dealer) label
      if (dealersResponse?.data?.data) {
        dealersResponse.data.data.forEach((dealer) => {
          combinedData.push({
            label: `${dealer.name} (Dealer)`,
            value: dealer._id,
            isDealer: true
          })
        })
      }

      // Sort by name
      combinedData.sort((a, b) => a.label.localeCompare(b.label))

      setSalesPeople(combinedData || [])

      // Load villages
      const villagesInstance = NetworkManager(API.ORDER.GET_VILLAGES)
      const villagesResponse = await villagesInstance.request()
      if (villagesResponse?.data?.data) {
        setVillages(villagesResponse.data.data || [])
      }

      // Load districts
      const districtsInstance = NetworkManager(API.ORDER.GET_DISTRICTS)
      const districtsResponse = await districtsInstance.request()
      if (districtsResponse?.data?.data) {
        setDistricts(districtsResponse.data.data || [])
      }
    } catch (error) {
      console.error("Error loading filter options:", error)
    }
  }

  // Load Ram Agri Inputs users for "Dispatched By" filter
  const loadRamAgriSalesUsers = async () => {
    try {
      const instance = NetworkManager(API.USER.GET_USERS)
      const response = await instance.request(null, { jobTitle: "RAM_AGRI_SALES" })
      if (response?.data?.data) {
        const users = response.data.data.map((user) => ({
          label: user.name,
          value: user._id,
          phoneNumber: user.phoneNumber,
        }))
        setRamAgriSalesUsers(users)
      }
    } catch (error) {
      console.error("Error loading Ram Agri Inputs users:", error)
    }
  }

  // Fetch vehicles for dispatch
  const fetchAgriVehicles = async () => {
    try {
      const instance = NetworkManager(API.VEHICLE.GET_ACTIVE_VEHICLES)
      const response = await instance.request()
      // Ensure we always set an array
      const vehiclesData = response?.data?.data || response?.data || []
      setAgriVehicles(Array.isArray(vehiclesData) ? vehiclesData : [])
    } catch (error) {
      console.error("Error fetching vehicles:", error)
      setAgriVehicles([]) // Reset to empty array on error
    }
  }

  const extractLinkedDispatchPrefill = (dispatchResponseData) => {
    if (!dispatchResponseData) return null
    const dispatches = Array.isArray(dispatchResponseData.dispatches)
      ? dispatchResponseData.dispatches
      : []
    const history = Array.isArray(dispatchResponseData.dispatchHistory)
      ? dispatchResponseData.dispatchHistory
      : []
    const latestDispatch = dispatches[0] || null
    const latestHistory = history.length ? history[history.length - 1] : null
    const vehicleNumber =
      latestDispatch?.vehicleNumber ||
      latestDispatch?.vehicleName ||
      latestHistory?.dispatch?.vehicleNumber ||
      latestHistory?.dispatch?.vehicleName ||
      ""
    const driverName =
      latestDispatch?.driverName ||
      latestHistory?.dispatch?.driverName ||
      ""
    const driverMobile =
      latestDispatch?.driverMobile ||
      latestHistory?.dispatch?.driverMobile ||
      ""
    const dispatchDate =
      latestDispatch?.dispatchDate ||
      latestHistory?.date ||
      null
    const transportId =
      latestDispatch?.transportId ||
      latestHistory?.dispatch?.transportId ||
      null
    if (!vehicleNumber && !driverName && !driverMobile) return null
    return { vehicleNumber, driverName, driverMobile, dispatchDate, transportId }
  }

  const prefillAgriDispatchFromLinkedRegularOrder = async (selectedOrderIds = []) => {
    const selectedRows = (orders || []).filter((row) =>
      selectedOrderIds.includes(row?.details?.orderid)
    )
    const linkedOrderMap = new Map()
    selectedRows.forEach((row) => {
      const linkedIdRaw = row?.details?.linkedNurseryOrderId
      const linkedId =
        typeof linkedIdRaw === "object" && linkedIdRaw?._id
          ? String(linkedIdRaw._id)
          : linkedIdRaw
          ? String(linkedIdRaw)
          : ""
      if (!linkedId) return
      if (!linkedOrderMap.has(linkedId)) {
        linkedOrderMap.set(linkedId, row?.details?.linkedNurseryOrderCode || "")
      }
    })
    const linkedOrderIds = Array.from(linkedOrderMap.keys())
    if (!linkedOrderIds.length) {
      setAgriDispatchPrefillMeta(null)
      return
    }

    setAgriDispatchPrefillLoading(true)
    try {
      const instance = NetworkManager(API.ORDER.GET_ORDER_DISPATCH_DETAILS)
      const responses = await Promise.allSettled(
        linkedOrderIds.map((orderId) => instance.request({}, [orderId]))
      )
      const candidates = responses
        .map((res, idx) => {
          if (res.status !== "fulfilled") return null
          const prefill = extractLinkedDispatchPrefill(res.value?.data?.data)
          if (!prefill) return null
          return {
            ...prefill,
            linkedOrderId: linkedOrderIds[idx],
            linkedOrderCode: linkedOrderMap.get(linkedOrderIds[idx]) || "",
          }
        })
        .filter(Boolean)

      if (!candidates.length) {
        setAgriDispatchPrefillMeta(null)
        return
      }

      const sortedByLatest = [...candidates].sort(
        (a, b) => new Date(b.dispatchDate || 0).getTime() - new Date(a.dispatchDate || 0).getTime()
      )
      const best = sortedByLatest[0]
      const vehicleVariants = new Set(candidates.map((c) => c.vehicleNumber).filter(Boolean))
      const hasVehicleConflict = vehicleVariants.size > 1

      setAgriDispatchForm((prev) => ({
        ...prev,
        vehicleNumber: best.vehicleNumber || prev.vehicleNumber,
        driverName: best.driverName || prev.driverName,
        driverMobile: best.driverMobile || prev.driverMobile,
      }))
      setAgriDispatchPrefillMeta({
        ...best,
        candidatesCount: candidates.length,
        hasVehicleConflict,
      })
    } catch (error) {
      setAgriDispatchPrefillMeta(null)
    } finally {
      setAgriDispatchPrefillLoading(false)
    }
  }

  // Handle vehicle selection for dispatch
  const handleAgriVehicleSelect = (vehicleId) => {
    const vehiclesArray = Array.isArray(agriVehicles) ? agriVehicles : []
    const vehicle = vehiclesArray.find((v) => v._id === vehicleId || v.id === vehicleId)
    if (vehicle) {
      setAgriDispatchForm((prev) => ({
        ...prev,
        vehicleId: vehicleId,
        vehicleNumber: vehicle.number || "",
        driverName: vehicle.driverName || prev.driverName,
        driverMobile: vehicle.driverMobile || prev.driverMobile,
      }))
    } else {
      setAgriDispatchForm((prev) => ({
        ...prev,
        vehicleId: vehicleId,
      }))
    }
  }

  // Toggle order selection for dispatch
  const toggleAgriOrderSelection = (orderId) => {
    setSelectedAgriSalesOrders((prev) => {
      if (prev.includes(orderId)) {
        return prev.filter((id) => id !== orderId)
      } else {
        return [...prev, orderId]
      }
    })
  }

  // Select all dispatchable orders (ACCEPTED or ASSIGNED — matches dispatch API)
  const selectAllAgriOrders = () => {
    const dispatchableOrders = orders.filter(
      (order) =>
        order.isAgriSalesOrder &&
        (order.orderStatus === "ACCEPTED" || order.orderStatus === "ASSIGNED")
    )
    setSelectedAgriSalesOrders(dispatchableOrders.map((o) => o.details.orderid))
  }

  // Clear all selections
  const clearAgriOrderSelections = () => {
    setSelectedAgriSalesOrders([])
  }

  // Open dispatch modal
  const openAgriDispatchModal = async () => {
    if (selectedAgriSalesOrders.length === 0) {
      Toast.error("Please select at least one order to dispatch")
      return
    }
    fetchAgriVehicles()
    setAgriDispatchPrefillMeta(null)
    setShowAgriDispatchModal(true)
  }

  const handleAgriDispatchModeChange = async (mode) => {
    setAgriDispatchForm((prev) => ({ ...prev, dispatchMode: mode }))
    if (mode === "WITH_ORDER") {
      await prefillAgriDispatchFromLinkedRegularOrder(selectedAgriSalesOrders)
    }
  }

  // Handle dispatch submission
  const handleAgriDispatch = async () => {
    // Validate based on dispatch mode
    if (agriDispatchForm.dispatchMode === "VEHICLE" || agriDispatchForm.dispatchMode === "WITH_ORDER") {
      if (agriDispatchForm.dispatchMode === "WITH_ORDER" && !agriDispatchPrefillMeta) {
        Toast.error("No linked regular dispatch found for 'With Order' mode")
        return
      }
      if (!agriDispatchForm.driverName || !agriDispatchForm.driverMobile) {
        Toast.error("Driver name and mobile are required")
        return
      }
      if (!agriDispatchForm.vehicleNumber && !agriDispatchForm.vehicleId) {
        Toast.error("Please select a vehicle or enter vehicle number")
        return
      }
      if (agriDispatchForm.driverMobile.length !== 10) {
        Toast.error("Driver mobile must be 10 digits")
        return
      }
    } else if (agriDispatchForm.dispatchMode === "COURIER") {
      if (!agriDispatchForm.courierName) {
        Toast.error("Courier service name is required")
        return
      }
    }

    try {
      setAgriDispatchLoading(true)
      const instance = NetworkManager(API.INVENTORY.DISPATCH_AGRI_SALES_ORDERS)
      
      const payload = {
        orderIds: selectedAgriSalesOrders,
        dispatchMode: agriDispatchForm.dispatchMode,
        dispatchNotes: agriDispatchForm.dispatchNotes || "",
      }

      // Add mode-specific fields
      if (agriDispatchForm.dispatchMode === "VEHICLE" || agriDispatchForm.dispatchMode === "WITH_ORDER") {
        payload.vehicleId = agriDispatchForm.vehicleId || null
        payload.vehicleNumber = agriDispatchForm.vehicleNumber
        payload.driverName = agriDispatchForm.driverName
        payload.driverMobile = agriDispatchForm.driverMobile
      } else if (agriDispatchForm.dispatchMode === "COURIER") {
        payload.courierName = agriDispatchForm.courierName
        payload.courierTrackingId = agriDispatchForm.courierTrackingId || ""
        payload.courierContact = agriDispatchForm.courierContact || ""
      }

      const response = await instance.request(payload)

      if (response?.data) {
        Toast.success(
          `${selectedAgriSalesOrders.length} order(s) dispatched successfully via ${
            agriDispatchForm.dispatchMode === "COURIER"
              ? "courier"
              : agriDispatchForm.dispatchMode === "WITH_ORDER"
              ? "linked order"
              : "vehicle"
          }`
        )
        setShowAgriDispatchModal(false)
        setSelectedAgriSalesOrders([])
        setAgriDispatchPrefillMeta(null)
        setAgriDispatchForm({
          dispatchMode: "VEHICLE",
          vehicleId: "",
          vehicleNumber: "",
          driverName: "",
          driverMobile: "",
          courierName: "",
          courierTrackingId: "",
          courierContact: "",
          dispatchNotes: "",
        })
        setAgriDispatchStatusFilter("DISPATCHED")
        getOrders()
        fetchAgriStatusCounts() // Refresh counts after dispatch
      } else {
        Toast.error("Failed to dispatch orders")
      }
    } catch (error) {
      console.error("Error dispatching orders:", error)
      Toast.error(error?.response?.data?.message || "Failed to dispatch orders")
    } finally {
      setAgriDispatchLoading(false)
    }
  }

  // ==================== COMPLETE ORDER HANDLERS ====================
  
  // Toggle order selection for complete
  const toggleAgriCompleteOrderSelection = (orderId) => {
    setSelectedAgriOrdersForComplete((prev) => {
      if (prev.includes(orderId)) {
        // Remove from selection and clear return quantity
        const newReturnQuantities = { ...agriCompleteForm.returnQuantities }
        delete newReturnQuantities[orderId]
        setAgriCompleteForm((f) => ({ ...f, returnQuantities: newReturnQuantities }))
        return prev.filter((id) => id !== orderId)
      } else {
        return [...prev, orderId]
      }
    })
  }

  // Select all dispatched orders for complete
  const selectAllDispatchedOrders = () => {
    const dispatchedOrders = orders.filter(
      (o) => o.orderStatus === "DISPATCHED" || o.details?.dispatchStatus === "DISPATCHED"
    )
    setSelectedAgriOrdersForComplete(dispatchedOrders.map((o) => o.details?.orderid || o.id || o._id))
  }

  // Clear complete selections
  const clearAgriCompleteSelections = () => {
    setSelectedAgriOrdersForComplete([])
    setAgriCompleteForm({
      returnQuantities: {},
      returnReason: "",
      returnNotes: "",
    })
  }

  // Open complete modal
  const openAgriCompleteModal = () => {
    if (selectedAgriOrdersForComplete.length === 0) {
      Toast.error("Please select at least one dispatched order to complete")
      return
    }
    // Initialize return quantities to 0 for all selected orders
    const initialReturnQty = {}
    selectedAgriOrdersForComplete.forEach((id) => {
      initialReturnQty[id] = 0
    })
    setAgriCompleteForm({
      returnQuantities: initialReturnQty,
      returnReason: "",
      returnNotes: "",
    })
    setShowAgriCompleteModal(true)
  }

  // Handle complete order submission
  const handleAgriCompleteOrders = async () => {
    try {
      setAgriCompleteLoading(true)
      const instance = NetworkManager(API.INVENTORY.COMPLETE_AGRI_SALES_ORDERS)
      const payload = {
        orderIds: selectedAgriOrdersForComplete,
        returnQuantities: agriCompleteForm.returnQuantities,
        returnReason: agriCompleteForm.returnReason || "",
        returnNotes: agriCompleteForm.returnNotes || "",
      }

      const response = await instance.request(payload)

      if (response?.data) {
        const totalReturns = Object.values(agriCompleteForm.returnQuantities).filter((q) => q > 0).length
        Toast.success(
          `${selectedAgriOrdersForComplete.length} order(s) completed${totalReturns > 0 ? ` (${totalReturns} with returns)` : ""}`
        )
        setShowAgriCompleteModal(false)
        setSelectedAgriOrdersForComplete([])
        setAgriCompleteForm({
          returnQuantities: {},
          returnReason: "",
          returnNotes: "",
        })
        setAgriDispatchStatusFilter("COMPLETED")
        getOrders()
        fetchAgriStatusCounts() // Refresh counts after complete
      } else {
        Toast.error("Failed to complete orders")
      }
    } catch (error) {
      console.error("Error completing orders:", error)
      Toast.error(error?.response?.data?.message || "Failed to complete orders")
    } finally {
      setAgriCompleteLoading(false)
    }
  }

  // ==================== ASSIGNMENT HANDLERS ====================
  
  // Open assign modal
  const openAssignModal = () => {
    if (selectedAgriSalesOrders.length === 0) {
      Toast.error("Please select at least one order to assign")
      return
    }
    setShowAssignModal(true)
  }

  const getAgriOrdersInCurrentSelection = () =>
    orders.filter(
      (o) =>
        o.isAgriSalesOrder &&
        selectedAgriSalesOrders.includes(o.details?.orderid)
    )

  const selectedAgriOrdersAreAllAccepted = () => {
    const sel = getAgriOrdersInCurrentSelection()
    return sel.length > 0 && sel.every((o) => o.orderStatus === "ACCEPTED")
  }

  const handleAgriBulkCancel = () => {
    const sel = getAgriOrdersInCurrentSelection()
    if (!sel.length) return
    if (!sel.every((o) => o.orderStatus === "ACCEPTED")) {
      Toast.error("Cancel only applies to Accepted orders. Adjust your selection.")
      return
    }
    const n = sel.length
    setStatusRemarkDialog({
      open: true,
      title: n === 1 ? "Cancel order" : `Cancel ${n} orders`,
      description: "Enter a cancellation remark. This same remark is used as cancel reason.",
      remark: "",
      confirmLabel: "Cancel order(s)",
      onSubmit: async (remarkText) => {
        setpatchLoading(true)
        try {
          for (const row of sel) {
            const orderId = row?.details?.orderid || row?.details?._id
            if (!orderId) continue
            const instance = NetworkManager(API.INVENTORY.CANCEL_AGRI_SALES_ORDER)
            await instance.request({ reason: remarkText }, [orderId])
          }
          Toast.success(n === 1 ? "Order cancelled successfully" : `${n} orders cancelled`)
          clearAgriOrderSelections()
          setAgriDispatchStatusFilter("CANCELLED")
          await getOrders()
          fetchAgriStatusCounts()
          refreshComponent()
        } catch (error) {
          console.error("Error cancelling agri order(s):", error)
          const errorMessage =
            error.response?.data?.message || error.message || "Failed to cancel order(s)"
          Toast.error(errorMessage)
        } finally {
          setpatchLoading(false)
        }
      }
    })
  }

  // Handle assign to sales person
  const handleAssignToSalesPerson = async () => {
    if (!assignToUser) {
      Toast.error("Please select a sales person")
      return
    }

    try {
      setAssignLoading(true)
      const instance = NetworkManager(API.INVENTORY.ASSIGN_AGRI_SALES_ORDERS)
      const payload = {
        orderIds: selectedAgriSalesOrders,
        assignToUserId: assignToUser,
        assignmentNotes: assignmentNotes || "",
      }

      const response = await instance.request(payload)

      if (response?.data) {
        Toast.success(response.message || `${selectedAgriSalesOrders.length} order(s) assigned successfully`)
        setShowAssignModal(false)
        setSelectedAgriSalesOrders([])
        setAssignToUser("")
        setAssignmentNotes("")
        setAgriDispatchStatusFilter("ASSIGNED")
        getOrders()
        fetchAgriStatusCounts() // Refresh counts after assign
      } else {
        Toast.error("Failed to assign orders")
      }
    } catch (error) {
      console.error("Error assigning orders:", error)
      Toast.error(error?.response?.data?.message || "Failed to assign orders")
    } finally {
      setAssignLoading(false)
    }
  }

  // Load Ram Agri Inputs users when component mounts or when showing Agri Sales orders
  useEffect(() => {
    if (showAgriSalesOrders) {
      loadRamAgriSalesUsers()
      fetchTodayPendingAgriLoads()
    }
  }, [showAgriSalesOrders])

  const debouncedSearch = React.useCallback(
    debounce((searchValue) => {
      setDebouncedSearchTerm(searchValue)
    }, 500), // 500ms delay
    [] // Empty dependency array to ensure the debounced function doesn't change
  )
  const handleSearchChange = (val) => {
    setSearchTerm(val)
    debouncedSearch(val)
  }

  const clearSearch = () => {
    debouncedSearch.cancel()
    setSearchTerm("")
    setDebouncedSearchTerm("")
  }
  const getTotalPaidAmount = (payments) => {
    if (!payments || !Array.isArray(payments)) return 0
    return payments.reduce(
      (total, payment) => total + (payment?.paymentStatus == "COLLECTED" ? payment.paidAmount : 0),
      0
    )
  }
  const paymentSummary = React.useMemo(() => {
    if (!selectedOrder) return { total: 0, paid: 0, balance: 0 }
    const isAgri = selectedOrder?.isAgriSalesOrder || selectedOrder?.details?.isRamAgriProduct
    const total = isAgri ? (Number(selectedOrder?.details?.totalAmount) || 0) : (selectedOrder?.rate || 0) * (selectedOrderCounts?.total || 0)
    const paid = isAgri ? (Number(selectedOrder?.details?.totalPaidAmount) || getTotalPaidAmount(selectedOrder?.details?.payment || [])) : getTotalPaidAmount(selectedOrder?.details?.payment || [])
    return { total, paid, balance: Math.max(0, total - paid) }
  }, [selectedOrder, selectedOrderCounts])

  const hasActiveQR = React.useMemo(() => {
    const payments = selectedOrder?.details?.payment || []
    const now = new Date()
    return payments.some((p) => p.paymentStatus === "PENDING" && p.qrReferenceId && p.qrExpiresAt && new Date(p.qrExpiresAt) > now)
  }, [selectedOrder?.details?.payment])

  const handleGeneratePaymentQR = async () => {
    // Mongo _id lives in details.orderid for table rows (see getOrders map); some payloads use details._id
    const orderId =
      selectedOrder?.details?._id ??
      selectedOrder?.details?.orderid ??
      selectedOrder?.details?.id
    if (orderId == null || String(orderId).trim() === "") {
      Toast.error("Order not found — open the order again or refresh the list")
      return
    }
    const isAgri = selectedOrder?.isAgriSalesOrder || selectedOrder?.details?.isRamAgriProduct
    setGenerateQRLoading(true)
    try {
      const api = isAgri ? API.INVENTORY.GENERATE_PAYMENT_QR_AGRI : API.ORDER.GENERATE_PAYMENT_QR
      const instance = NetworkManager(api)
      const res = await instance.request({}, [orderId])
      const data = res?.data
      if (data?.success && data?.qrImageOrString != null) {
        const refId = data.qrReferenceId || data.merchantTranId
        setPaymentQRModalData({
          qrImageOrString: data.qrImageOrString,
          amount: data.amount,
          orderId: data.orderId,
          customerName: data.customerName,
          mobileNumber: data.mobileNumber,
          expiresAt: data.expiresAt,
          qrReferenceId: refId,
          merchantTranId: refId,
        })
        setPaymentQRModalOpen(true)
        Toast.success("QR generated")
        refreshModalData()
      } else {
        Toast.error(data?.message || "Failed to generate QR")
      }
    } catch (err) {
      Toast.error(err?.response?.data?.message || "Failed to generate payment QR")
    } finally {
      setGenerateQRLoading(false)
    }
  }

  const handleVerifyIciciForPayment = async (payment) => {
    const mtid = payment?.merchantTranId || payment?.qrReferenceId
    if (!mtid || String(mtid).trim() === "") {
      Toast.error("No ICICI transaction reference on this payment")
      return
    }
    const pid = payment?._id != null ? String(payment._id) : ""
    setVerifyIciciLoadingPaymentId(pid || "modal")
    try {
      await axiosInstance.get(`/api/payments/icici/status/${encodeURIComponent(String(mtid).trim())}`)
      Toast.success("ICICI payment status checked — bank fields updated if matched")
      await refreshModalData()
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "ICICI status check failed"
      Toast.error(msg)
    } finally {
      setVerifyIciciLoadingPaymentId(null)
    }
  }

const currentYear = new Date().getFullYear()

const getLatestSlot = (slotData) => {
  if (!slotData) return null
  if (Array.isArray(slotData)) {
    const filtered = slotData.filter(Boolean)
    if (!filtered.length) return null
    return filtered[filtered.length - 1]
  }
  return slotData
}

const mapSlotForUi = (slotData) => {
  const latestSlot = getLatestSlot(slotData)
  if (!latestSlot) return null
  const slotId =
    latestSlot.slotId ||
    latestSlot.id ||
    latestSlot._id ||
    latestSlot.value ||
    latestSlot.slot_id ||
    latestSlot.slotID
  return { ...latestSlot, slotId }
}

  // Helper function to get slot ID for a specific date
  const getSlotIdForDate = (selectedDate) => {
    if (!selectedDate || slots.length === 0) return null

    const selectedMoment = moment(selectedDate)

    for (const slot of slots) {
      if (!slot.startDay || !slot.endDay) continue

      const slotStart = moment(slot.startDay, "DD-MM-YYYY")
      const slotEnd = moment(slot.endDay, "DD-MM-YYYY")

      // Check if the selected date falls within this slot's range
      if (
        selectedMoment.isSameOrAfter(slotStart, "day") &&
        selectedMoment.isSameOrBefore(slotEnd, "day")
      ) {
        return slot.value
      }
    }

    return null
  }

  // Helper function to check if a date should be disabled (not in any slot)
  const isDateDisabled = (date) => {
    if (!date || slots.length === 0) return true

    const dateMoment = moment(date)

    for (const slot of slots) {
      if (!slot.startDay || !slot.endDay) continue

      const slotStart = moment(slot.startDay, "DD-MM-YYYY")
      const slotEnd = moment(slot.endDay, "DD-MM-YYYY")

      // If date is within any slot range, it's not disabled
      if (dateMoment.isSameOrAfter(slotStart, "day") && dateMoment.isSameOrBefore(slotEnd, "day")) {
        return false
      }
    }

    return true
  }

  // Helper function to get available quantity for a specific date
  const getAvailableQuantityForDate = (selectedDate) => {
    const slotId = getSlotIdForDate(selectedDate)
    if (!slotId) return null

    const slot = slots.find((s) => s.value === slotId)
    return slot?.available || null
  }

  // Helper function to get slot details for a specific date
  const getSlotDetailsForDate = (selectedDate) => {
    const slotId = getSlotIdForDate(selectedDate)
    if (!slotId) return null

    return slots.find((s) => s.value === slotId)
  }
  React.useEffect(() => {
    // Cleanup the debounced function when component unmounts
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  const getSlots = async (plantId, subtypeId) => {
    setSlotsLoading(true)
    try {
      // Per-year abortScope so parallel /slots/simple calls do not cancel each other
      const years = [2025, 2026]
      const responses = await Promise.all(
        years.map((year) =>
          NetworkManager(API.slots.GET_SIMPLE_SLOTS, false, { abortScope: `y${year}` }).request(
            {},
            { plantId, subtypeId, year }
          )
        )
      )

      // Combine slots from both years
      let allSlotsData = []
      
      responses.forEach((response) => {
        const rawSlots =
          response?.data?.data?.slots ||
          response?.data?.slots ||
          response?.data?.data ||
          []

        const slotsData = Array.isArray(rawSlots)
          ? rawSlots
          : Array.isArray(rawSlots?.slots)
          ? rawSlots.slots
          : []

        allSlotsData = [...allSlotsData, ...slotsData]
      })

      if (allSlotsData.length > 0) {
        // Check if this plant has sowing allowed
        const selectedPlant = plants.find((p) => p.value === plantId)
        const isSowingAllowedPlant = selectedPlant?.sowingAllowed || false

        const processedSlots = allSlotsData
          .map((slot) => {
            const {
              startDay,
              endDay,
              month,
              totalBookedPlants,
              totalPlants,
              status,
              _id,
              availablePlants
            } = slot || {}

            if (!startDay || !endDay) return null

            // Validate date format
            const startDateValid = moment(startDay, "DD-MM-YYYY", true).isValid()
            const endDateValid = moment(endDay, "DD-MM-YYYY", true).isValid()

            if (!startDateValid || !endDateValid) return null

            const start = moment(startDay, "DD-MM-YYYY").format("D")
            const end = moment(endDay, "DD-MM-YYYY").format("D")
            const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")

            // Calculate available plants (can be negative for sowing-allowed plants)
            const available = availablePlants !== undefined ? availablePlants : totalPlants - (totalBookedPlants || 0)

            return {
              label: `${start} - ${end} ${monthYear} (${available} available)`,
              value: _id,
              available: available,
              availableQuantity: available, // Keep for compatibility
              totalPlants: totalPlants,
              totalBookedPlants: totalBookedPlants || 0,
              startDay: startDay,
              endDay: endDay
            }
          })
          .filter((slot) => {
            // For sowing-allowed plants, show all slots (even with negative availability)
            // For regular plants, only show slots with positive availability
            return slot !== null && (isSowingAllowedPlant || slot.available > 0)
          })

        setSlots(processedSlots)
      } else {
        setSlots([])
      }
    } catch (error) {
      console.error("Error loading slots:", error)
      Toast.error("Failed to load available slots")
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  // Function to fetch counts for all statuses (without status filter)
  const fetchAgriStatusCounts = async () => {
    if (!showAgriSalesOrders) return
    
    try {
      // Fetch all orders for Ram Agri tab counts
      const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS)
      const params = {
        search: debouncedSearchTerm,
        limit: 10000,
        page: 1,
      }

      if (startDate && endDate && !debouncedSearchTerm?.trim()) {
        params.startDate = moment(startDate).format("YYYY-MM-DD")
        params.endDate = moment(endDate).format("YYYY-MM-DD")
      }

      // Don't apply status filter - fetch all orders to calculate counts
      if (selectedSalesPerson) {
        params.createdBy = selectedSalesPerson
      }

      const response = await instance.request({}, params)
      const ordersData = response?.data?.data?.data || response?.data?.data || []

      const counts = {
        ALL: ordersData.length,
        ACCEPTED: ordersData.filter((o) => o.orderStatus === "ACCEPTED").length,
        ASSIGNED: ordersData.filter((o) => o.orderStatus === "ASSIGNED").length,
        DISPATCHED: ordersData.filter(
          (o) => o.orderStatus === "DISPATCHED" || o.dispatchStatus === "DISPATCHED"
        ).length,
        COMPLETED: ordersData.filter(
          (o) =>
            o.orderStatus === "COMPLETED" ||
            o.dispatchStatus === "DELIVERED"
        ).length,
      }

      setAgriStatusCounts(counts)
    } catch (error) {
      console.error("Error fetching status counts:", error)
    }
  }

  const fetchTodayPendingAgriLoads = async () => {
    if (!showAgriSalesOrders || !isAgriLoadAdmin) {
      setTodayPendingAgriLoads([])
      return
    }
    try {
      const instance = NetworkManager(API.INVENTORY.GET_TODAY_PENDING_LINKED_AGRI_LOAD)
      const response = await instance.request()
      const rows = response?.data?.data || []
      setTodayPendingAgriLoads(Array.isArray(rows) ? rows : [])
    } catch (error) {
      setTodayPendingAgriLoads([])
    }
  }

  const markLinkedAgriLoaded = async (agriOrderId) => {
    if (!agriOrderId) return
    try {
      setAgriLoadActionBusyId(agriOrderId)
      const instance = NetworkManager(API.INVENTORY.MARK_LINKED_AGRI_LOADED)
      await instance.request({}, [agriOrderId])
      Toast.success("Marked as loaded")
      fetchTodayPendingAgriLoads()
      getOrders()
    } catch (error) {
      Toast.error(error?.response?.data?.message || "Failed to mark loaded")
    } finally {
      setAgriLoadActionBusyId(null)
    }
  }

  const mapRegularOrdersForUi = (ordersData = []) =>
    (ordersData || [])
      .map((data) => {
        const {
          farmer,
          numberOfPlants,
          additionalPlants = 0,
          totalPlants,
          rate,
          salesPerson,
          createdAt,
          orderStatus,
          id,
          payment,
          bookingSlot,
          orderId,
          publicOrderCode,
          whatsappAcceptedSentAt,
          whatsappAcceptedMessageKey,
          whatsappDispatchSentAt,
          whatsappDispatchMessageKey,
          plantType,
          plantSubtype,
          remainingPlants,
          returnedPlants,
          statusChanges,
          orderRemarks,
          dealerOrder,
          farmReadyDate,
          farmReadyDateChanges,
          orderBookingDate,
          deliveryDate,
          orderFor,
          cavity,
        } = data || {}
        const basePlants = numberOfPlants || 0
        const extraPlants = additionalPlants || 0
        const totalPlantCount =
          typeof totalPlants === "number" ? totalPlants : basePlants + extraPlants
        const remainingPlantCount =
          typeof remainingPlants === "number" ? remainingPlants : totalPlantCount
        const totalOrderAmount = Number(rate * totalPlantCount)

        const latestSlot = mapSlotForUi(bookingSlot)
        const { startDay, endDay } = latestSlot || {}
        const start = startDay ? moment(startDay, "DD-MM-YYYY").format("D") : "N/A"
        const end = endDay ? moment(endDay, "DD-MM-YYYY").format("D") : "N/A"
        const monthYear = startDay ? moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY") : "N/A"
        return {
          order: orderId != null && orderId !== "" ? orderId : publicOrderCode,
          farmerName: orderFor
            ? `${farmer?.name || "Unknown"} (Order for: ${orderFor.name})`
            : dealerOrder
            ? `via ${salesPerson?.name || "Unknown"}`
            : farmer?.name || "Unknown",
          plantType: `${plantType?.name || "Unknown"} -> ${plantSubtype?.name || "Unknown"}`,
          quantity: basePlants,
          totalPlants: totalPlantCount,
          additionalPlants: extraPlants,
          basePlants,
          orderDate: moment(orderBookingDate || createdAt).format(ORDER_DATE_DISPLAY),
          deliveryDate: deliveryDate ? moment(deliveryDate).format(ORDER_DATE_DISPLAY) : "-",
          rate,
          total: `₹ ${Number(totalOrderAmount).toFixed(2)}`,
          "Paid Amt": `₹ ${Number(getTotalPaidAmount(payment)).toFixed(2)}`,
          "remaining Amt": `₹ ${(totalOrderAmount - Number(getTotalPaidAmount(payment))).toFixed(2)}`,
          "remaining Plants": remainingPlantCount,
          "returned Plants": returnedPlants || 0,
          orderStatus: orderStatus,
          Delivery: `${start} - ${end} ${monthYear}`,
          "Farm Ready": farmReadyDate ? moment(farmReadyDate).format(ORDER_DATE_DISPLAY) : "-",
          details: {
            farmer,
            contact: farmer?.mobileNumber,
            orderNotes: "Premium quality seed potatoes",
            soilType: "Sandy loam",
            irrigationType: "Sprinkler system",
            lastDelivery: "2024-11-05",
            payment,
            orderid: id,
            salesPerson,
            plantID: plantType?.id,
            plantSubtypeID: plantSubtype?.id,
            bookingSlot: latestSlot,
            rate: rate,
            numberOfPlants: basePlants,
            additionalPlants: extraPlants,
            totalPlants: totalPlantCount,
            remainingPlants: remainingPlantCount,
            orderFor: orderFor || null,
            statusChanges: statusChanges || [],
            orderRemarks: orderRemarks || [],
            deliveryChanges: data.deliveryChanges || [],
            returnHistory: data?.returnHistory || [],
            dispatchHistory: data?.dispatchHistory || [],
            orderEditHistory: data?.orderEditHistory || [],
            publicOrderCode: publicOrderCode || null,
            whatsappAcceptedSentAt: whatsappAcceptedSentAt || null,
            whatsappAcceptedMessageKey: whatsappAcceptedMessageKey || null,
            whatsappDispatchSentAt: whatsappDispatchSentAt || null,
            whatsappDispatchMessageKey: whatsappDispatchMessageKey || null,
            dealerOrder: !!dealerOrder,
            farmReadyDate: farmReadyDate,
            farmReadyDateChanges: farmReadyDateChanges || [],
            deliveryDate: deliveryDate || null,
            dispatchDayKey: data?.dispatchDayKey || null,
            dispatchTargetDate: data?.dispatchTargetDate || null,
            cavity: cavity || null,
            cavityName: getCavityDisplayLabel(cavity),
            cavityId: getCavityIdString(cavity) || null,
            slotHistory: Array.isArray(bookingSlot)
              ? bookingSlot.filter(Boolean)
              : bookingSlot
              ? [bookingSlot]
              : [],
          },
        }
      })
      .filter((order) => order != null && order.order != null && order.order !== "")

  const getOrders = async () => {
    getOrdersAbortRef.current?.abort()
    loadMoreOrdersAbortRef.current?.abort()
    const listAbort = new AbortController()
    getOrdersAbortRef.current = listAbort
    const signal = listAbort.signal
    const reqSeq = ++getOrdersRequestSeqRef.current

    setLoading(true)

    // If showing Agri Sales orders, use different endpoint
    if (showAgriSalesOrders) {
      try {
        const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS)

        const params = {
          search: debouncedSearchTerm || "",
          limit: DASHBOARD_ORDERS_PAGE_SIZE,
          page: 1,
        }

        if (startDate && endDate && !debouncedSearchTerm?.trim()) {
          params.startDate = moment(startDate).format("YYYY-MM-DD")
          params.endDate = moment(endDate).format("YYYY-MM-DD")
        }

        if (agriDispatchStatusFilter === "ACCEPTED") {
          params.orderStatus = "ACCEPTED"
        } else if (agriDispatchStatusFilter === "ASSIGNED") {
          params.orderStatus = "ASSIGNED"
        } else if (agriDispatchStatusFilter === "DISPATCHED") {
          params.orderStatus = "DISPATCHED"
          params.dispatchStatus = "DISPATCHED"
        } else if (agriDispatchStatusFilter === "COMPLETED") {
          params.orderStatus = "COMPLETED"
        } else if (agriDispatchStatusFilter === "CANCELLED") {
          params.orderStatus = "CANCELLED"
        }
        // ALL: omit orderStatus / dispatchStatus

        if (selectedSalesPerson) {
          params.createdBy = selectedSalesPerson
        }

        const response = await instance.request({}, params, { signal })
        let ordersData = response?.data?.data?.data || response?.data?.data || []
        
        // Fetch counts in parallel (without blocking)
        fetchAgriStatusCounts()

        // Transform Agri Sales orders to match the expected format
        const transformedOrders = ordersData.map((order) => {
          const {
            orderNumber,
            customerName,
            customerMobile,
            customerVillage,
            customerTaluka,
            customerDistrict,
            productName,
            quantity,
            unit,
            rate,
            totalAmount,
            orderStatus,
            payment,
            totalPaidAmount,
            balanceAmount,
            orderDate,
            deliveryDate,
            createdAt,
            notes,
            createdBy,
            productId,
            _id,
            // Dispatch fields
            dispatchStatus,
            dispatchMode,
            vehicleNumber,
            driverName,
            driverMobile,
            dispatchedAt,
            dispatchedBy,
            dispatchNotes,
            // Courier fields
            courierName,
            courierTrackingId,
            courierContact,
            // Assignment fields
            assignedTo,
            assignedAt,
            assignedBy,
            assignmentNotes,
            // Return and delivery fields
            returnQuantity,
            deliveredQuantity,
            returnReason,
            returnNotes,
            linkedNurseryOrderId,
            linkedNurseryOrderCode,
          } = order

          // Handle populated fields (productId, createdBy, assignedTo can be objects)
          const productIdValue = productId?._id || productId || null
          const productNameValue = productName || productId?.name || ""
          const createdByValue = createdBy?._id || createdBy || null
          const createdByName = createdBy?.name || ""
          const assignedToValue = assignedTo?._id || assignedTo || null
          const assignedToName = assignedTo?.name || ""

          // For completed orders, use deliveredQuantity for display; otherwise use quantity
          const displayQuantity = (orderStatus === "COMPLETED" && deliveredQuantity > 0) ? deliveredQuantity : quantity

          return {
            order: orderNumber,
            farmerName: customerName,
            plantType: productNameValue,
            quantity: quantity, // Original quantity
            deliveredQuantity: deliveredQuantity || quantity, // Final delivered quantity
            totalPlants: displayQuantity, // Display quantity (final for completed orders)
            additionalPlants: 0,
            basePlants: quantity,
            orderDate: moment(orderDate || createdAt).format(ORDER_DATE_DISPLAY),
            deliveryDate: deliveryDate ? moment(deliveryDate).format(ORDER_DATE_DISPLAY) : "-",
            rate: rate,
            total: `₹ ${Number(totalAmount || 0).toFixed(2)}`,
            "Paid Amt": `₹ ${Number(totalPaidAmount || 0).toFixed(2)}`,
            "remaining Amt": `₹ ${Number(balanceAmount || totalAmount - (totalPaidAmount || 0)).toFixed(2)}`,
            "remaining Plants": displayQuantity, // For Agri Sales, remaining is same as quantity until accepted
            "returned Plants": returnQuantity || 0,
            orderStatus: orderStatus,
            dispatchStatus: dispatchStatus || "NOT_DISPATCHED",
            Delivery: "-", // Agri Sales orders don't have slots
            "Farm Ready": "-",
            isAgriSalesOrder: true, // Flag to identify Agri Sales orders
            details: {
              customerName,
              customerMobile,
              customerVillage,
                customerTaluka,
                customerDistrict,
                productName: productNameValue,
                productId: productIdValue,
              quantity,
              deliveredQuantity: deliveredQuantity || quantity,
              returnQuantity: returnQuantity || 0,
              unit,
              rate,
              totalAmount,
              orderStatus,
              payment: payment || [],
              totalPaidAmount: totalPaidAmount || 0,
              balanceAmount: balanceAmount || totalAmount,
              orderDate,
              deliveryDate,
                notes,
                createdBy: createdByValue,
                createdByName: createdByName,
                orderid: _id,
              orderNumber,
              // Dispatch details
              dispatchStatus: dispatchStatus || "NOT_DISPATCHED",
              dispatchMode: dispatchMode || "VEHICLE",
              vehicleNumber,
              driverName,
              driverMobile,
              dispatchedAt,
              dispatchedBy,
              dispatchNotes,
              // Courier details
              courierName,
              courierTrackingId,
              courierContact,
              // Assignment details
              assignedTo: assignedToValue,
              assignedToName: assignedToName,
              assignedAt,
              assignedBy,
              assignmentNotes,
              // Return details
              returnReason,
              returnNotes,
              linkedNurseryOrderId,
              linkedNurseryOrderCode,
            },
          }
        })

        // Apply additional filters
        let filteredOrders = transformedOrders
        if (selectedVillage) {
          filteredOrders = filteredOrders.filter((o) => o.details.customerVillage === selectedVillage)
        }
        if (selectedDistrict) {
          filteredOrders = filteredOrders.filter((o) => o.details.customerDistrict === selectedDistrict)
        }
        // Filter by dispatchedBy (Ram Agri Inputs user who dispatched)
        if (selectedDispatchedBy) {
          filteredOrders = filteredOrders.filter((o) => {
            const dispatchedById = o.details.dispatchedBy?._id || o.details.dispatchedBy
            return dispatchedById === selectedDispatchedBy
          })
        }

        if (reqSeq !== getOrdersRequestSeqRef.current) return
        setOrders(filteredOrders)
        setOrdersPage(1)
        setHasMoreOrders(false)
        return
      } catch (error) {
        if (isAbortedRequestError(error)) return
        if (reqSeq !== getOrdersRequestSeqRef.current) return
        console.error("Error fetching Agri Sales orders:", error)
        Toast.error("Failed to load Agri Sales orders")
        setOrders([])
        setOrdersPage(1)
        setHasMoreOrders(false)
      } finally {
        if (reqSeq === getOrdersRequestSeqRef.current) setLoading(false)
      }
      return
    }

    // Use appropriate endpoint based on slotId for regular orders
    const instance = slotId
      ? NetworkManager(API.ORDER.GET_ORDERS_SLOTS)
      : NetworkManager(API.ORDER.GET_ORDERS)

    const params = buildRegularOrderListParams({
      viewMode,
      startDate,
      endDate,
      debouncedSearchTerm,
      orderDateRangeBy,
      selectedSalesPerson,
      selectedVillage,
      selectedDistrict,
      selectedPlant,
      selectedSubtype,
      user,
      page: 1,
      limit: DASHBOARD_ORDERS_PAGE_SIZE,
    })

    let ordersData = []
    let nextPageAvailable = false

    try {
      if (slotId) {
        const emps = await instance.request(
          {},
          {
            slotId,
            monthName,
            startDay,
            endDay,
            limit: DASHBOARD_ORDERS_PAGE_SIZE,
            page: 1,
          },
          { signal }
        )
        ordersData = emps?.data?.data?.data || []
        nextPageAvailable = false
      } else if (viewMode === "dispatch_process") {
        const paramsInProcess = { ...params }
        const paramsDispatchedTab = {
          ...params,
          dispatched: true,
          status: "ACCEPTED,FARM_READY",
        }
        delete paramsDispatchedTab.startDate
        delete paramsDispatchedTab.endDate
        const [resInProcess, resDispatched] = await Promise.all([
          instance.request({}, paramsInProcess, { signal }),
          instance.request({}, paramsDispatchedTab, { signal }),
        ])
        ordersData = mergeOrdersByIdPrimaryFirst(
          resInProcess?.data?.data?.data || [],
          resDispatched?.data?.data?.data || []
        )
        nextPageAvailable = false
      } else {
        const emps = await instance.request({}, params, { signal })

        ordersData = emps?.data?.data?.data || []
        const currentPage = Number(emps?.data?.data?.currentPage || 1)
        const totalPages = Number(emps?.data?.data?.totalPages || 1)
        nextPageAvailable = currentPage < totalPages
      }

      if (reqSeq !== getOrdersRequestSeqRef.current) return
      setOrders(mapRegularOrdersForUi(ordersData))
      setOrdersPage(1)
      setHasMoreOrders(nextPageAvailable)
    } catch (err) {
      if (isAbortedRequestError(err)) return
      if (reqSeq !== getOrdersRequestSeqRef.current) return
      console.error("Error fetching orders:", err)
      Toast.error(err?.message || "Failed to load orders")
      setOrders([])
      setOrdersPage(1)
      setHasMoreOrders(false)
    } finally {
      if (reqSeq === getOrdersRequestSeqRef.current) setLoading(false)
    }

    // setEmployees(emps?.data?.data)
  }

  const loadMoreOrders = async () => {
    if (loading || loadingMoreOrders || !hasMoreOrders || showAgriSalesOrders || slotId) return
    if (viewMode === "dispatch_process") return

    loadMoreOrdersAbortRef.current?.abort()
    const moreAbort = new AbortController()
    loadMoreOrdersAbortRef.current = moreAbort
    const signal = moreAbort.signal

    setLoadingMoreOrders(true)
    try {
      const instance = NetworkManager(API.ORDER.GET_ORDERS)
      const params = buildRegularOrderListParams({
        viewMode,
        startDate,
        endDate,
        debouncedSearchTerm,
        orderDateRangeBy,
        selectedSalesPerson,
        selectedVillage,
        selectedDistrict,
        selectedPlant,
        selectedSubtype,
        user,
        page: ordersPage + 1,
        limit: DASHBOARD_ORDERS_PAGE_SIZE,
      })

      const res = await instance.request({}, params, { signal })
      const nextOrders = mapRegularOrdersForUi(res?.data?.data?.data || [])
      const currentPage = Number(res?.data?.data?.currentPage || params.page)
      const totalPages = Number(res?.data?.data?.totalPages || currentPage)
      setOrders((prev) => [...prev, ...nextOrders])
      setOrdersPage(currentPage)
      setHasMoreOrders(currentPage < totalPages)
    } catch (error) {
      if (isAbortedRequestError(error)) return
      console.error("Error loading more orders:", error)
    } finally {
      setLoadingMoreOrders(false)
    }
  }

  loadMoreOrdersRef.current = loadMoreOrders

  const pacthOrders = async (patchObj, row) => {
    setpatchLoading(true)

    try {
      // Check if this is an agri sales order
      const isAgriSalesOrder = row?.isAgriSalesOrder || row?.details?.isRamAgriProduct || false
      
      // Handle Date objects for farmReadyDate and deliveryDate
      const dataToSend = { ...patchObj }

      // Convert deliveryDate to ISO format if it's a Date object
      if (dataToSend.deliveryDate && dataToSend.deliveryDate instanceof Date) {
        dataToSend.deliveryDate = dataToSend.deliveryDate.toISOString()
        console.log("Converted deliveryDate to ISO:", dataToSend.deliveryDate)
      }

      console.log("=== PATCH ORDER PAYLOAD DEBUG ===")
      console.log("Is Agri Sales Order:", isAgriSalesOrder)
      console.log("Full dataToSend:", dataToSend)
      console.log("deliveryDate in payload:", dataToSend.deliveryDate)
      console.log("bookingSlot in payload:", dataToSend.bookingSlot)

      // For agri sales orders, skip slot validation (they don't use slots)
      if (!isAgriSalesOrder) {
        // Validate slot capacity if booking slot is being changed (only for regular orders)
        if (dataToSend.bookingSlot && dataToSend.quantity) {
          const selectedSlot = slots.find((slot) => slot.value === dataToSend.bookingSlot)
          if (selectedSlot) {
            const requestedQuantity = Number(dataToSend.quantity)
            const availableCapacity = selectedSlot.available

            // If this is the same order, add back its current quantity to available capacity
            const currentOrderQuantity = row?.quantity || 0
            const adjustedAvailableCapacity = availableCapacity + currentOrderQuantity

            if (requestedQuantity > adjustedAvailableCapacity) {
              Toast.error(
                `Insufficient slot capacity. Available: ${adjustedAvailableCapacity}, Requested: ${requestedQuantity}`
              )
              setpatchLoading(false)
              return
            }
          }
        }

        // Validate quantity changes (only for regular orders)
        const hasQuantityPatch =
          dataToSend.quantity !== undefined &&
          dataToSend.quantity !== null &&
          String(dataToSend.quantity).trim() !== ""
        if (hasQuantityPatch) {
          if (!canEditOrderPlantQuantity(row?.orderStatus)) {
            Toast.error(
              "Plant quantity cannot be changed after Ready for dispatch or for completed/cancelled orders."
            )
            setpatchLoading(false)
            return
          }
          const newQuantity = Number(dataToSend.quantity)
          const currentQuantity = Number(row?.quantity || 0)
          const isDealerBulkOrder = Boolean(row?.details?.dealerOrder)

          if (!Number.isFinite(newQuantity) || newQuantity < 0) {
            Toast.error("Invalid quantity")
            setpatchLoading(false)
            return
          }

          if (newQuantity <= 0 && !isDealerBulkOrder) {
            Toast.error("Quantity must be greater than 0")
            setpatchLoading(false)
            return
          }

          // If quantity is being increased, check slot capacity
          if (newQuantity > currentQuantity) {
            const slotId = dataToSend.bookingSlot || row?.details?.bookingSlot?.slotId
            if (slotId) {
              const selectedSlot = slots.find((slot) => slot.value === slotId)
              if (selectedSlot) {
                const quantityIncrease = newQuantity - currentQuantity
                if (quantityIncrease > selectedSlot.available) {
                  Toast.error(
                    `Cannot increase quantity. Available capacity: ${selectedSlot.available}`
                  )
                  setpatchLoading(false)
                  return
                }
              }
            }
          }
        }
      } else {
        // For agri sales orders, validate quantity
        if (dataToSend.quantity) {
          const newQuantity = Number(dataToSend.quantity)
          if (newQuantity <= 0) {
            Toast.error("Quantity must be greater than 0")
            setpatchLoading(false)
            return
          }
        }
      }

      // Use appropriate endpoint based on order type
      let instance
      let payload
      let urlParams = null
      
      if (isAgriSalesOrder) {
        // Agri Sales Order update - use PATCH /inventory/agri-sales-orders/:id
        instance = NetworkManager(API.INVENTORY.UPDATE_AGRI_SALES_ORDER)
        // Remove fields that don't apply to agri sales orders
        const { numberOfPlants, bookingSlot, id, ...agriPayload } = dataToSend
        // For agri sales orders, id goes in URL params as array
        urlParams = [dataToSend.id]
        payload = agriPayload
      } else {
        // Regular Order update
        instance = NetworkManager(API.ORDER.UPDATE_ORDER)
        payload = {
          ...dataToSend,
          numberOfPlants: dataToSend?.quantity
        }
      }

      const emps = urlParams 
        ? await instance.request(payload, urlParams)
        : await instance.request(payload)

      if (emps?.error) {
        Toast.error(emps?.error)
        setpatchLoading(false)
        return
      }

      if (emps?.data?.status === "Success") {
        Toast.success("Order updated successfully")

        setEditingRows(new Set())
        setUpdatedObject(null)
        setQuantityDeltaInput("")
        const editedOrderId = String(dataToSend?.id || row?.details?.orderid || "")
        const hasQtyInPatch =
          dataToSend?.quantity !== undefined &&
          dataToSend?.quantity !== null &&
          String(dataToSend.quantity).trim() !== ""
        const nextQty = Number(
          hasQtyInPatch ? dataToSend.quantity : row?.quantity ?? 0
        )
        const nextRate = Number(dataToSend?.rate ?? row?.rate ?? 0)
        const nextOrderStatus =
          dataToSend?.orderStatus !== undefined &&
          dataToSend?.orderStatus !== null &&
          String(dataToSend.orderStatus).trim() !== ""
            ? dataToSend.orderStatus
            : null
        const formatRupee = (amount) =>
          `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

        let patchedOrderForModal = null
        setOrders((prev) =>
          (prev || []).map((o) => {
            const oid = String(o?.details?.orderid || o?.id || o?._id || "")
            if (!editedOrderId || oid !== editedOrderId) return o

            const additional = Number(o?.additionalPlants || 0)
            const totalPlants = Math.max(0, nextQty + additional)
            const paidCollected = Array.isArray(o?.details?.payment)
              ? o.details.payment
                  .filter((p) => p?.paymentStatus === "COLLECTED")
                  .reduce((sum, p) => sum + Number(p?.paidAmount || 0), 0)
              : 0
            const totalAmount = Number(nextRate || 0) * Number(totalPlants || 0)
            const remainingAmount = totalAmount - paidCollected
            const nextDeliveryDate = dataToSend?.deliveryDate
              ? moment(dataToSend.deliveryDate).format(ORDER_DATE_DISPLAY)
              : o?.deliveryDate

            const spId = dataToSend?.salesPerson
            const spOpt =
              spId && salesPeople?.length
                ? salesPeople.find((s) => String(s.value) === String(spId))
                : null
            const nextSalesPerson =
              spId && spOpt
                ? {
                    _id: spId,
                    name: spOpt.label.replace(/\s*\(Dealer\)\s*$/i, "").trim(),
                    jobTitle: spOpt.isDealer ? "DEALER" : "SALES",
                  }
                : o.details?.salesPerson

            const patched = {
              ...o,
              ...(nextOrderStatus ? { orderStatus: nextOrderStatus } : {}),
              rate: nextRate,
              quantity: nextQty,
              basePlants: nextQty,
              totalPlants,
              total: formatRupee(totalAmount),
              ["Paid Amt"]: formatRupee(paidCollected),
              ["remaining Amt"]: formatRupee(remainingAmount),
              deliveryDate: nextDeliveryDate,
              details: {
                ...o.details,
                ...(nextOrderStatus ? { orderStatus: nextOrderStatus } : {}),
                deliveryDate: dataToSend?.deliveryDate || o?.details?.deliveryDate,
                dispatchDayKey: dataToSend?.dispatchDayKey || o?.details?.dispatchDayKey || null,
                dispatchTargetDate: dataToSend?.dispatchDayKey
                  ? moment()
                      .startOf("day")
                      .add(
                        dataToSend.dispatchDayKey === "TODAY"
                          ? 0
                          : dataToSend.dispatchDayKey === "TOMORROW"
                          ? 1
                          : 2,
                        "days"
                      )
                      .toISOString()
                  : o?.details?.dispatchTargetDate || null,
                numberOfPlants: nextQty,
                totalPlants,
                ...(dataToSend?.salesPerson
                  ? { salesPerson: nextSalesPerson }
                  : {}),
              },
            }
            patchedOrderForModal = patched
            return patched
          })
        )

        if (
          selectedOrder &&
          String(selectedOrder?.details?.orderid || "") === editedOrderId &&
          patchedOrderForModal
        ) {
          setSelectedOrder(patchedOrderForModal)
        }

        // Refresh slots to get updated capacity (only for regular orders, not agri sales orders)
        if (!isAgriSalesOrder && (dataToSend.bookingSlot || dataToSend.quantity)) {
          const plantId = row?.details?.plantID || selectedOrder?.details?.plantID
          const subtypeId = row?.details?.plantSubtypeID || selectedOrder?.details?.plantSubtypeID
          if (plantId && subtypeId) {
            setTimeout(() => {
              getSlots(plantId, subtypeId)
            }, 1000) // Small delay to ensure backend has processed the update
          }
        }

        // WATI: farmer orders only — accept / dispatch prompts (skip if already sent successfully)
        const isFarmerOrder = !isAgriSalesOrder && !row?.details?.dealerOrder
        const rowForWatiDialog =
          dataToSend?.orderStatus != null
            ? { ...row, orderStatus: dataToSend.orderStatus }
            : row
        if (
          whatsappMessagingEnabled &&
          dataToSend?.orderStatus === "ACCEPTED" &&
          isFarmerOrder &&
          !row?.details?.whatsappAcceptedSentAt
        ) {
          setWatiDialogMode("accept")
          setWatiDialogOrder(rowForWatiDialog)
          setWatiDialogOpen(true)
        }
        if (
          whatsappMessagingEnabled &&
          dataToSend?.orderStatus === "DISPATCHED" &&
          isFarmerOrder &&
          !row?.details?.whatsappDispatchSentAt
        ) {
          setWatiDialogMode("dispatch")
          setWatiDialogOrder(rowForWatiDialog)
          setWatiDialogOpen(true)
        }

        window.setTimeout(() => refreshComponent(), 500)
      }
    } catch (error) {
      console.error("Error updating order:", error)
      Toast.error("Failed to update order")
    } finally {
      setpatchLoading(false)
    }
  }
  const saveEditedRow = (index, row) => {
    pacthOrders(
      {
        id: row?.details?.orderid,
        ...updatedObject
      },
      row
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-100 text-green-700"
      case "PENDING":
        return "bg-yellow-100 text-yellow-700"
      case "ASSIGNED":
        return "bg-purple-100 text-purple-700"
      case "REJECTED":
      case "CANCELLED":
        return "bg-red-100 text-red-700"
      case "TEMPORARY_CANCELLED":
        return "bg-orange-100 text-orange-700"
      case "DISPATCHED":
      case "PROCESSING":
        return "bg-brand-100 text-brand-700"
      case "COMPLETED":
        return "bg-gray-100 text-gray-700"
      case "PARTIALLY_COMPLETED":
        return "bg-indigo-100 text-indigo-700"
      case "FARM_READY":
        return "bg-green-100 text-green-700 border border-green-300"
      case "READY_FOR_DISPATCH":
        return "bg-teal-100 text-teal-800 border border-teal-200"
      case "DISPATCH_PROCESS":
        return "bg-cyan-100 text-cyan-700"
      default:
        return "bg-gray-50 text-gray-600"
    }
  }

  const formatOrderStatusLabel = (s) => {
    if (!s) return "N/A"
    if (ORDER_STATUS_LABELS[s]) return ORDER_STATUS_LABELS[s]
    return String(s).replace(/_/g, " ")
  }

  const toggleEditing = (index, row) => {
    // console.log(row)
    setSelectedRow(row)
    setUpdatedObject({
      rate: row?.rate,
      quantity: row?.quantity,
      bookingSlot: row?.details?.bookingSlot?.slotId,
      deliveryDate: row?.details?.deliveryDate ? new Date(row?.details?.deliveryDate) : null
    })
    setQuantityDeltaInput("")
    // setSelectedRow(row)
    const newEditingRows = new Set(editingRows)
    if (newEditingRows.has(index)) {
      newEditingRows.delete(index)
    } else {
      newEditingRows.add(index)
    }
    setEditingRows(newEditingRows)
  }
  const handleInputChange = (index, key, value) => {
    //const newData = [...orders]
    // newData[index][key] = value
    //  setData(newData)
    setUpdatedObject({ ...updatedObject, [key]: value })
  }

  function parseDeltaInput(raw) {
    const txt = (raw ?? "").toString().trim()
    if (!txt) return { valid: true, delta: 0, display: "0" }

    if (!/^[+-]?\d+$/.test(txt)) {
      return { valid: false, delta: 0, error: "Enter delta like +500 or -300" }
    }

    const delta = Number(txt.startsWith("+") || txt.startsWith("-") ? txt : `+${txt}`)
    if (!Number.isFinite(delta)) {
      return { valid: false, delta: 0, error: "Invalid delta value" }
    }

    return {
      valid: true,
      delta,
      display: `${delta > 0 ? "+" : ""}${delta.toLocaleString("en-IN")}`
    }
  }

  const refreshComponent = () => {
    setRefresh(!refresh)
  }
  const cancelEditing = (index) => {
    const newEditingRows = new Set(editingRows)
    newEditingRows.delete(index)
    setEditingRows(newEditingRows)
    setUpdatedObject(null)
    setQuantityDeltaInput("")
    setSelectedRow(null)
  }

  // Status change handler with confirmation
  const handleStatusChange = async (row, newStatus) => {
    const requiresRemark = newStatus === "REJECTED" || newStatus === "CANCELLED"
    // Handle Agri Sales orders differently
    if (row.isAgriSalesOrder) {
      // Don't allow status change for COMPLETED orders
      if (row.orderStatus === "COMPLETED") {
        Toast.error("Cannot change status of completed orders")
        return
      }

      if (newStatus !== "ACCEPTED" && newStatus !== "REJECTED") {
        Toast.error(
          "Select order(s) with the checkbox, then use Dispatch, Assign, or Cancel in the bar (or Complete for dispatched rows)."
        )
        return
      }

      setConfirmDialog({
        open: true,
        title: newStatus === "ACCEPTED" ? "Accept order" : "Reject order",
        description:
          newStatus === "ACCEPTED"
            ? `Accept Order #${row.order}?`
            : `Reject Order #${row.order}?`,
        onConfirm: async () => {
          setConfirmDialog((d) => ({ ...d, open: false }))
          setpatchLoading(true)
          try {
            const orderId = row?.details?.orderid || row?.details?._id
            if (newStatus === "ACCEPTED") {
              const instance = NetworkManager(API.INVENTORY.ACCEPT_AGRI_SALES_ORDER)
              const response = await instance.request({}, [orderId])
              if (response?.data) {
                Toast.success("Order accepted successfully")
                setAgriDispatchStatusFilter("ACCEPTED")
                await getOrders()
                fetchAgriStatusCounts() // Refresh counts after accept
                refreshComponent()
              }
            } else if (newStatus === "REJECTED") {
              setStatusRemarkDialog({
                open: true,
                title: "Reject order",
                description: `Enter rejection remark for Order #${row.order}. This same remark is used as reject reason.`,
                remark: "",
                confirmLabel: "Reject order",
                onSubmit: async (remarkText) => {
                  setpatchLoading(true)
                  try {
                    const instance = NetworkManager(API.INVENTORY.REJECT_AGRI_SALES_ORDER)
                    const response = await instance.request({ reason: remarkText }, [orderId])
                    if (response?.data) {
                      Toast.success("Order rejected successfully")
                      setAgriDispatchStatusFilter("ALL")
                      await getOrders()
                      fetchAgriStatusCounts() // Refresh counts after reject
                      refreshComponent()
                    }
                  } catch (error) {
                    console.error("Error changing Agri Sales order status:", error)
                    const errorMessage =
                      error.response?.data?.message || error.message || "Failed to change order status"
                    Toast.error(errorMessage)
                  } finally {
                    setpatchLoading(false)
                  }
                }
              })
            }
          } catch (error) {
            console.error("Error changing Agri Sales order status:", error)
            const errorMessage = error.response?.data?.message || error.message || "Failed to change order status"
            Toast.error(errorMessage)
          } finally {
            setpatchLoading(false)
          }
        }
      })
      return
    }

    if (newStatus === "READY_FOR_DISPATCH") {
      setReadyDispatchDialog({
        open: true,
        row,
        newStatus,
        dispatchDayKey: row?.details?.dispatchDayKey || ""
      })
      return
    }

    if (requiresRemark) {
      setStatusRemarkDialog({
        open: true,
        title: newStatus === "REJECTED" ? "Reject order" : "Cancel order",
        description: `Enter a remark before changing Order #${row.order} to ${
          newStatus === "REJECTED" ? "Rejected" : "Cancelled"
        }.`,
        remark: "",
        confirmLabel: "Apply status",
        onSubmit: async (remarkText) => {
          pacthOrders(
            {
              id: row?.details?.orderid,
              orderStatus: newStatus,
              orderRemarks: remarkText
            },
            row
          )
        }
      })
      return
    }

    // Handle regular orders (existing flow)
    setConfirmDialog({
      open: true,
      title: "Confirm Status Change",
      description: `Change status of Order #${row.order} from ${row.orderStatus} to ${newStatus}?`,
      onConfirm: () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        pacthOrders(
          {
            id: row?.details?.orderid,
            orderStatus: newStatus
          },
          row
        )
      }
    })
  }

  const handleConfirmReadyDispatchStatus = () => {
    const row = readyDispatchDialog.row
    const newStatus = readyDispatchDialog.newStatus
    if (!row || !newStatus) return
    if (!readyDispatchDialog.dispatchDayKey) {
      Toast.error("Please select Aaj / Udya / Parva")
      return
    }

    setReadyDispatchDialog({
      open: false,
      row: null,
      newStatus: "READY_FOR_DISPATCH",
      dispatchDayKey: ""
    })

    pacthOrders(
      {
        id: row?.details?.orderid,
        orderStatus: newStatus,
        dispatchDayKey: readyDispatchDialog.dispatchDayKey
      },
      row
    )
  }

  // Payment add handler with confirmation
  const handleAddPaymentWithConfirm = (orderId) => {
    setConfirmDialog({
      open: true,
      title: "Confirm Add Payment",
      description: `Add payment of ₹${newPayment.paidAmount} (${
        newPayment.modeOfPayment
      }) to Order #${selectedOrder?.order || orderId}?`,
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        await handleAddPayment(orderId)
      }
    })
  }

  return (
    <div className="w-full p-4 bg-gray-50">
      {showPageLoader && <PageLoader />}
      {patchLoading && orders.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[120] pointer-events-none">
          <LinearProgress color="primary" sx={{ height: 3 }} />
        </div>
      )}

      {/* Header Controls */}
      <div className="mb-6 space-y-4">
        {!slotId && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <button
              type="button"
              onClick={() => setFiltersExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50">
              <span className="text-sm font-semibold text-gray-800">Filters</span>
              <span className="text-xs text-gray-500">{filtersExpanded ? "Hide" : "Show"}</span>
            </button>

            {filtersExpanded && (
              <div className="border-t border-gray-200 p-3 space-y-3">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                  <div className="w-full sm:w-[330px] shrink-0">
                    <DatePicker
                      selectsRange
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(update) => setSelectedDateRange(update)}
                      dateFormat="dd-MMMM-yyyy"
                      monthsShown={1}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      calendarClassName="custom-datepicker"
                      popperPlacement="bottom-start"
                      shouldCloseOnSelect={false}
                      customInput={
                        <OrderDateRangeField
                          startDate={startDate}
                          endDate={endDate}
                          placeholder="Select order date range"
                        />
                      }
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const t = new Date()
                        const from = new Date()
                        from.setDate(from.getDate() - 6)
                        setSelectedDateRange([from, t])
                      }}
                      className="px-2 py-1 text-[11px] rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                      7 days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const t = new Date()
                        const from = new Date()
                        from.setDate(from.getDate() - 13)
                        setSelectedDateRange([from, t])
                      }}
                      className="px-2 py-1 text-[11px] rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                      14 days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const t = new Date()
                        const from = new Date()
                        from.setDate(from.getDate() - 29)
                        setSelectedDateRange([from, t])
                      }}
                      className="px-2 py-1 text-[11px] rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                      30 days
                    </button>
                    {startDate && endDate && (
                      <button
                        type="button"
                        onClick={() => setSelectedDateRange([null, null])}
                        className="px-2 py-1 text-[11px] rounded-md border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">
                        Clear
                      </button>
                    )}
                  </div>
                  {!showAgriSalesOrders &&
                    (viewMode === "booking" ||
                      viewMode === "pending" ||
                      viewMode === "accepted" ||
                      viewMode === "cancelled") && (
                    <div className="w-full flex flex-wrap items-center gap-3 pt-1">
                      <span className="text-[11px] font-semibold text-gray-600">Date range applies to:</span>
                      <RadioGroup
                        row
                        className="gap-0"
                        value={orderDateRangeBy}
                        onChange={(e) => setOrderDateRangeBy(e.target.value)}
                      >
                        <FormControlLabel
                          value="booking"
                          control={<Radio size="small" />}
                          label={<span className="text-xs text-gray-800">Booking date</span>}
                        />
                        <FormControlLabel
                          value="delivery"
                          control={<Radio size="small" />}
                          label={<span className="text-xs text-gray-800">Delivery date</span>}
                        />
                      </RadioGroup>
                    </div>
                  )}
                  {/* Search: backend `search` (order id, public code, mobile) — same row as date on wide layouts */}
                  <div className="w-full min-w-[min(100%,12rem)] flex-1 sm:min-w-[220px] sm:max-w-md">
                    <label
                      htmlFor="farmer-orders-search"
                      className="block text-[9px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">
                      Search (order ID or mobile)
                    </label>
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                        aria-hidden
                      />
                      <input
                        id="farmer-orders-search"
                        type="search"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Order ID, public code, or mobile number"
                        autoComplete="off"
                        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
                      />
                      {searchTerm ? (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={clearSearch}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {!showAgriSalesOrders && (
                    <div className="w-full flex flex-wrap items-center gap-2 pt-0.5">
                      <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        onClick={() => setRecentQtyEditsOpen(true)}
                        sx={{ textTransform: "none", fontWeight: 600 }}>
                        Recent quantity edits
                        {recentPlantQuantityEdits.length > 0
                          ? ` (${recentPlantQuantityEdits.length})`
                          : ""}
                      </Button>
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 440 }}>
                        Plant quantity changes from orders in the current list (newest first). Full history stays on each order.
                      </Typography>
                    </div>
                  )}
                </div>

                {/* Filter Dropdowns */}
                <div className="bg-white rounded-lg border p-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                    {/* Plant Filter - Hide for Agri Sales orders */}
                    {!showAgriSalesOrders && (
                      <>
                        <SearchableDropdown
                          label="Plant"
                          value={selectedPlant}
                          onChange={(val) => {
                            setSelectedPlant(val)
                            if (val === "") {
                              setSelectedSubtype("")
                            }
                          }}
                          options={[{ label: "All Plants", value: "" }, ...(plants || [])]}
                          placeholder="Select Plant"
                          showCount={true}
                          maxHeight="500px"
                          usePortal={true}
                        />

                        {/* Plant Subtype Filter */}
                        <SearchableDropdown
                          label="Subtype"
                          value={selectedSubtype}
                          onChange={setSelectedSubtype}
                          options={
                            !selectedPlant
                              ? []
                              : [{ label: "All Subtypes", value: "" }, ...(subtypes || [])]
                          }
                          placeholder={
                            !selectedPlant
                              ? "Select a plant first"
                              : subtypesLoading
                              ? "Loading subtypes..."
                              : "Select Subtype"
                          }
                          showCount={Boolean(selectedPlant && !subtypesLoading)}
                          maxHeight="500px"
                          disabled={!selectedPlant || subtypesLoading}
                          usePortal={true}
                        />
                      </>
                    )}

                    {/* Sales Person/Dealer Filter */}
                    <SearchableDropdown
                      label="Sales Person / Dealer"
                      value={selectedSalesPerson}
                      onChange={setSelectedSalesPerson}
                      options={[{ label: "All Sales People & Dealers", value: "" }, ...(salesPeople || [])]}
                      placeholder="Select Sales Person / Dealer"
                      showCount={true}
                      maxHeight="500px"
                      usePortal={true}
                    />

                    {/* Village Filter */}
                    <SearchableDropdown
                      label="Village"
                      value={selectedVillage}
                      onChange={setSelectedVillage}
                      options={[
                        { label: "All Villages", value: "" },
                        ...(villages || []).map((village) => ({ label: village, value: village }))
                      ]}
                      placeholder="Select Village"
                      showCount={true}
                      maxHeight="500px"
                      usePortal={true}
                    />

                    {/* District Filter */}
                    <SearchableDropdown
                      label="District"
                      value={selectedDistrict}
                      onChange={setSelectedDistrict}
                      options={[
                        { label: "All Districts", value: "" },
                        ...(districts || []).map((district) => ({ label: district, value: district }))
                      ]}
                      placeholder="Select District"
                      showCount={true}
                      maxHeight="500px"
                      usePortal={true}
                    />
                  </div>

                  {/* Clear Filters and Export Buttons */}
                  <div className="mt-2.5 flex justify-between items-center">
                    <ExcelExport
                      title="Export Orders"
                      filters={{
                        startDate: startDate ? moment(startDate).format("YYYY-MM-DD") : "",
                        endDate: endDate ? moment(endDate).format("YYYY-MM-DD") : "",
                        plantId: selectedPlant || "",
                        subtypeId: selectedSubtype || "",
                        salesPerson: selectedSalesPerson || "",
                        village: selectedVillage || "",
                        district: selectedDistrict || ""
                      }}
                      onExportComplete={() => {
                        Toast.success("Orders exported successfully!")
                      }}
                    />
                    <button
                      onClick={() => {
                        debouncedSearch.cancel()
                        setSearchTerm("")
                        setDebouncedSearchTerm("")
                        setSelectedSalesPerson("")
                        setSelectedVillage("")
                        setSelectedDistrict("")
                        setSelectedPlant("")
                        setSelectedSubtype("")
                        setSubtypes([])
                        setSelectedDateRange([null, null])
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 enhanced-select hover:bg-gray-50 focus:outline-none">
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ram Agri Inputs Action Bar - Only show when orders are selected */}
        {showAgriSalesOrders && (selectedAgriSalesOrders.length > 0 || selectedAgriOrdersForComplete.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm border mb-4 overflow-hidden">
            {/* Action Bar Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 lg:pb-0">
                  {/* Dispatch Button - Only show when orders are selected */}
                  {selectedAgriSalesOrders.length > 0 && (
                    <button
                      onClick={openAgriDispatchModal}
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap bg-orange-100 text-orange-700 hover:bg-orange-200 shadow-sm border border-orange-300">
                      🚚 Dispatch
                      <span className="bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedAgriSalesOrders.length}
                      </span>
                    </button>
                  )}

                  {/* Assign to Sales Person Button */}
                  {selectedAgriSalesOrders.length > 0 && (
                    <button
                      onClick={openAssignModal}
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-sm border border-purple-300">
                      👤 Assign
                      <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedAgriSalesOrders.length}
                      </span>
                    </button>
                  )}

                  {selectedAgriSalesOrders.length > 0 && selectedAgriOrdersAreAllAccepted() && (
                    <button
                      type="button"
                      onClick={handleAgriBulkCancel}
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap bg-red-100 text-red-800 hover:bg-red-200 shadow-sm border border-red-300">
                      Cancel
                      <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedAgriSalesOrders.length}
                      </span>
                    </button>
                  )}

                  {/* Complete Button */}
                  {selectedAgriOrdersForComplete.length > 0 && (
                    <button
                      onClick={openAgriCompleteModal}
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap bg-green-100 text-green-700 hover:bg-green-200 shadow-sm border border-green-300">
                      ✅ Complete
                      <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedAgriOrdersForComplete.length}
                      </span>
                    </button>
                  )}

                  {/* Dispatched By Filter */}
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-white text-xs md:text-sm font-medium hidden sm:inline">👤 Dispatched By:</span>
                    <select
                      value={selectedDispatchedBy}
                      onChange={(e) => setSelectedDispatchedBy(e.target.value)}
                      className="px-2 md:px-3 py-2 text-xs md:text-sm border-0 rounded-lg bg-white/90 text-gray-700 focus:ring-2 focus:ring-white min-w-[120px] md:min-w-[180px]">
                      <option value="">All Employees</option>
                      {ramAgriSalesUsers.map((user) => (
                        <option key={user.value} value={user.value}>
                          {user.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selection Controls */}
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  {/* Dispatch Selection */}
                  {selectedAgriSalesOrders.length > 0 && (
                    <>
                      <span className="text-white text-xs md:text-sm">
                        <span className="font-bold">{selectedAgriSalesOrders.length}</span> for dispatch
                      </span>
                      <button
                        onClick={clearAgriOrderSelections}
                        className="px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors">
                        Clear
                      </button>
                    </>
                  )}
                  {/* Complete Selection */}
                  {selectedAgriOrdersForComplete.length > 0 && (
                    <>
                      <span className="text-green-100 text-xs md:text-sm">
                        <span className="font-bold">{selectedAgriOrdersForComplete.length}</span> for complete
                      </span>
                      <button
                        onClick={clearAgriCompleteSelections}
                        className="px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors">
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
        {viewMode === "farmready" && !showAgriSalesOrders && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              <span className="font-semibold">🌱 Farm Ready View:</span> Shows orders marked as farm ready with date filtering applied.
            </p>
          </div>
        )}
        {isReadyForDispatchTab && !showAgriSalesOrders && (
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-brand-800">
                <span className="font-semibold">✅ Ready for Dispatch View:</span> Shows all orders with &ldquo;Ready for Dispatch&rdquo; status, irrespective of date.
                {isDispatchManager && <span className="ml-1 font-medium">You can change status and delivery date.</span>}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setClubDialogOpen(true)}
                className="px-3 py-2 text-xs font-semibold rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                Club Orders
              </button>
              <button
                onClick={() => setRouteMapOpen(true)}
                className="px-3 py-2 text-xs font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                🗺 Plan Route
              </button>
              </div>
            </div>
          </div>
        )}
        {isDispatchedVehicleTab && !showAgriSalesOrders && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-slate-800">
              <span className="font-semibold">🚛 Vehicle view:</span> Orders with status{" "}
              <span className="font-semibold">Dispatched</span>, not limited by booking date. In the table view, rows are grouped by vehicle and dispatch (from the latest dispatch on each order).
            </p>
          </div>
        )}
      </div>

      {/* Plant / subtype summary — Ready tab (aligned with nursery-mgmt-mobile) */}
      {isReadyForDispatchTab && !showAgriSalesOrders && orders && orders.length > 0 && (() => {
        const plantSummary = new Map()
        orders.forEach((order) => {
          const plantType = order.plantType || "Unknown"
          if (!plantSummary.has(plantType)) {
            plantSummary.set(plantType, {
              plantType,
              totalQuantity: 0,
              orderCount: 0,
            })
          }
          const summary = plantSummary.get(plantType)
          summary.totalQuantity += order.totalPlants ?? order.quantity ?? 0
          summary.orderCount += 1
        })
        const summaryArray = Array.from(plantSummary.values()).sort(
          (a, b) => b.totalQuantity - a.totalQuantity
        )
        return (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 Delivery Summary by Plant Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {summaryArray.map((summary, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-lg shadow-sm border border-brand-200 p-3 hover:shadow-md transition-shadow"
                >
                  <div className="text-xs text-gray-600 mb-1 truncate" title={summary.plantType}>
                    {summary.plantType}
                  </div>
                  <div className="text-lg font-bold text-brand-700">
                    {summary.totalQuantity.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {summary.orderCount} {summary.orderCount === 1 ? "order" : "orders"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {isReadyForDispatchTab && !showAgriSalesOrders && readyDispatchGroups.length > 0 && (
        <div className="mb-4 bg-white rounded-lg border border-brand-100 p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">🚚 Clubbed Groups</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {readyDispatchGroups.map((group) => {
              const groupOrders = Array.isArray(group?.orderIds) ? group.orderIds : []
              const dispatchTransportId =
                group?.convertedDispatchId &&
                typeof group.convertedDispatchId === "object" &&
                group.convertedDispatchId.transportId != null
                  ? String(group.convertedDispatchId.transportId)
                  : null
              const statusUpper = (group.status || "").toUpperCase()
              const isLocked = statusUpper === "LOCKED"
              const isDispatchedGroup = statusUpper === "DISPATCHED"
              return (
                <div key={group?._id || group?.id} className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{group.groupCode || "Group"}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">{group.status || "DRAFT"}</span>
                  </div>
                  {dispatchTransportId && (
                    <div className="mt-1 text-[11px] font-semibold text-green-700">
                      Dispatch #{dispatchTransportId}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-gray-600">
                    Orders: {groupOrders.length} • Plants: {Number(group?.totalPlants || 0).toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    Capacity: {group?.capacityMeta?.max || 0} {group?.capacityMeta?.unit || "plants"}
                  </div>
                  <div className="mt-2">
                    {isDispatchedGroup ? (
                      <p className="text-[10px] text-green-700 font-medium">Dispatch created for this group.</p>
                    ) : !isLocked ? (
                      <button
                        onClick={() => handleConvertGroupToDispatch(group)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold rounded bg-green-600 text-white hover:bg-green-700"
                      >
                        Open In Dispatch
                      </button>
                    ) : (
                      <p className="text-[10px] text-amber-700 font-medium">
                        Locked — finish or cancel from the dispatch form. Use the Delivery tab for in-process loads.
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* View Toggle and Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Order view tabs — above toolbar so they stay visible on narrow / mobile layouts */}
        {!showAgriSalesOrders && (
          <div className="border-b border-gray-200 bg-gray-50 w-full min-w-0 shrink-0">
            <div className="flex overflow-x-auto overflow-y-hidden scrollbar-hide [-webkit-overflow-scrolling:touch] touch-pan-x">
              <button
                onClick={() => setViewMode("booking")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "booking"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">📋 </span>Booking{" "}
                <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                  ({orderViewTabTotals.booking})
                </span>
              </button>
              <button
                onClick={() => setViewMode("pending")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "pending"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">⏳ </span>Pending{" "}
                <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                  ({orderViewTabTotals.pending})
                </span>
              </button>
              <button
                onClick={() => setViewMode("accepted")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "accepted"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">✔️ </span>Accepted{" "}
                <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                  ({orderViewTabTotals.accepted})
                </span>
              </button>
              <button
                onClick={() => setViewMode("cancelled")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "cancelled"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">🚫 </span>Canceled{" "}
                <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                  ({orderViewTabTotals.cancelled})
                </span>
              </button>
              <button
                onClick={() => setViewMode("farmready")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "farmready"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">🌱 </span>Farm ready{" "}
                <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                  ({orderViewTabTotals.farmready})
                </span>
              </button>
              <button
                onClick={() => setViewMode("ready_for_dispatch")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "ready_for_dispatch"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">✅ </span>Ready{" "}
                <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                  ({orderViewTabTotals.ready_for_dispatch})
                </span>
              </button>
              <button
                onClick={() => setViewMode("dispatch_process")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "dispatch_process"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">⏳ </span>Loading{" "}
                <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                  ({orderViewTabTotals.dispatch_process})
                </span>
              </button>
              <button
                onClick={() => setViewMode("dispatched_vehicle")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "dispatched_vehicle"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">🚛 </span>Vehicle{" "}
                <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                  ({orderViewTabTotals.dispatched_vehicle})
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Header with View Toggle */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <button
              onClick={() => setViewType("table")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === "table"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
              }`}>
              📊 Table
            </button>
            <button
              onClick={() => setViewType("grid")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === "grid"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
              }`}>
              🎴 Grid
            </button>
            
            {/* Order Type: Toggle between Regular Orders and Ram Agri Inputs */}
            <div className="ml-4 pl-4 border-l border-gray-300 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Order Type:</span>
              <button
                onClick={() => setShowAgriSalesOrders(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                  !showAgriSalesOrders
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                }`}>
                📋 Regular Orders
              </button>
              <button
                onClick={() => setShowAgriSalesOrders(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 relative ${
                  showAgriSalesOrders
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                }`}>
                📦 Ram Agri Inputs
                {showAgriSalesOrders && agriSalesPendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                    {agriSalesPendingCount > 99 ? "99+" : agriSalesPendingCount}
                  </span>
                )}
              </button>
              {showAgriSalesOrders && (
                <>
                  <button
                    onClick={() => {
                      setLinkedAgriSourceOrder(null)
                      setShowAddAgriSalesOrderForm(true)
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white shadow-sm hover:bg-green-700 transition-colors flex items-center gap-1">
                    <span>+</span> Add Order
                  </button>
                  <div className="ml-2 flex items-center gap-1">
                    <input
                      type="checkbox"
                      id="hidePayment"
                      checked={hidePaymentDetails}
                      onChange={(e) => setHidePaymentDetails(e.target.checked)}
                      className="w-3 h-3 text-brand-600 rounded border-gray-300"
                    />
                    <label htmlFor="hidePayment" className="text-xs text-gray-600 cursor-pointer">
                      Hide Payment
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Status filter (Ram Agri Inputs) - Tab Style */}
            {showAgriSalesOrders && (
              <div className="ml-4 pl-4 border-l border-gray-300">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
                  <button
                    onClick={() => setAgriDispatchStatusFilter("ALL")}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "ALL"
                        ? "border-slate-600 text-slate-700 bg-slate-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    All <span className="ml-1 text-xs font-semibold">({agriStatusCounts.ALL})</span>
                  </button>
                  <button
                    onClick={() => setAgriDispatchStatusFilter("ACCEPTED")}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "ACCEPTED"
                        ? "border-gray-600 text-gray-600 bg-gray-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    Accepted <span className="ml-1 text-xs font-semibold">({agriStatusCounts.ACCEPTED})</span>
                  </button>
                  <button
                    onClick={() => setAgriDispatchStatusFilter("ASSIGNED")}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "ASSIGNED"
                        ? "border-purple-600 text-purple-600 bg-purple-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    Assigned <span className="ml-1 text-xs font-semibold">({agriStatusCounts.ASSIGNED})</span>
                  </button>
                  <button
                    onClick={() => setAgriDispatchStatusFilter("DISPATCHED")}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "DISPATCHED"
                        ? "border-brand-600 text-brand-600 bg-brand-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    Dispatched <span className="ml-1 text-xs font-semibold">({agriStatusCounts.DISPATCHED})</span>
                  </button>
                  <button
                    onClick={() => setAgriDispatchStatusFilter("COMPLETED")}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "COMPLETED"
                        ? "border-green-600 text-green-600 bg-green-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    Completed <span className="ml-1 text-xs font-semibold">({agriStatusCounts.COMPLETED})</span>
                  </button>
                  <button
                    onClick={() => setAgriDispatchStatusFilter("CANCELLED")}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "CANCELLED"
                        ? "border-red-600 text-red-600 bg-red-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    Cancelled <span className="ml-1 text-xs font-semibold">({agriStatusCounts.CANCELLED})</span>
                  </button>
                </div>
              </div>
            )}
            {showAgriSalesOrders && isAgriLoadAdmin && (
              <div className="ml-4 pl-4 border-l border-gray-300">
                <div className="text-[11px] font-semibold text-amber-800 mb-1">
                  Today Pending Load ({todayPendingAgriLoads.length})
                </div>
                <div className="flex flex-wrap gap-1 max-w-[520px]">
                  {todayPendingAgriLoads.length === 0 ? (
                    <span className="text-[11px] text-gray-500">No pending linked agri loads</span>
                  ) : (
                    todayPendingAgriLoads.slice(0, 6).map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => markLinkedAgriLoaded(item._id)}
                        disabled={agriLoadActionBusyId === item._id}
                        className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                          agriLoadActionBusyId === item._id
                            ? "bg-gray-100 text-gray-500 border-gray-300"
                            : "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                        }`}
                        title={`Mark loaded: ${item.orderNumber} / ${item.customerName}`}
                      >
                        {agriLoadActionBusyId === item._id ? "Updating..." : `${item.orderNumber} Loaded`}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                refreshComponent()
                if (showAgriSalesOrders) fetchAgriStatusCounts()
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm"
              title="Refresh orders"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Refresh
            </button>
            {canAddPayment && (
              <button
                type="button"
                onClick={() => setShowBulkPaymentDialog(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white border border-brand-600 text-brand-700 hover:bg-brand-50 shadow-sm"
              >
                Bulk payment
              </button>
            )}
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={whatsappMessagingEnabled}
                  onChange={(e) => {
                    const on = e.target.checked
                    setWhatsappMessagingEnabled(on)
                    setWhatsappMessagingDisabled(!on)
                  }}
                  color="primary"
                />
              }
              label={
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                  WhatsApp msgs
                </span>
              }
              sx={{ marginRight: 0, marginLeft: 0 }}
            />
            <div className="text-sm text-gray-600">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </div>
          </div>
        </div>

        {!showAgriSalesOrders && (
          <DispatchList setisDispatchtab={setisDispatchtab} viewMode={viewMode} refresh={refresh} />
        )}

        {/* Filter orders based on order status for Agri Sales (API already filters; client filter aligns edge cases) */}
        {(() => {
          const filteredOrders = showAgriSalesOrders
            ? orders.filter((o) => {
                const orderStatus = o.orderStatus || ""
                const dispatchStatus = o.details?.dispatchStatus || "NOT_DISPATCHED"
                if (agriDispatchStatusFilter === "ALL") return true
                if (agriDispatchStatusFilter === "ACCEPTED") return orderStatus === "ACCEPTED"
                if (agriDispatchStatusFilter === "ASSIGNED") return orderStatus === "ASSIGNED"
                if (agriDispatchStatusFilter === "DISPATCHED") {
                  return orderStatus === "DISPATCHED" || dispatchStatus === "DISPATCHED"
                }
                if (agriDispatchStatusFilter === "COMPLETED") {
                  return orderStatus === "COMPLETED" || dispatchStatus === "DELIVERED"
                }
                if (agriDispatchStatusFilter === "CANCELLED") {
                  return orderStatus === "CANCELLED"
                }
                return true
              })
            : orders

          return (
            <>
        {/* Table View */}
        {viewType === "table" && (
          <div className="overflow-x-auto">
            {filteredOrders && filteredOrders.length > 0 ? (
              (() => {
                const farmerOrdersTableColCount = getFarmerOrdersTableColumnCount({
                  showAgriSalesOrders,
                  hidePaymentDetails,
                  viewMode,
                })
                const farmerTableBodyItems =
                  isDispatchedVehicleTab && !showAgriSalesOrders
                    ? buildDispatchedVehicleTableBodyItems(filteredOrders)
                    : filteredOrders.map((row, dataIndex) => ({
                        kind: "order",
                        row,
                        sr: dataIndex + 1,
                        dataIndex,
                      }))
                return (
                  <TableVirtuoso
                    className="w-full"
                    data={farmerTableBodyItems}
                    style={{ height: "calc(100vh - 400px)", width: "100%" }}
                    defaultItemHeight={56}
                    increaseViewportBy={{ top: 120, bottom: 400 }}
                    scrollerRef={(el) => {
                      ordersTableScrollRef.current = el
                    }}
                    endReached={() => {
                      if (showAgriSalesOrders || slotId || viewMode === "dispatch_process") return
                      if (!hasMoreOrders || loading || loadingMoreOrders) return
                      loadMoreOrdersRef.current?.()
                    }}
                    components={{
                      Table: (p) => <table {...p} className={`w-full text-sm ${p.className || ""}`} />,
                      TableHead: (p) => (
                        <thead {...p} className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300 sticky top-0 z-10" />
                      ),
                      TableRow: ({ item, children, ...trProps }) => {
                        if (!item) return <tr {...trProps}>{children}</tr>
                        if (item.kind === "groupHeader") {
                          return (
                            <tr {...trProps} className="bg-slate-100 border-t-2 border-slate-200">
                              {children}
                            </tr>
                          )
                        }
                        const { row } = item
                        const hasPendingPayment = row?.details?.payment?.some((p) => p.paymentStatus === "PENDING")
                        let agri = ""
                        if (showAgriSalesOrders) {
                          const ds = row.details?.dispatchStatus
                          if (ds === "DISPATCHED") agri = "bg-brand-50 border-l-brand-500"
                          else if (ds === "DELIVERED") agri = "bg-green-50 border-l-green-500"
                          else if (selectedAgriSalesOrders.includes(row.details?.orderid))
                            agri = "bg-amber-50 border-l-amber-500"
                        }
                        return (
                          <tr
                            {...trProps}
                            className={`hover:bg-brand-50 transition-all duration-150 cursor-pointer border-l-4 ${
                              hasPendingPayment && !showAgriSalesOrders ? "payment-blink border-l-amber-400" : "border-l-transparent"
                            } ${row?.details?.dealerOrder ? "bg-sky-50" : ""} ${
                              selectedRows.has(row.details.orderid) && !showAgriSalesOrders ? "bg-brand-100 border-l-brand-500" : ""
                            } ${agri}`}
                            onClick={() => {
                              setSelectedOrder(row)
                              setIsOrderModalOpen(true)
                            }}
                          >
                            {children}
                          </tr>
                        )
                      },
                    }}
                    fixedFooterContent={
                      !showAgriSalesOrders
                        ? () => (
                            <tr>
                              <td colSpan={farmerOrdersTableColCount} className="p-0 border-none bg-white">
                                <div
                                  className="flex justify-center py-3 min-h-[44px]"
                                  aria-hidden
                                >
                                  {loadingMoreOrders && <CircularProgress size={18} />}
                                </div>
                              </td>
                            </tr>
                          )
                        : undefined
                    }
                    fixedHeaderContent={() => (
                  <tr>
                    {/* Dispatch Selection Checkbox for Agri Sales */}
                    {showAgriSalesOrders && (
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-10 bg-gray-50">
                        <input
                          type="checkbox"
                          onChange={() => {
                            if (selectedAgriSalesOrders.length > 0) {
                              clearAgriOrderSelections()
                            } else {
                              selectAllAgriOrders()
                            }
                          }}
                          checked={selectedAgriSalesOrders.length > 0 && selectedAgriSalesOrders.length === orders.filter(o => 
                            o.isAgriSalesOrder && 
                            (o.orderStatus === "ACCEPTED" || o.orderStatus === "ASSIGNED")
                          ).length}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          title="Select all accepted and assigned orders for dispatch"
                        />
                      </th>
                    )}
                    {viewMode !== "booking" && viewMode !== "cancelled" && !showAgriSalesOrders && (
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-10 bg-gray-50">
                        <input
                          type="checkbox"
                          onChange={toggleSelectAll}
                          checked={selectedRows.size === orders.length && orders.length > 0}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[70px] bg-gray-50">
                      SR No
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[120px] bg-gray-50">
                      Order #
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[160px] bg-gray-50">
                      Farmer / Customer
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[140px] bg-gray-50">
                      Plant Type
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[130px] bg-gray-50">
                      Delivery
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[90px] bg-gray-50">
                      Qty
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[70px] bg-gray-50">
                      Rate
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[110px] bg-gray-50">
                      Amount
                    </th>
                    {!(showAgriSalesOrders && hidePaymentDetails) && (
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[110px] bg-gray-50">
                        Payment
                      </th>
                    )}
                    {/* Dispatch Info Column for Agri Sales */}
                    {showAgriSalesOrders && (
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[100px] bg-gray-50">
                        Dispatch
                      </th>
                    )}
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[110px] bg-gray-50">
                      Status
                    </th>
                    <th className="hidden px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[80px] bg-gray-50">
                      Actions
                    </th>
                  </tr>
                    )}
                    itemContent={(index, item) => {
                  if (item.kind === "groupHeader") {
                    const { meta, orderCount, totalPlants } = item
                    return (
                        <td
                          colSpan={farmerOrdersTableColCount}
                          className="px-3 py-2 text-xs text-slate-800"
                        >
                          <span className="font-bold text-slate-900">{meta.displayTitle}</span>
                          {meta.transportId != null && meta.transportId !== "" && (
                            <span className="ml-2 font-semibold text-green-700">Dispatch #{meta.transportId}</span>
                          )}
                          <span className="ml-2 text-slate-600">
                            <span className="font-semibold">Vehicle</span> {meta.vehicleName}
                            <span className="mx-1.5 text-slate-400">·</span>
                            <span className="font-semibold">Driver</span> {meta.driverName}
                            <span className="mx-1.5 text-slate-400">·</span>
                            {orderCount} order{orderCount !== 1 ? "s" : ""}
                            <span className="mx-1.5 text-slate-400">·</span>
                            {totalPlants.toLocaleString()} plants
                          </span>
                        </td>
                    )
                  }
                  const { row, sr, dataIndex } = item
                  const farmerDetails = row?.details?.farmer
                  // For Ram Agri sales orders, use customerTaluka and customerVillage
                  const farmerLocation = row.isAgriSalesOrder || row.details?.isRamAgriProduct
                    ? (row.details?.customerTaluka && row.details?.customerVillage
                        ? `${row.details.customerTaluka} → ${row.details.customerVillage}`
                        : row.details?.customerTaluka || row.details?.customerVillage || null)
                    : (farmerDetails
                        ? [farmerDetails.district, farmerDetails.village].filter(Boolean).join(" → ")
                        : null)
                  const hasPendingPayment = row?.details?.payment?.some((payment) => payment.paymentStatus === "PENDING")

                  return (
                    <>
                      {/* Dispatch Selection Checkbox for Agri Sales */}
                      {showAgriSalesOrders && (
                        <td className="px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {/* ACCEPTED orders - can be dispatched or assigned */}
                          {row.isAgriSalesOrder &&
                          (row.orderStatus === "ACCEPTED" || row.orderStatus === "ASSIGNED") ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  e.stopPropagation()
                                  toggleAgriOrderSelection(row.details.orderid)
                                }}
                                checked={selectedAgriSalesOrders.includes(row.details.orderid)}
                                className="w-4 h-4 rounded border-2 border-orange-400 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                title="Select for dispatch or assign"
                              />
                            </div>
                          ) : row.orderStatus === "DISPATCHED" || row.details?.dispatchStatus === "DISPATCHED" ? (
                            /* DISPATCHED orders - can be completed */
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  e.stopPropagation()
                                  toggleAgriCompleteOrderSelection(row.details.orderid)
                                }}
                                checked={selectedAgriOrdersForComplete.includes(row.details.orderid)}
                                className="w-4 h-4 rounded border-2 border-green-400 text-green-600 focus:ring-green-500 cursor-pointer"
                                title="Select for complete"
                              />
                              <span className="text-sm">
                                {row.details.dispatchMode === "COURIER" ? "📦" : "🚚"}
                              </span>
                            </div>
                          ) : row.orderStatus === "COMPLETED" || row.details?.dispatchStatus === "DELIVERED" ? (
                            /* COMPLETED orders */
                            <div className="flex items-center justify-center">
                              <span className="text-lg">✅</span>
                            </div>
                          ) : row.orderStatus === "PENDING" ? (
                            /* PENDING orders - show yellow icon */
                            <div className="flex items-center justify-center">
                              <span className="text-yellow-500 text-lg" title="Pending acceptance">⏳</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <span className="text-gray-300 text-lg">○</span>
                            </div>
                          )}
                        </td>
                      )}
                      {viewMode !== "booking" && viewMode !== "cancelled" && !showAgriSalesOrders && (
                        <td className="px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleRowSelection(row.details.orderid, row)
                            }}
                            checked={selectedRows.has(row.details.orderid)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="text-xs font-medium text-gray-900">{sr}</div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-gray-900">#{(row.isAgriSalesOrder || row.details?.isRamAgriProduct) ? String(row.order).padStart(5, '0') : row.order}</span>
                          {(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && row.details?.linkedNurseryOrderCode && (
                            <button
                              type="button"
                              onClick={(e) => handleCopyLinkedOrderCode(row.details.linkedNurseryOrderCode, e)}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-300"
                              title="Copy linked regular order ID"
                            >
                              <FaCopy className="mr-1" />
                              Linked #{row.details.linkedNurseryOrderCode}
                            </button>
                          )}
                          {/* Split order badges */}
                          {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && row.details?.isSplit && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300"
                              title={`Split order — parent #${row.details?.splitHistory?.[0]?.relatedOrderNumber ?? "—"}`}
                            >
                              S{row.order}
                            </span>
                          )}
                          {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && row.details?.isSplit && row.details?.splitHistory?.[0]?.relatedOrderNumber && (
                            <span className="text-[10px] text-gray-500" title="Parent order ID">
                              ← #{row.details.splitHistory[0].relatedOrderNumber}
                            </span>
                          )}
                          {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && !row.details?.isSplit && Array.isArray(row.details?.splitOrderIds) && row.details.splitOrderIds.length > 0 && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300"
                              title={`Split into ${row.details.splitOrderIds.length} order(s)`}
                            >
                              ✂ {row.details.splitOrderIds.length} split
                            </span>
                          )}
                          {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && (
                            <DownloadPDFButton order={row} />
                          )}
                          {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && !row.details?.dealerOrder && (
                            <span className="inline-flex items-center gap-0.5">
                              {whatsappMessagingEnabled &&
                                !row.details?.whatsappAcceptedSentAt &&
                                ["ACCEPTED","FARM_READY","READY_FOR_DISPATCH","DISPATCH_PROCESS","DISPATCHED","COMPLETED","PARTIALLY_COMPLETED"].includes(row.orderStatus) && (
                                <button
                                  type="button"
                                  title="WhatsApp: order accepted"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setWatiDialogMode("accept")
                                    setWatiDialogOrder(row)
                                    setWatiDialogOpen(true)
                                  }}
                                  className="p-0.5 rounded text-green-600 hover:bg-green-50"
                                >
                                  <FaWhatsapp className="w-4 h-4" />
                                </button>
                              )}
                              {whatsappMessagingEnabled &&
                                !row.details?.whatsappDispatchSentAt &&
                                (row.orderStatus === "DISPATCHED" || row.orderStatus === "DISPATCH_PROCESS") &&
                                ((row.details?.dispatchHistory || []).length > 0 || row.orderStatus === "DISPATCHED") && (
                                <button
                                  type="button"
                                  title="WhatsApp: dispatched"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setWatiDialogMode("dispatch")
                                    setWatiDialogOrder(row)
                                    setWatiDialogOpen(true)
                                  }}
                                  className="p-0.5 rounded text-sky-600 hover:bg-sky-50"
                                >
                                  <span className="text-sm leading-none" aria-hidden>🚚</span>
                                  <FaWhatsapp className="w-3.5 h-3.5 inline ml-px" />
                                </button>
                              )}
                            </span>
                          )}
                          {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && !row.details?.dealerOrder && (
                            <span className="inline-flex items-center gap-0.5 flex-wrap">
                              {row.details?.whatsappAcceptedSentAt && (
                                <span
                                  className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold"
                                  title={`Accept WhatsApp sent ${moment(row.details.whatsappAcceptedSentAt).format("DD/MM/YYYY HH:mm")}${
                                    row.details.whatsappAcceptedMessageKey
                                      ? ` · ${row.details.whatsappAcceptedMessageKey}`
                                      : ""
                                  }`}>
                                  WA✓
                                </span>
                              )}
                              {row.details?.whatsappDispatchSentAt && (
                                <span
                                  className="text-[9px] px-1 py-0.5 rounded bg-sky-100 text-sky-900 font-bold"
                                  title={`Dispatch WhatsApp sent ${moment(row.details.whatsappDispatchSentAt).format("DD/MM/YYYY HH:mm")}${
                                    row.details.whatsappDispatchMessageKey
                                      ? ` · ${row.details.whatsappDispatchMessageKey}`
                                      : ""
                                  }`}>
                                  🚚✓
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5">
                          <span className="text-[10px] font-semibold text-sky-800">Booked</span>
                          <span className="text-[10px] font-bold text-sky-900">{row.orderDate}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-xs text-gray-900 leading-tight">
                          {row.details?.orderFor ? (
                            <div className="space-y-0.5">
                              <div className="text-[12px] font-semibold text-gray-900">
                                {row.details.farmer?.name || "Unknown"}
                              </div>
                              <div className="text-[11px] text-gray-700">
                                Order For: {row.details.orderFor.name}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[12px] font-semibold text-gray-900">
                              {row.farmerName}
                            </span>
                          )}
                        </div>
                        {row.details?.salesPerson && (
                          <div className="text-[10px] text-brand-600 mt-0.5">
                            By: {row.details.salesPerson.name}
                            {row.details.salesPerson.jobTitle === "DEALER" && " (D)"}
                          </div>
                        )}
                        {farmerLocation && (
                          <div className="text-[11px] font-semibold text-gray-800 mt-0.5 truncate max-w-[170px]">
                            {farmerLocation}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="inline-flex items-center rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[12px] font-bold text-teal-900 leading-tight">
                          {row.plantType}
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {row.deliveryDate && row.deliveryDate !== "-" ? (
                          <div className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5">
                            <span className="text-[10px] font-semibold text-amber-800">📅</span>
                            <span className="text-[10px] font-bold text-amber-900">{row.deliveryDate}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {/* Show final quantity for completed Agri Sales orders */}
                        {row.isAgriSalesOrder && row.orderStatus === "COMPLETED" && row.details?.deliveredQuantity > 0 ? (
                          <>
                            <div className="text-xs font-bold text-green-700">
                              Final: {row.details.deliveredQuantity?.toLocaleString()}
                            </div>
                            {row.details.returnQuantity > 0 && (
                              <div className="text-[10px] text-red-600 mt-0.5">
                                Returned: {row.details.returnQuantity?.toLocaleString()}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Original: {row.quantity?.toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-bold text-gray-900">
                              {(row.totalPlants ?? row.quantity)?.toLocaleString()}
                            </div>
                            {row.additionalPlants > 0 && (
                              <div className="text-[10px] text-brand-600 mt-0.5">
                                B:{row.basePlants?.toLocaleString()} +{row.additionalPlants?.toLocaleString()}
                              </div>
                            )}
                            {row["remaining Plants"] < (row.totalPlants ?? row.quantity) && (
                              <div className="text-[10px] text-orange-600 mt-0.5 font-medium">
                                Rem: {row["remaining Plants"]?.toLocaleString()}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-900">₹{Number(row.rate).toFixed(2)}</div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-xs font-bold text-gray-900">{row.total}</div>
                        <div className="text-[10px] text-green-600 mt-0.5 font-medium">{row["Paid Amt"]}</div>
                        <div className="text-[10px] text-amber-600 mt-0.5 font-medium">{row["remaining Amt"]}</div>
                      </td>
                      {!(showAgriSalesOrders && hidePaymentDetails) && (
                        <td className="px-2 py-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-xs font-semibold text-green-600">{row["Paid Amt"]}</div>
                            <div className="text-[10px] text-amber-600 font-medium">{row["remaining Amt"]}</div>
                            {hasPendingPayment && (
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full inline-block w-fit font-medium">
                                Pending
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {/* Dispatch Info Cell for Agri Sales */}
                      {showAgriSalesOrders && (
                        <td className="px-2 py-1">
                          {row.details?.dispatchStatus && row.details?.dispatchStatus !== "NOT_DISPATCHED" ? (
                            <div className="flex flex-col gap-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium inline-block w-fit ${
                                row.details.dispatchStatus === "DISPATCHED" 
                                  ? row.details.dispatchMode === "COURIER" ? "bg-purple-100 text-purple-700" : "bg-brand-100 text-brand-700"
                                  : row.details.dispatchStatus === "DELIVERED" ? "bg-green-100 text-green-700" 
                                  : "bg-gray-100 text-gray-700"
                              }`}>
                                {row.details.dispatchMode === "COURIER" ? "📦 " : "🚚 "}
                                {row.details.dispatchStatus}
                              </span>
                              {(row.details?.vehicleNumber || row.details?.courierName) && (
                                <div className="text-[9px] text-gray-600 truncate">
                                  {row.details.dispatchMode === "COURIER" 
                                    ? row.details.courierName || row.details.courierTrackingId || ""
                                    : row.details.vehicleNumber || ""
                                  }
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                              ⏳ Pending
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        {/* Ram Agri: status badge; Assign/Dispatch/Cancel via selection bar; PENDING: Accept/Reject */}
                        {showAgriSalesOrders ? (
                            <div className="flex flex-col gap-1">
                              <span
                                className={`status-badge-enhanced status-${toStatusBadgeCssClass(row.orderStatus)} inline-flex items-center gap-1 text-[10px] px-2 py-0.5`}>
                                {row.orderStatus === "FARM_READY" && "🌱"}
                                {row.orderStatus === "READY_FOR_DISPATCH" && "📋"}
                                {formatOrderStatusLabel(row.orderStatus)}
                              </span>
                              {row.orderStatus === "READY_FOR_DISPATCH" && (() => {
                                const badge = getReadyDispatchMarathiBadge(row)
                                if (!badge) return null
                                return (
                                  <span
                                    title={badge.label}
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-semibold max-w-[11rem] leading-tight ${badge.className}`}>
                                    {badge.label}
                                  </span>
                                )
                              })()}
                              {canChangeOrderStatus && row.orderStatus === "PENDING" && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(row, "ACCEPTED")
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-800 font-medium hover:bg-green-200">
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(row, "REJECTED")
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-medium hover:bg-gray-200">
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                        ) : (row.orderStatus !== "COMPLETED" && row.orderStatus !== "DISPATCHED" && canChangeOrderStatus) ? (
                          <SearchableDropdown
                            key={`order-status-${row.details?.orderid}-${row.orderStatus}`}
                            label=""
                            value={row.orderStatus}
                            onChange={(newStatus) => handleStatusChange(row, newStatus)}
                            options={orderStatusSelectOptionsForRow(row.orderStatus, user)}
                            placeholder="Select status"
                            maxHeight="320px"
                            isStatusDropdown={true}
                            disabled={patchLoading}
                          />
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`status-badge-enhanced status-${toStatusBadgeCssClass(row.orderStatus)} inline-flex items-center gap-1 text-[10px] px-2 py-0.5`}>
                              {row.orderStatus === "FARM_READY" && "🌱"}
                              {row.orderStatus === "READY_FOR_DISPATCH" && "📋"}
                              {formatOrderStatusLabel(row.orderStatus)}
                            </span>
                            {row.orderStatus === "READY_FOR_DISPATCH" && (() => {
                              const badge = getReadyDispatchMarathiBadge(row)
                              if (!badge) return null
                              return (
                                <span
                                  title={badge.label}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold max-w-[11rem] leading-tight ${badge.className}`}>
                                  {badge.label}
                                </span>
                              )
                            })()}
                          </div>
                        )}
                      </td>
                      <td className="hidden px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {viewMode !== "dispatch_process" &&
                          row?.orderStatus !== "COMPLETED" &&
                          row?.orderStatus !== "DISPATCH_PROCESS" &&
                          row?.orderStatus !== "DISPATCHED" &&
                          row?.orderStatus !== "READY_FOR_DISPATCH" && (
                            <div className="flex items-center space-x-2">
                              {editingRows.has(dataIndex) ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      saveEditedRow(dataIndex, row)
                                    }}
                                    className="text-green-500 hover:text-green-700 p-1 rounded hover:bg-green-50"
                                    title="Save">
                                    <CheckIcon size={18} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      cancelEditing(dataIndex)
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                    title="Cancel">
                                    <XIcon size={18} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleEditing(dataIndex, row)
                                  }}
                                  className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                                  title="Edit">
                                  <Edit2Icon size={18} />
                                </button>
                              )}
                            </div>
                          )}
                        {(row.orderStatus === "DISPATCHED" || row.orderStatus === "DISPATCH_PROCESS") && 
                         row.details?.dispatchHistory && 
                         row.details.dispatchHistory.length > 0 && (() => {
                          const latestDispatch = row.details.dispatchHistory[row.details.dispatchHistory.length - 1];
                          const driverName = latestDispatch?.dispatch?.driverName || latestDispatch?.driverName || 'N/A';
                          const vehicleName = latestDispatch?.dispatch?.vehicleName || latestDispatch?.vehicleName || 'N/A';
                          
                          if (driverName === 'N/A' && vehicleName === 'N/A') return null;
                          
                          return (
                            <div className="text-xs text-brand-600">
                              <div>🚚 {driverName}</div>
                              <div>🚗 {vehicleName}</div>
                            </div>
                          );
                        })()}
                      </td>
                    </>
                  )
                }}
                  />
                )
              })()
            ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
                <p className="text-gray-500">
                  {loading ? "Loading orders..." : "No orders match your current filters."}
                </p>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Table Footer with Summary */}
        {viewType === "table" && filteredOrders && filteredOrders.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between text-xs">
              <div className="text-gray-600">
                <>
                  Showing <span className="font-semibold">{filteredOrders.length}</span> order{filteredOrders.length !== 1 ? "s" : ""}
                </>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div>
                  Total: <span className="font-semibold text-gray-900">
                    ₹{filteredOrders.reduce((sum, o) => {
                      const total = parseFloat(o.total.replace(/[₹,\s]/g, '')) || 0
                      return sum + total
                    }, 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  Paid: <span className="font-semibold text-green-600">
                    ₹{filteredOrders.reduce((sum, o) => {
                      const paid = parseFloat(o["Paid Amt"].replace(/[₹,\s]/g, '')) || 0
                      return sum + paid
                    }, 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  Remaining: <span className="font-semibold text-amber-600">
                    ₹{filteredOrders.reduce((sum, o) => {
                      const remaining = parseFloat(o["remaining Amt"].replace(/[₹,\s]/g, '')) || 0
                      return sum + remaining
                    }, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid View */}
        {viewType === "grid" && (() => {
          const gridOrdersList =
            filteredOrders && filteredOrders.length > 0
              ? isDispatchedVehicleTab && !showAgriSalesOrders
                ? [...filteredOrders].sort((a, b) =>
                    getLatestDispatchVehicleMeta(a).key.localeCompare(
                      getLatestDispatchVehicleMeta(b).key
                    )
                  )
                : filteredOrders
              : []
          const gridRowChunks = []
          const cols = farmerOrdersGridColumnCount
          for (let i = 0; i < gridOrdersList.length; i += cols) {
            gridRowChunks.push(gridOrdersList.slice(i, i + cols))
          }
          const gridRowClass =
            cols === 1
              ? "grid-cols-1"
              : cols === 2
                ? "grid-cols-2"
                : cols === 3
                  ? "grid-cols-3"
                  : "grid-cols-4"

          return (
          <div className="p-4">
            {gridOrdersList.length > 0 ? (
              <Virtuoso
                className="w-full"
                data={gridRowChunks}
                style={{ height: "calc(100vh - 400px)", width: "100%" }}
                defaultItemHeight={400}
                increaseViewportBy={{ top: 80, bottom: 400 }}
                endReached={() => {
                  if (showAgriSalesOrders || slotId || viewMode === "dispatch_process") return
                  if (!hasMoreOrders || loading || loadingMoreOrders) return
                  loadMoreOrdersRef.current?.()
                }}
                components={
                  !showAgriSalesOrders
                    ? {
                        Footer: () => (
                          <div className="flex justify-center py-3 min-h-[44px]" aria-hidden>
                            {loadingMoreOrders && <CircularProgress size={18} />}
                          </div>
                        ),
                      }
                    : undefined
                }
                itemContent={(rowIndex, chunk) => (
                  <div className={"grid gap-3 pb-3 " + gridRowClass}>
                    {chunk.map((row, slot) => {
                      const globalIndex = rowIndex * farmerOrdersGridColumnCount + slot

                      const farmerDetails = row?.details?.farmer
                      // For Ram Agri sales orders, use customerTaluka and customerVillage
                      const farmerLocation = row.isAgriSalesOrder || row.details?.isRamAgriProduct
                        ? (row.details?.customerTaluka && row.details?.customerVillage
                            ? `${row.details.customerTaluka} → ${row.details.customerVillage}`
                            : row.details?.customerTaluka || row.details?.customerVillage || null)
                        : (farmerDetails
                            ? [farmerDetails.district, farmerDetails.village].filter(Boolean).join(" → ")
                            : null)

                      return (
                        <div
                          key={showAgriSalesOrders && row.details?.orderid ? row.details.orderid : globalIndex}
                          className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer ${
                            row?.details?.payment?.some((payment) => payment.paymentStatus === "PENDING")
                              ? "payment-blink"
                              : ""
                          } ${row?.details?.dealerOrder ? "border-sky-200 bg-sky-50" : ""}`}
                          onClick={() => {
                            setSelectedOrder(row)
                            setIsOrderModalOpen(true)
                          }}
                          >
                          {/* Card Header */}
                          <div className="p-3 border-b border-gray-100">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-gray-900 text-sm">Order #{(row.isAgriSalesOrder || row.details?.isRamAgriProduct) ? String(row.order).padStart(5, '0') : row.order}</h3>
                                  {(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && row.details?.linkedNurseryOrderCode && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyLinkedOrderCode(row.details.linkedNurseryOrderCode, e)}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-300"
                                      title="Copy linked regular order ID"
                                    >
                                      <FaCopy className="mr-1" />
                                      Linked #{row.details.linkedNurseryOrderCode}
                                    </button>
                                  )}
                                  {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && row.details?.isSplit && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300"
                                      title={`Split order — parent #${row.details?.splitHistory?.[0]?.relatedOrderNumber ?? "—"}`}
                                    >
                                      S{row.order}
                                    </span>
                                  )}
                                  {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && row.details?.isSplit && row.details?.splitHistory?.[0]?.relatedOrderNumber && (
                                    <span className="text-[10px] text-gray-500">← #{row.details.splitHistory[0].relatedOrderNumber}</span>
                                  )}
                                  {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && !row.details?.isSplit && Array.isArray(row.details?.splitOrderIds) && row.details.splitOrderIds.length > 0 && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300"
                                      title={`Split into ${row.details.splitOrderIds.length} order(s)`}
                                    >
                                      ✂ {row.details.splitOrderIds.length} split
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  {row.details?.orderFor ? (
                                    <>
                                      <span className="text-xs text-gray-500">Farmer:</span>
                                      <span className={`text-xs font-medium farmer-name-highlight`}>
                                        {row.details.farmer?.name || "Unknown"}
                                      </span>
                                      <span className="text-xs text-gray-500">| Order For:</span>
                                      <span className={`text-xs font-medium order-for-highlight`}>
                                        {row.details.orderFor.name}
                                      </span>
                                    </>
                                  ) : (
                                    <span className={`text-xs font-medium farmer-name-highlight`}>
                                      {row.farmerName}
                                    </span>
                                  )}
                                </div>
                                {row.details?.salesPerson && (
                                  <p className="text-xs text-brand-600 mt-1 font-medium">
                                    Booked by: {row.details.salesPerson.name}
                                    {row.details.salesPerson.jobTitle === "DEALER" && " (Dealer)"}
                                  </p>
                                )}
                                {farmerLocation && (
                                  <p className="text-xs text-gray-500 mt-1 font-medium truncate">{farmerLocation}</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {viewMode !== "booking" && viewMode !== "cancelled" && (
                                  <input
                                    type="checkbox"
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      toggleRowSelection(row.details.orderid, row)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    checked={selectedRows.has(row.details.orderid)}
                                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                  />
                                )}
                                {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && (
                                  <DownloadPDFButton order={row} />
                                )}
                              </div>
                            </div>
                      
                            {/* Status Badge */}
                            <div className="flex items-center justify-between mt-2">
                              {showAgriSalesOrders ? (
                                <div className="flex flex-col gap-1 w-full">
                                  <span
                                    className={`status-badge-enhanced status-${toStatusBadgeCssClass(row.orderStatus)} flex items-center gap-1`}>
                                    {row.orderStatus === "FARM_READY" && "🌱"}
                                    {row.orderStatus === "READY_FOR_DISPATCH" && "📋"}
                                    {formatOrderStatusLabel(row.orderStatus)}
                                  </span>
                                  {row.orderStatus === "READY_FOR_DISPATCH" && (() => {
                                    const badge = getReadyDispatchMarathiBadge(row)
                                    if (!badge) return null
                                    return (
                                      <span
                                        title={badge.label}
                                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold max-w-[11rem] leading-tight ${badge.className}`}>
                                        {badge.label}
                                      </span>
                                    )
                                  })()}
                                  {canChangeOrderStatus && row.orderStatus === "PENDING" && (
                                    <div className="flex flex-wrap gap-1 mt-1 w-full" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleStatusChange(row, "ACCEPTED")
                                        }}
                                        className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-800 font-medium hover:bg-green-200">
                                        Accept
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleStatusChange(row, "REJECTED")
                                        }}
                                        className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-800 font-medium hover:bg-gray-200">
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (row.orderStatus !== "COMPLETED" && row.orderStatus !== "DISPATCHED" && canChangeOrderStatus) ? (
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                  <SearchableDropdown
                                    key={`grid-status-${row.details?.orderid}-${row.orderStatus}`}
                                    label=""
                                    value={row.orderStatus}
                                    onChange={(newStatus) => handleStatusChange(row, newStatus)}
                                    options={orderStatusSelectOptionsForRow(row.orderStatus, user)}
                                    placeholder="Select status"
                                    maxHeight="320px"
                                    isStatusDropdown={true}
                                    disabled={patchLoading}
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={`status-badge-enhanced status-${toStatusBadgeCssClass(row.orderStatus)} flex items-center gap-1`}>
                                    {row.orderStatus === "FARM_READY" && "🌱"}
                                    {row.orderStatus === "READY_FOR_DISPATCH" && "📋"}
                                    {formatOrderStatusLabel(row.orderStatus)}
                                  </span>
                                  {row.orderStatus === "READY_FOR_DISPATCH" && (() => {
                                    const badge = getReadyDispatchMarathiBadge(row)
                                    if (!badge) return null
                                    return (
                                      <span
                                        title={badge.label}
                                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold max-w-[11rem] leading-tight ${badge.className}`}>
                                        {badge.label}
                                      </span>
                                    )
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                      
                          {/* Card Body */}
                          <div className="p-3 space-y-2">
                            {/* Plant Info */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Plant Type</span>
                              <span className="text-xs font-medium text-gray-900 truncate ml-2">{row.plantType}</span>
                            </div>
                      
                            {/* Quantity & Rate */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-xs text-gray-500">Total Plants</span>
                                {/* Show final quantity for completed Agri Sales orders */}
                                {row.isAgriSalesOrder && row.orderStatus === "COMPLETED" && row.details?.deliveredQuantity > 0 ? (
                                  <>
                                    <div className="text-sm font-medium text-green-700">
                                      Final: {row.details.deliveredQuantity?.toLocaleString()}
                                    </div>
                                    {row.details.returnQuantity > 0 && (
                                      <div className="text-xs text-red-600 mt-0.5">
                                        Returned: {row.details.returnQuantity?.toLocaleString()}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      Original: {row.quantity?.toLocaleString()}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-sm font-medium text-gray-900">
                                      {(row.totalPlants ?? row.quantity)?.toLocaleString()}
                                    </div>
                                    {row.additionalPlants > 0 && (
                                      <div className="text-xs text-brand-600 mt-0.5">
                                        Base: {row.basePlants?.toLocaleString()} &middot; Extra: +
                                        {row.additionalPlants?.toLocaleString()}
                                      </div>
                                    )}
                                    {row["remaining Plants"] < (row.totalPlants ?? row.quantity) && (
                                      <div className="text-xs text-orange-600 mt-0.5">
                                        Remaining: {row["remaining Plants"]?.toLocaleString()}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Rate</span>
                                <div className="text-sm font-medium text-gray-900">₹{row.rate}</div>
                              </div>
                            </div>
                      
                            {/* Financial Info */}
                            <div className="bg-gray-50 rounded-md p-2 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500">Total</span>
                                <span className="text-xs font-semibold text-gray-900">{row.total}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500">Paid</span>
                                <span className="text-xs text-green-600">{row["Paid Amt"]}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500">Remaining</span>
                                <span className="text-xs text-amber-600">{row["remaining Amt"]}</span>
                              </div>
                            </div>
                      
                            {/* Delivery Info */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Delivery Period</span>
                                <span className="text-xs font-medium text-brand-600">{row.Delivery}</span>
                              </div>
                              {row.deliveryDate && row.deliveryDate !== "-" && (
                                <div className="bg-brand-50 rounded-md p-1.5 border border-brand-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-brand-700 font-medium flex items-center">
                                      📅 Delivery Date
                                    </span>
                                    <span className="text-xs font-semibold text-brand-800">
                                      {row.deliveryDate}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                      
                            {/* Farm Ready Date Display */}
                            {row["Farm Ready"] !== "-" && (
                              <div className="flex items-center justify-between bg-green-50 rounded-md p-1.5 border border-green-200">
                                <span className="text-xs text-green-700 font-medium flex items-center">
                                  🌱 Farm Ready Date
                                </span>
                                <span className="text-xs font-semibold text-green-800">
                                  {row["Farm Ready"]}
                                </span>
                              </div>
                            )}
                      
                            {/* Dispatch Details */}
                            {(row.orderStatus === "DISPATCHED" || row.orderStatus === "DISPATCH_PROCESS") && row.details?.dispatchHistory && row.details.dispatchHistory.length > 0 && (() => {
                              const latestDispatch = row.details.dispatchHistory[row.details.dispatchHistory.length - 1];
                              const driverName = latestDispatch?.dispatch?.driverName || latestDispatch?.driverName || 'N/A';
                              const vehicleName = latestDispatch?.dispatch?.vehicleName || latestDispatch?.vehicleName || 'N/A';
                              const transportId = latestDispatch?.dispatch?.transportId || latestDispatch?.transportId;
                              const driverPhone = latestDispatch?.dispatch?.driverPhone || latestDispatch?.driverPhone;
                              
                              if (driverName === 'N/A' && vehicleName === 'N/A') return null;
                              
                              return (
                                <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-lg p-2 border-l-4 border-brand-500 shadow-sm">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-sm">🚚</span>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="font-bold text-brand-900">{driverName}</span>
                                      {driverPhone && <span className="text-gray-600">({driverPhone})</span>}
                                      <span className="text-brand-600 font-bold">→</span>
                                      <span className="font-semibold text-gray-800">🚗 {vehicleName}</span>
                                      {transportId && (
                                        <>
                                          <span className="text-brand-600 font-bold">→</span>
                                          <span className="text-[10px] font-mono font-bold text-white bg-brand-600 px-1.5 py-0.5 rounded">
                                            #{transportId}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                      
                            {/* Action Buttons */}
                            {viewMode !== "dispatch_process" &&
                              row?.orderStatus !== "COMPLETED" &&
                              row?.orderStatus !== "DISPATCH_PROCESS" &&
                              row?.orderStatus !== "DISPATCHED" &&
                              row?.orderStatus !== "READY_FOR_DISPATCH" && (
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                  {isDispatchManager && (
                                    <span className="text-xs text-brand-600 font-medium">🚚 DM Access</span>
                                  )}
                                  <div className="flex items-center space-x-2 ml-auto">
                                    {editingRows.has(globalIndex) ? (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            saveEditedRow(globalIndex, row)
                                          }}
                                          className="text-green-500 hover:text-green-700">
                                          <CheckIcon size={16} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            cancelEditing(globalIndex)
                                          }}
                                          className="text-red-500 hover:text-red-700">
                                          <XIcon size={16} />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleEditing(globalIndex, row)
                                        }}
                                        className="text-gray-500 hover:text-gray-700">
                                        <Edit2Icon size={16} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-gray-400 text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
                  <p className="text-gray-500">
                    {loading ? "Loading orders..." : "No orders match your current filters."}
                  </p>
                </div>
              </div>
            )}
          </div>
          )
        })()}
            </>
          )
        })()}
      </div>

      {/* Fixed bottom bar for batch actions */}
      {viewMode !== "booking" && viewMode !== "cancelled" && selectedRows.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm py-4 border-t shadow-lg z-50">
          <div className="flex justify-between items-center max-w-7xl mx-auto px-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedRows.size} {selectedRows.size === 1 ? "order" : "orders"} selected
              </span>
            </div>
            <button
              onClick={() => {
                setDispatchSourceGroupId(null)
                setIsDispatchFormOpen(true)
              }}
              className="bg-brand-600 text-white px-4 py-2 rounded-md shadow hover:bg-brand-700 transition-colors flex items-center space-x-2">
              <span>Proceed to Dispatch</span>
            </button>
          </div>
        </div>
      )}

      {/* Dispatch form modal */}
      {isDispatchFormOpen && (
        <DispatchForm
          open={isDispatchFormOpen}
          onClose={() => {
            setIsDispatchFormOpen(false)
            setSelectedRows(new Set())
            setDispatchSourceGroupId(null)
          }}
          selectedOrders={selectedRows}
          orders={orders}
          readyDispatchGroupId={dispatchSourceGroupId}
        />
      )}

      {/* Order Details Modal */}
      {isOrderModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Order #{selectedOrder.order}</h2>
                  {(selectedOrder.isAgriSalesOrder || selectedOrder.details?.isRamAgriProduct) && selectedOrder.details?.linkedNurseryOrderCode && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyLinkedOrderCode(selectedOrder.details.linkedNurseryOrderCode, e)}
                      className="inline-flex items-center text-brand-100/90 text-xs font-semibold mt-0.5 hover:text-white"
                      title="Copy linked regular order ID"
                    >
                      <FaCopy className="mr-1" />
                      Linked Regular Order #{selectedOrder.details.linkedNurseryOrderCode}
                    </button>
                  )}
                  <p className="text-brand-100 text-sm mt-1">
                    {selectedOrder.farmerName} • {selectedOrder.plantType}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={refreshModalData}
                    className="text-white hover:text-brand-100 transition-colors p-1 rounded hover:bg-white hover:bg-opacity-10">
                    <RefreshCw size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setIsOrderModalOpen(false)
                      setSelectedOrder(null)
                      setShowPaymentForm(false)
                      setExpandedAddPaymentAccordion(false)
                      setUpdatedObject(null)
                      setSlots([])
                      resetPaymentForm(false)
                    }}
                    className="text-white hover:text-brand-100 transition-colors">
                    <XIcon size={24} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="p-4">
                {/* Order Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-brand-50 rounded-lg p-3 border border-brand-200">
                    <div className="text-brand-600 text-xs font-medium">Total Value</div>
                    <div className="text-lg font-bold text-brand-900">
                      ₹{(selectedOrder.rate * selectedOrderCounts.total).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="text-green-600 text-xs font-medium">Paid Amount</div>
                    <div className="text-lg font-bold text-green-900">
                      ₹{getTotalPaidAmount(selectedOrder?.details?.payment).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="text-amber-600 text-xs font-medium">Remaining</div>
                    <div className="text-lg font-bold text-amber-900">
                      ₹
                      {(
                        selectedOrder.rate * selectedOrderCounts.total -
                        getTotalPaidAmount(selectedOrder?.details?.payment)
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="text-purple-600 text-xs font-medium">Status</div>
                    <div className="text-sm font-bold text-purple-900">
                      {selectedOrder.orderStatus}
                    </div>
                  </div>
                </div>

                {/* Main Content Tabs */}
                <div className="bg-white rounded-lg border">
                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200">
                    <nav className="flex space-x-6 px-4" aria-label="Tabs">
                      <button
                        onClick={() => setActiveTab("overview")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "overview"
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaUser size={14} className="mr-1" />
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab("payments")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "payments"
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaCreditCard size={14} className="mr-1" />
                        Payments
                      </button>
                      {canEditOrderCore && (
                      <button
                        onClick={() => {
                          setActiveTab("edit")
                          // Always initialize updatedObject with current values when edit tab is opened
                          if (selectedOrder) {
                            setUpdatedObject({
                              rate: selectedOrder.rate,
                                quantity: selectedOrderCounts.base,
                              bookingSlot: selectedOrder?.details?.bookingSlot?.slotId,
                              deliveryDate: selectedOrder?.details?.deliveryDate 
                                ? new Date(selectedOrder.details.deliveryDate) 
                                : null
                            })
                            setQuantityDeltaInput("")
                          }
                        }}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "edit"
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaEdit size={14} className="mr-1" />
                        Edit Order
                      </button>
                      )}
                      <button
                        onClick={() => setActiveTab("remarks")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "remarks"
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaFileAlt size={14} className="mr-1" />
                        Remarks
                      </button>
                      <button
                        onClick={() => setActiveTab("dispatchTrail")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "dispatchTrail"
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <span className="mr-1">🚚</span>
                        Dispatch Trail
                      </button>
                      <button
                        onClick={() => setActiveTab("editHistory")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "editHistory"
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <span className="mr-1">📝</span>
                        Edit History
                      </button>
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    {activeTab === "overview" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h3 className="font-medium text-gray-900 mb-3 text-sm">
                              {selectedOrder?.isAgriSalesOrder || selectedOrder?.details?.isRamAgriProduct
                                ? "Customer Information"
                                : selectedOrder?.details?.orderFor 
                                ? "Order For Information" 
                                : "Farmer Information"}
                            </h3>
                            <div className="space-y-3">
                              {selectedOrder?.isAgriSalesOrder || selectedOrder?.details?.isRamAgriProduct ? (
                                <>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Customer Name</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.customerName || selectedOrder?.farmerName}
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Mobile Number</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.customerMobile || "-"}
                                    </span>
                                  </div>
                                  {(selectedOrder?.details?.customerTaluka || selectedOrder?.details?.customerVillage) && (
                                    <div className="flex flex-col space-y-1">
                                      <span className="text-xs text-gray-500 font-medium">Location</span>
                                      <span className="font-medium text-sm text-gray-900">
                                        {selectedOrder?.details?.customerTaluka && selectedOrder?.details?.customerVillage
                                          ? `${selectedOrder.details.customerTaluka} → ${selectedOrder.details.customerVillage}`
                                          : selectedOrder?.details?.customerTaluka || selectedOrder?.details?.customerVillage || "-"}
                                      </span>
                                    </div>
                                  )}
                                  {selectedOrder?.details?.customerDistrict && (
                                    <div className="flex flex-col space-y-1">
                                      <span className="text-xs text-gray-500 font-medium">District</span>
                                      <span className="font-medium text-sm text-gray-900">
                                        {selectedOrder?.details?.customerDistrict}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : selectedOrder?.details?.orderFor ? (
                                <>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Customer Name</span>
                                    <span className="font-medium text-sm text-orange-700 bg-orange-100 px-2 py-1 rounded">
                                      👤 {selectedOrder?.details?.orderFor?.name}
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Mobile Number</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.orderFor?.mobileNumber}
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Address</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.orderFor?.address}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Name</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.farmer?.name}
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Village</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.farmer?.village}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h3 className="font-medium text-gray-900 mb-3 text-sm">Sales Person</h3>
                            <div className="space-y-3">
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-gray-500 font-medium">Name</span>
                                <span className="font-medium text-sm text-gray-900">
                                  {selectedOrder?.details?.salesPerson?.name}
                                </span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-gray-500 font-medium">Contact</span>
                                <span className="font-medium text-sm text-gray-900">
                                  {selectedOrder?.details?.salesPerson?.phoneNumber}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Show farmer information if orderFor is present but farmer also exists */}
                        {selectedOrder?.details?.orderFor && selectedOrder?.details?.farmer && (
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-200">
                              <h3 className="font-semibold text-gray-900 text-sm flex items-center">
                                <span className="mr-2 text-green-600">🌾</span>
                                Farmer Details
                              </h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <tbody className="divide-y divide-gray-200">
                                  <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3 bg-gray-50">
                                      Farmer Name
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {selectedOrder?.details?.farmer?.name || "-"}
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                      Booking Date | Mobile Number | Placed For
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <span className="inline-flex items-center gap-1.5">
                                          <span className="text-gray-500 text-xs">📅</span>
                                          <span>{selectedOrder?.orderDate || (selectedOrder?.details?.orderBookingDate ? moment(selectedOrder.details.orderBookingDate).format(ORDER_DATE_DISPLAY) : (selectedOrder?.details?.createdAt ? moment(selectedOrder.details.createdAt).format(ORDER_DATE_DISPLAY) : "-"))}</span>
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="inline-flex items-center gap-1.5">
                                          <span className="text-gray-500 text-xs">📱</span>
                                          <span>{selectedOrder?.details?.farmer?.mobileNumber || "-"}</span>
                                        </span>
                                        {selectedOrder?.details?.orderFor && (
                                          <>
                                            <span className="text-gray-300">|</span>
                                            <span className="inline-flex items-center gap-1.5">
                                              <span className="text-gray-500 text-xs">👤</span>
                                              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">
                                                {selectedOrder?.details?.orderFor?.name}
                                              </span>
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  {selectedOrder?.details?.farmer?.taluka && (
                                    <tr className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                        Taluka
                                      </td>
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        {selectedOrder?.details?.farmer?.taluka}
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                      Village
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {selectedOrder?.details?.farmer?.village || "-"}
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                      District
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {selectedOrder?.details?.farmer?.district || "-"}
                                    </td>
                                  </tr>
                                  {selectedOrder?.details?.farmer?.state && (
                                    <tr className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                        State
                                      </td>
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        {selectedOrder?.details?.farmer?.state}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-gray-900 text-sm">Order Details</h3>
                            {!selectedOrder?.isAgriSalesOrder && !selectedOrder?.details?.isRamAgriProduct && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkedAgriSourceOrder(selectedOrder)
                                  setShowAddAgriSalesOrderForm(true)
                                }}
                                className="px-2 py-1 text-xs font-semibold rounded-md bg-orange-100 text-orange-800 hover:bg-orange-200"
                              >
                                Add Agri Input Products
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">Plant Type</span>
                              <span className="font-medium text-sm text-gray-900">
                                {selectedOrder.plantType}
                              </span>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">Total Quantity</span>
                              <span className="font-medium text-sm text-gray-900">
                                {selectedOrderCounts.total?.toLocaleString()}
                              </span>
                            </div>
                            {selectedOrder["remaining Plants"] < selectedOrderCounts.total && (
                              <div className="flex flex-col space-y-1 bg-orange-50 p-2 rounded border border-orange-200">
                                <span className="text-xs text-orange-700 font-medium">📦 Remaining to Dispatch</span>
                                <span className="font-bold text-sm text-orange-900">
                                  {selectedOrder["remaining Plants"]?.toLocaleString()} plants
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">
                                Rate per Plant
                              </span>
                              <span className="font-medium text-sm text-gray-900">
                                ₹{selectedOrder.rate}
                              </span>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">
                                Delivery Period
                              </span>
                              <span className="font-medium text-sm text-gray-900">
                                {selectedOrder.Delivery}
                              </span>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">Order Booking Date</span>
                              <span className="font-medium text-sm text-gray-900">
                                {selectedOrder.orderDate}
                              </span>
                            </div>
                            {selectedOrder.deliveryDate && selectedOrder.deliveryDate !== "-" && (
                              <div className="flex flex-col space-y-1 bg-brand-50 p-2 rounded border border-brand-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-brand-700 font-medium">📅 Delivery Date</span>
                                  {canEditOrderCore && (
                                  <button
                                    onClick={() => {
                                      setActiveTab("edit")
                                      const { base } = resolvePlantCounts(selectedOrder)
                                      setUpdatedObject({
                                        rate: selectedOrder.rate,
                                        quantity: base,
                                        bookingSlot: selectedOrder?.details?.bookingSlot?.slotId,
                                        deliveryDate: selectedOrder?.details?.deliveryDate 
                                          ? new Date(selectedOrder.details.deliveryDate) 
                                          : null
                                      })
                                      setQuantityDeltaInput("")
                                    }}
                                    className="text-xs text-brand-600 hover:text-brand-800 underline">
                                    Change
                                  </button>
                                  )}
                                </div>
                                <span className="font-bold text-sm text-brand-900">
                                  {selectedOrder.deliveryDate}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">Farm Ready</span>
                              <span className="font-medium text-sm text-gray-900">
                                {selectedOrder["Farm Ready"]}
                              </span>
                            </div>
                          </div>
                        </div>

                        {linkedAgriLoading && !selectedOrder?.isAgriSalesOrder && !selectedOrder?.details?.isRamAgriProduct && (
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <div className="text-sm text-gray-500">Loading Agri Inputs products...</div>
                          </div>
                        )}

                        {!linkedAgriLoading &&
                          !selectedOrder?.isAgriSalesOrder &&
                          !selectedOrder?.details?.isRamAgriProduct &&
                          linkedAgriItems.length > 0 &&
                          (() => {
                            const hasPendingLoad = linkedAgriItems.some(
                              (item) => String(item?.agriLoadStatus || "PENDING_LOAD").toUpperCase() !== "LOADED"
                            )
                            const orderStatusUpper = String(selectedOrder?.orderStatus || "").toUpperCase()
                            const dispatchStatusUpper = String(
                              selectedOrder?.details?.dispatchStatus || selectedOrder?.dispatchStatus || ""
                            ).toUpperCase()
                            const isDispatchedOrder =
                              orderStatusUpper === "DISPATCH_PROCESS" ||
                              orderStatusUpper === "DISPATCHED" ||
                              dispatchStatusUpper === "DISPATCHED"
                            const dispatchHistory = selectedOrder?.details?.dispatchHistory || []
                            const latestDispatch = dispatchHistory.length
                              ? dispatchHistory[dispatchHistory.length - 1]
                              : null
                            const hasVehicleOrDriver =
                              Boolean(latestDispatch?.dispatch?.vehicleName || latestDispatch?.vehicleName) ||
                              Boolean(latestDispatch?.dispatch?.driverName || latestDispatch?.driverName)
                            const showBlinkAlert = hasPendingLoad && isDispatchedOrder && hasVehicleOrDriver
                            return (
                              <div
                                className={`rounded-lg border p-3 ${
                                  showBlinkAlert
                                    ? "bg-amber-50 border-amber-300"
                                    : hasPendingLoad
                                    ? "bg-amber-50/60 border-amber-200"
                                    : "bg-white border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-medium text-gray-900 text-sm">Agri Inputs Products</h3>
                                  {showBlinkAlert && (
                                    <span className="text-[11px] px-2 py-1 rounded bg-red-100 text-red-700 font-semibold animate-pulse">
                                      Dispatch Done - Agri Load Pending
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {linkedAgriItems.map((item) => {
                                    const loadStatus = String(item?.agriLoadStatus || "PENDING_LOAD").toUpperCase()
                                    return (
                                      <div
                                        key={item?._id}
                                        className="flex items-center justify-between text-sm border rounded-md px-3 py-2 bg-gray-50"
                                      >
                                        <div className="min-w-0">
                                          <div className="font-medium text-gray-900 truncate">
                                            {item?.productName || `${item?.ramAgriCropName || ""} ${item?.ramAgriVarietyName || ""}`.trim()}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            Qty: {item?.quantity || 0} | Rate: ₹{item?.rate || 0} | Amount: ₹{Number(item?.totalAmount || (Number(item?.quantity || 0) * Number(item?.rate || 0))).toLocaleString()}
                                          </div>
                                        </div>
                                        <span
                                          className={`text-[11px] px-2 py-1 rounded font-semibold ${
                                            loadStatus === "LOADED"
                                              ? "bg-green-100 text-green-700"
                                              : "bg-amber-100 text-amber-700"
                                          }`}
                                        >
                                          {loadStatus === "LOADED" ? "Loaded" : "Pending Load"}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })()}

                        {/* Farm Ready Date History */}
                        {selectedOrder?.details?.farmReadyDateChanges &&
                          selectedOrder?.details?.farmReadyDateChanges.length > 0 && (
                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                              <h3 className="font-medium text-amber-900 mb-2 flex items-center text-sm">
                                <span className="mr-1">🌾</span>
                                Farm Ready Date History
                              </h3>
                              <div className="space-y-1">
                                {(selectedOrder.details.farmReadyDateChanges || []).map(
                                  (change, index) => (
                                    <div
                                      key={index}
                                      className={`flex items-center justify-between p-2 rounded text-sm ${
                                        index === 0 ? "bg-amber-100" : "bg-white"
                                      }`}>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-amber-900">
                                            {change.newDate
                                              ? moment(change.newDate).format(ORDER_DATE_DISPLAY)
                                              : "Not set"}
                                          </span>
                                          {index === 0 && (
                                            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full ml-2">
                                              Latest
                                            </span>
                                          )}
                                        </div>
                                        {change.previousDate && (
                                          <div className="text-xs text-amber-700 mt-1">
                                            Changed from:{" "}
                                            {moment(change.previousDate).format(ORDER_DATE_DISPLAY)}
                                          </div>
                                        )}
                                        {change.reason && (
                                          <div className="text-xs text-amber-600 mt-1">
                                            Reason: {change.reason}
                                          </div>
                                        )}
                                        {change.notes && (
                                          <div className="text-xs text-amber-600 mt-1">
                                            Notes: {change.notes}
                                          </div>
                                        )}
                                        {change.changedBy && (
                                          <div className="text-xs text-amber-600 mt-1">
                                            Changed by: {change.changedBy?.name || "Unknown User"}
                                          </div>
                                        )}
                                        <div className="text-xs text-amber-500 mt-1">
                                          {change.createdAt
                                            ? moment(change.createdAt).format(ORDER_DATETIME_DISPLAY)
                                            : ""}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Status History */}
                        {selectedOrder?.details?.statusChanges &&
                          selectedOrder?.details?.statusChanges.length > 0 && (
                            <div className="bg-brand-50 rounded-lg p-3 border border-brand-200">
                              <h3 className="font-medium text-brand-900 mb-2 flex items-center text-sm">
                                <span className="mr-1">📊</span>
                                Status Change History
                              </h3>
                              <div className="space-y-1">
                                {(selectedOrder.details.statusChanges || []).map(
                                  (change, index) => (
                                    <div
                                      key={index}
                                      className="bg-white p-2 rounded border text-sm">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-gray-900">
                                          {change.previousStatus} → {change.newStatus}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {moment(change.changedAt).format(ORDER_DATETIME_DISPLAY)}
                                        </span>
                                      </div>
                                      {change.changedBy && (
                                        <div className="text-xs text-gray-600">
                                          Changed by: {change.changedBy.name}
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Delivery Changes */}
                        {selectedOrder?.details?.deliveryChanges &&
                          selectedOrder?.details?.deliveryChanges.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                              <h3 className="font-medium text-green-900 mb-3 flex items-center">
                                <span className="mr-2">🚚</span>
                                Delivery Change History
                              </h3>
                              <div className="space-y-3">
                                {(selectedOrder.details.deliveryChanges || []).map(
                                  (change, index) => {
                                    const prevStartDay = change.previousDeliveryDate?.startDay
                                    const prevEndDay = change.previousDeliveryDate?.endDay
                                    const prevMonth = change.previousDeliveryDate?.month
                                    const prevYear = change.previousDeliveryDate?.year

                                    const newStartDay = change.newDeliveryDate?.startDay
                                    const newEndDay = change.newDeliveryDate?.endDay
                                    const newMonth = change.newDeliveryDate?.month
                                    const newYear = change.newDeliveryDate?.year

                                    return (
                                      <div key={index} className="bg-white p-3 rounded border">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-gray-900">
                                            Delivery Changed
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {moment(change.changedAt).format(ORDER_DATE_DISPLAY)}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                          <div className="bg-red-50 px-3 py-2 rounded-md">
                                            <span className="text-red-500 line-through text-sm">
                                              {prevStartDay} - {prevEndDay} {prevMonth} {prevYear}
                                            </span>
                                          </div>
                                          <div className="flex justify-center">
                                            <span className="text-gray-400">→</span>
                                          </div>
                                          <div className="bg-green-50 px-3 py-2 rounded-md">
                                            <span className="text-green-600 font-medium text-sm">
                                              {newStartDay} - {newEndDay} {newMonth} {newYear}
                                            </span>
                                          </div>
                                        </div>
                                        {change.reasonForChange && (
                                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                                            <span className="font-medium">Reason:</span>{" "}
                                            {change.reasonForChange}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }
                                )}
                              </div>
                            </div>
                          )}

                        {/* Dispatch History */}
                        {selectedOrder?.details?.dispatchHistory &&
                          selectedOrder?.details?.dispatchHistory.length > 0 && (
                            <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                              <h3 className="font-medium text-brand-900 mb-3 flex items-center">
                                <span className="mr-2">🚚</span>
                                Dispatch History
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Total Plants</div>
                                  <div className="text-xl font-bold text-gray-900">
                                    {selectedOrderCounts.total?.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Dispatched Plants</div>
                                  <div className="text-xl font-bold text-brand-600">
                                    {selectedOrderDispatchStats.dispatchedPlants?.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Remaining to Dispatch</div>
                                  <div className="text-xl font-bold text-orange-600">
                                    {selectedOrderDispatchStats.remainingToDispatch?.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {(selectedOrder.details.dispatchHistory || []).map(
                                  (dispatchItem, dispatchIndex) => (
                                    <div key={dispatchIndex} className="bg-white p-3 rounded border">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-brand-600">
                                          {dispatchItem.quantity} plants dispatched
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {dispatchItem.date
                                            ? moment(dispatchItem.date).format(ORDER_DATETIME_DISPLAY)
                                            : "N/A"}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        <span className="font-medium">Remaining after dispatch:</span>{" "}
                                        {dispatchItem.remainingAfterDispatch} plants
                                      </div>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {dispatchItem.dispatchId && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            Dispatch ID: {dispatchItem.dispatchId}
                                          </span>
                                        )}
                                        {dispatchItem.processedBy && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            Processed by: {dispatchItem.processedBy.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Return History */}
                        {selectedOrder?.details?.returnHistory &&
                          selectedOrder?.details?.returnHistory.length > 0 && (
                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                              <h3 className="font-medium text-red-900 mb-3 flex items-center">
                                <span className="mr-2">🔄</span>
                                Plant Return History
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Total Plants</div>
                                  <div className="text-xl font-bold text-gray-900">
                                    {selectedOrderCounts.total?.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Returned Plants</div>
                                  <div className="text-xl font-bold text-red-600">
                                    {selectedOrder["returned Plants"]?.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Net with farmer</div>
                                  <div className="text-xl font-bold text-green-600">
                                    {selectedOrderDispatchStats.netWithFarmer?.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {(selectedOrder.details.returnHistory || []).map(
                                  (returnItem, returnIndex) => (
                                    <div key={returnIndex} className="bg-white p-3 rounded border">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-red-600">
                                          {returnItem.quantity} plants returned
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {returnItem.date
                                            ? moment(returnItem.date).format(ORDER_DATE_DISPLAY)
                                            : "N/A"}
                                        </span>
                                      </div>
                                      {returnItem.reason && (
                                        <div className="text-sm text-gray-600">
                                          <span className="font-medium">Reason:</span>{" "}
                                          {returnItem.reason}
                                        </div>
                                      )}
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {returnItem.dispatchId && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            Dispatch ID: {returnItem.dispatchId}
                                          </span>
                                        )}
                                        {returnItem.processedBy && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            Processed by: {returnItem.processedBy.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {activeTab === "payments" && (
                      <div className="space-y-2">
                        <Accordion defaultExpanded sx={{ boxShadow: "none", border: "1px solid #e5e7eb", borderRadius: 1, "&:before": { display: "none" } }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#f9fafb", minHeight: 48 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                              <Typography variant="subtitle2" fontWeight={600} color="text.primary">Payment Status</Typography>
                              <Typography variant="body2" color="text.secondary">Total: ₹{paymentSummary?.total?.toLocaleString()} · Paid: ₹{paymentSummary?.paid?.toLocaleString()} · Balance: ₹{paymentSummary?.balance?.toLocaleString()}</Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ py: 1 }}>
                            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                              <Box><Typography variant="caption" color="text.secondary">Total</Typography><Typography fontWeight={600}>₹{paymentSummary?.total?.toLocaleString()}</Typography></Box>
                              <Box><Typography variant="caption" color="text.secondary">Paid</Typography><Typography fontWeight={600} color="success.main">₹{paymentSummary?.paid?.toLocaleString()}</Typography></Box>
                              <Box><Typography variant="caption" color="text.secondary">Balance</Typography><Typography fontWeight={600} color={paymentSummary?.balance > 0 ? "warning.main" : "text.primary"}>₹{paymentSummary?.balance?.toLocaleString()}</Typography></Box>
                            </Box>
                          </AccordionDetails>
                        </Accordion>

                        <Accordion
                          expanded={expandedAddPaymentAccordion}
                          onChange={(_, expanded) => {
                            setExpandedAddPaymentAccordion(expanded)
                            if (expanded) {
                              if (!showPaymentForm) initializePaymentForm()
                              setShowPaymentForm(true)
                            } else {
                              setShowPaymentForm(false)
                            }
                          }}
                          sx={{ boxShadow: "none", border: "1px solid #e5e7eb", borderRadius: 1, "&:before": { display: "none" } }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#f0fdf4", minHeight: 48 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", pr: 1, flexWrap: "wrap", gap: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600} color="success.dark">Add Payment</Typography>
                              {canAddPayment && (
                                <>
                                  {paymentSummary?.balance > 0 && !hasActiveQR && (
                                    <button
                                      type="button"
                                      disabled={generateQRLoading}
                                      onClick={(e) => { e.stopPropagation(); handleGeneratePaymentQR(); }}
                                      className="bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700 text-sm disabled:opacity-50"
                                    >
                                      {generateQRLoading ? "Generating…" : "Generate Payment QR"}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); if (!expandedAddPaymentAccordion) { if (!showPaymentForm) initializePaymentForm(); setShowPaymentForm(true); setExpandedAddPaymentAccordion(true); } }}
                                    className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-sm"
                                  >
                                    + Add Payment
                                    {isOfficeAdmin && <span className="ml-1 text-xs">(PENDING only)</span>}
                                  </button>
                                </>
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ bgcolor: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
                        <div className="relative overflow-hidden rounded-lg">
                          {(paymentReceiptBusy || upiOcrLoading) && (
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

                            {/* Payment receipt FIRST — then payee & grid (OCR fills fields below) */}
                            <div className="mb-4 pb-4 border-b border-gray-200">
                              <label className="text-sm text-gray-700 font-semibold">
                                Payment Receipt Photo
                              </label>
                              <p className="text-xs text-gray-500 mt-1 mb-2">
                                {newPayment.modeOfPayment &&
                                !["Cash", "NEFT/RTGS", "Wallet"].includes(newPayment.modeOfPayment) &&
                                !newPayment.isWalletPayment
                                  ? `Required for ${newPayment.modeOfPayment}. `
                                  : "Optional for Cash & NEFT/RTGS. "}
                                Upload first — we scan the receipt to fill payee, amount, date, and UTR when possible.
                              </p>
                              {(paymentReceiptBusy || upiOcrLoading) && (
                                <LinearProgress sx={{ maxWidth: 280, width: "100%", height: 3, borderRadius: 1, mb: 1 }} />
                              )}
                              <div className="mt-2 inline-block max-w-xs w-full">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  disabled={paymentReceiptBusy || upiOcrLoading}
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files)
                                    if (files.length === 0) return
                                    try {
                                      setPaymentReceiptBusy(true)
                                      const uploadedUrls = (
                                        await Promise.all(
                                          files.map(async (file, idx) => {
                                            const formData = new FormData()
                                            formData.append("media_key", file)
                                            formData.append("media_type", "IMAGE")
                                            formData.append("content_type", "multipart/form-data")
                                            const instance = NetworkManager(API.MEDIA.UPLOAD, false, {
                                              abortScope: `pay-receipt-${idx}`,
                                            })
                                            const response = await instance.request(formData)
                                            return (
                                              response?.data?.data?.media_url ||
                                              response?.data?.media_url
                                            )
                                          })
                                        )
                                      ).filter(Boolean)
                                      setNewPayment((prev) => ({
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
                                            setNewPayment((prev) => mergeUpiOcrIntoPaymentState(prev, d))
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
                                      setPaymentReceiptBusy(false)
                                      e.target.value = ""
                                    }
                                  }}
                                  className="w-full max-w-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                />
                                {newPayment.modeOfPayment &&
                                  newPayment.modeOfPayment !== "Cash" &&
                                  newPayment.modeOfPayment !== "NEFT/RTGS" &&
                                  !newPayment.isWalletPayment && (
                                  <p className="text-xs text-red-600 mt-1">
                                    {newPayment.modeOfPayment === "UPI" || newPayment.modeOfPayment === "Cheque"
                                      ? "Receipt photo is mandatory for UPI and Cheque."
                                      : `Payment image is mandatory for ${newPayment.modeOfPayment} payments`}
                                  </p>
                                )}
                                {newPayment.receiptPhoto && newPayment.receiptPhoto.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {newPayment.receiptPhoto.map((photo, index) => (
                                      <div key={index} className="relative">
                                        <img
                                          src={photo}
                                          alt={`Receipt ${index + 1}`}
                                          className="w-16 h-16 object-cover rounded border"
                                        />
                                        <button
                                          onClick={() => {
                                            const updatedPhotos = newPayment.receiptPhoto.filter((_, i) => i !== index)
                                            handlePaymentInputChange("receiptPhoto", updatedPhotos)
                                          }}
                                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
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
                                value={newPayment.receiptPayeeName || ""}
                                onChange={(e) =>
                                  handlePaymentInputChange("receiptPayeeName", e.target.value)
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
                                  value={newPayment.paidAmount}
                                  onChange={(e) =>
                                    handlePaymentInputChange("paidAmount", e.target.value)
                                  }
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
                                  value={newPayment.paymentDate}
                                  onChange={(e) =>
                                    handlePaymentInputChange("paymentDate", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Payment Mode
                                </label>
                                <select
                                  value={newPayment.modeOfPayment}
                                  onChange={(e) =>
                                    handlePaymentInputChange("modeOfPayment", e.target.value)
                                  }
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
                                <div
                                  className={`w-full px-3 py-2 border rounded-lg mt-1 text-sm ${
                                    getPaymentStatusDisplay().bgColor
                                  } ${getPaymentStatusDisplay().color} ${
                                    getPaymentStatusDisplay().borderColor
                                  }`}>
                                  {getPaymentStatusDisplay().status} (
                                  {getPaymentStatusDisplay().message})
                                </div>
                              </div>
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Bank Name
                                </label>
                                <input
                                  type="text"
                                  value={newPayment.bankName}
                                  onChange={(e) =>
                                    handlePaymentInputChange("bankName", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                                  placeholder={
                                    newPayment.modeOfPayment === "Cheque" ||
                                    newPayment.modeOfPayment === "NEFT/RTGS"
                                      ? "Enter bank name"
                                      : "N/A"
                                  }
                                  disabled={
                                    newPayment.modeOfPayment !== "Cheque" &&
                                    newPayment.modeOfPayment !== "NEFT/RTGS"
                                  }
                                />
                              </div>
                            </div>

                            {newPayment.modeOfPayment === "Cheque" && !newPayment.isWalletPayment && (
                              <div className="mt-4 w-full max-w-full">
                                <label className="text-sm text-gray-500 font-medium">Cheque number</label>
                                <input
                                  type="text"
                                  value={newPayment.chequeNumber}
                                  onChange={(e) =>
                                    handlePaymentInputChange("chequeNumber", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                                  placeholder="Cheque number (for bank reconciliation)"
                                />
                              </div>
                            )}
                            {(newPayment.modeOfPayment === "UPI" ||
                              newPayment.modeOfPayment === "NEFT/RTGS") &&
                              !newPayment.isWalletPayment && (
                                <div className="mt-4 w-full max-w-full">
                                  <label className="text-sm text-gray-500 font-medium">UTR</label>
                                  <input
                                    type="text"
                                    value={newPayment.utrNumber}
                                    onChange={(e) =>
                                      handlePaymentInputChange("utrNumber", e.target.value)
                                    }
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                                    placeholder="UPI / NEFT / RTGS UTR (for bank match)"
                                  />
                                </div>
                              )}
                            <div className="mt-4 w-full max-w-full">
                              <label className="text-sm text-gray-500 font-medium">
                                Transaction ID / bank reference (optional)
                              </label>
                              <input
                                type="text"
                                value={newPayment.transactionId}
                                onChange={(e) =>
                                  handlePaymentInputChange("transactionId", e.target.value)
                                }
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                                placeholder="Additional bank transaction id if different from UTR"
                                disabled={
                                  !newPayment.modeOfPayment ||
                                  newPayment.isWalletPayment ||
                                  newPayment.modeOfPayment === "Cash"
                                }
                              />
                            </div>
                            <div className="mt-4">
                              <label className="text-sm text-gray-500 font-medium">Remark</label>
                              <input
                                type="text"
                                value={newPayment.remark}
                                onChange={(e) => handlePaymentInputChange("remark", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                                placeholder="Optional remark"
                              />
                            </div>

                            {/* Wallet Payment Status Indicator */}
                            {newPayment.isWalletPayment && (
                              <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center">
                                  <div className="text-green-600 mr-2">✓</div>
                                  <div className="text-sm text-green-800">
                                    <div className="font-medium">Wallet Payment Ready</div>
                                    <div className="text-xs text-green-600 mt-1">
                                      Payment will be processed from wallet with status:{" "}
                                      {newPayment.paymentStatus || "PENDING"}
                                      {newPayment.paymentStatus === "PENDING" &&
                                        " (No wallet impact until collected)"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Dealer Wallet Payment Processing Info */}
                            {selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
                              newPayment.isWalletPayment &&
                              dealerWalletData && (
                                <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200">
                                  <div className="flex items-center">
                                    <div className="text-green-600 mr-2">✓</div>
                                    <div className="text-sm text-green-800">
                                      <div className="font-medium">Dealer Wallet Payment Ready</div>
                                      <div className="text-xs text-green-600 mt-1">
                                        Payment will be processed from dealer wallet:{" "}
                                        {selectedOrder?.details?.salesPerson?.name}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Wallet Payment Option - Show for Accountant, Super Admin, Office Admin, or when dealer is present */}
                            {(user?.role === "SUPER_ADMIN" ||
                              user?.role === "ACCOUNTANT" ||
                              user?.role === "OFFICE_ADMIN" ||
                              selectedOrder?.details?.salesPerson?.jobTitle === "DEALER") && (
                              <div className="mt-4">
                                {/* Dealer Wallet Information */}
                                {selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
                                  dealerWalletData && (
                                    <div className="mb-4 bg-brand-50 p-4 rounded-lg border border-brand-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-sm font-medium text-brand-900">
                                          Dealer Wallet: {selectedOrder?.details?.salesPerson?.name}
                                        </h5>
                                        {dealerWalletLoading && (
                                          <div className="text-xs text-brand-600">Loading...</div>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <div className="text-brand-600 font-medium">
                                            Available Balance
                                          </div>
                                          <div className="text-lg font-bold text-brand-900">
                                            ₹
                                            {(
                                              dealerWalletData?.financial?.availableAmount ?? 0
                                            )?.toLocaleString()}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-brand-600 font-medium">
                                            Total Orders
                                          </div>
                                          <div className="text-lg font-bold text-brand-900">
                                            ₹
                                            {(
                                              dealerWalletData?.financial?.totalOrderAmount ?? 0
                                            )?.toLocaleString()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      id="walletPayment"
                                      checked={newPayment.isWalletPayment}
                                      onChange={(e) =>
                                        handlePaymentInputChange(
                                          "isWalletPayment",
                                          e.target.checked
                                        )
                                      }
                                      className="mr-3 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                                    />
                                    <label
                                      htmlFor="walletPayment"
                                      className="text-gray-700 font-medium">
                                      Pay from Wallet
                                    </label>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500">
                                      {selectedOrder?.details?.salesPerson?.jobTitle === "DEALER"
                                        ? "Dealer Wallet Balance"
                                        : "Wallet Balance"}
                                    </div>
                                    <div
                                      className={`text-base font-bold ${
                                        newPayment.isWalletPayment &&
                                        Number(newPayment.paidAmount) >
                                          (selectedOrder?.details?.salesPerson?.jobTitle ===
                                          "DEALER"
                                            ? dealerWalletData?.financial?.availableAmount ?? 0
                                            : walletData?.financial?.availableAmount ?? 0)
                                          ? "text-red-600"
                                          : "text-gray-800"
                                      }`}>
                                      ₹
                                      {(selectedOrder?.details?.salesPerson?.jobTitle === "DEALER"
                                        ? dealerWalletData?.financial?.availableAmount ?? 0
                                        : walletData?.financial?.availableAmount ?? 0
                                      )?.toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                {/* Warning messages for wallet payment */}
                                {newPayment.isWalletPayment && (
                                  <div className="mt-2">
                                    {Number(newPayment.paidAmount) >
                                      (selectedOrder?.details?.salesPerson?.jobTitle === "DEALER"
                                        ? dealerWalletData?.financial?.availableAmount ?? 0
                                        : walletData?.financial?.availableAmount ?? 0) && (
                                      <div className="bg-red-50 p-3 rounded-lg">
                                        <div className="text-sm text-red-600 font-medium">
                                          Insufficient wallet balance! Available: ₹
                                          {(selectedOrder?.details?.salesPerson?.jobTitle ===
                                          "DEALER"
                                            ? dealerWalletData?.financial?.availableAmount ?? 0
                                            : walletData?.financial?.availableAmount ?? 0
                                          )?.toLocaleString()}
                                        </div>
                                      </div>
                                    )}

                                    {!newPayment.paidAmount && (
                                      <div className="bg-amber-50 p-3 rounded-lg">
                                        <div className="text-sm text-amber-600 font-medium">
                                          Please enter payment amount
                                        </div>
                                      </div>
                                    )}

                                    {Number(newPayment.paidAmount) <=
                                      (walletData?.financial?.availableAmount ?? 0) &&
                                      newPayment.paidAmount && (
                                        <div className="bg-green-50 p-3 rounded-lg">
                                          <div className="text-sm text-green-600 font-medium">
                                            Sufficient balance available
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Dealer Wallet Payment Option for Accountants and Office Admins (when sales person is dealer) */}
                            {(user?.role === "SUPER_ADMIN" ||
                              user?.role === "ACCOUNTANT" ||
                              user?.role === "OFFICE_ADMIN") &&
                              !isDealer &&
                              selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" && (
                                <div className="mt-4">
                                  <div className="bg-brand-50 p-4 rounded-xl border border-brand-200">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center">
                                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                                          <FaCreditCard className="text-brand-600 text-sm" />
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-brand-900">
                                            Dealer Wallet Payment
                                          </div>
                                          <div className="text-xs text-brand-600">
                                            Sales Person:{" "}
                                            {selectedOrder?.details?.salesPerson?.name}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-brand-600">
                                          Available Balance
                                        </div>
                                        <div className="text-lg font-bold text-brand-900">
                                          ₹
                                          {(
                                            dealerWalletData?.financial?.availableAmount ?? 0
                                          )?.toLocaleString()}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center">
                                      <input
                                        type="checkbox"
                                        id="dealerWalletPayment"
                                        checked={newPayment.isWalletPayment}
                                        onChange={(e) =>
                                          handlePaymentInputChange(
                                            "isWalletPayment",
                                            e.target.checked
                                          )
                                        }
                                        className="mr-3 w-4 h-4 text-brand-600 bg-brand-100 border-brand-300 rounded focus:ring-brand-500"
                                      />
                                      <label
                                        htmlFor="dealerWalletPayment"
                                        className="text-brand-800 font-medium">
                                        Pay from Dealer&apos;s Wallet
                                      </label>
                                    </div>

                                    {/* Warning messages for dealer wallet payment */}
                                    {newPayment.isWalletPayment && (
                                      <div className="mt-3 space-y-2">
                                        {Number(newPayment.paidAmount) >
                                          (dealerWalletData?.financial?.availableAmount ?? 0) && (
                                          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                            <div className="text-sm text-red-600 font-medium">
                                              ⚠️ Insufficient dealer wallet balance! Available: ₹
                                              {(
                                                dealerWalletData?.financial?.availableAmount ?? 0
                                              )?.toLocaleString()}
                                            </div>
                                          </div>
                                        )}

                                        {!newPayment.paidAmount && (
                                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                            <div className="text-sm text-amber-600 font-medium">
                                              ℹ️ Please enter payment amount
                                            </div>
                                          </div>
                                        )}

                                        {Number(newPayment.paidAmount) <=
                                          (dealerWalletData?.financial?.availableAmount ?? 0) &&
                                          newPayment.paidAmount && (
                                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                              <div className="text-sm text-green-600 font-medium">
                                                ✅ Sufficient dealer balance available
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            <div className="flex items-center justify-end space-x-2 mt-4">
                              <button
                                onClick={() => { setShowPaymentForm(false); setExpandedAddPaymentAccordion(false); }}
                                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">
                                Cancel
                              </button>
                              {canAddPayment && (
                                <button
                                  onClick={() =>
                                    handleAddPaymentWithConfirm(selectedOrder.details.orderid)
                                  }
                                  disabled={
                                    paymentReceiptBusy ||
                                    upiOcrLoading ||
                                    !newPayment.paidAmount ||
                                    (!newPayment.isWalletPayment && !newPayment.modeOfPayment) ||
                                    (isDealer &&
                                      newPayment.isWalletPayment &&
                                      (Number(newPayment.paidAmount) >
                                        (walletData?.financial?.availableAmount ?? 0) ||
                                        !newPayment.paidAmount)) ||
                                    (!isDealer &&
                                      selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
                                      newPayment.isWalletPayment &&
                                      (Number(newPayment.paidAmount) >
                                        (dealerWalletData?.financial?.availableAmount ?? 0) ||
                                        !newPayment.paidAmount))
                                  }
                                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                    (isDealer &&
                                      newPayment.isWalletPayment &&
                                      (Number(newPayment.paidAmount) >
                                        (walletData?.financial?.availableAmount ?? 0) ||
                                        !newPayment.paidAmount)) ||
                                    (!isDealer &&
                                      selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
                                      newPayment.isWalletPayment &&
                                      (Number(newPayment.paidAmount) >
                                        (dealerWalletData?.financial?.availableAmount ?? 0) ||
                                        !newPayment.paidAmount))
                                      ? "bg-gray-300 text-gray-500"
                                      : "bg-green-500 text-white hover:bg-green-600"
                                  }`}>
                                  Add Payment
                                  {isOfficeAdmin && (
                                    <span className="ml-1 text-xs">(PENDING only)</span>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          </div>
                          </AccordionDetails>
                        </Accordion>

                        <Accordion defaultExpanded sx={{ boxShadow: "none", border: "1px solid #e5e7eb", borderRadius: 1, "&:before": { display: "none" } }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#fafafa", minHeight: 48 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", pr: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                                Payment History {(selectedOrder?.details?.payment || []).length > 0 && `(${(selectedOrder.details.payment || []).length})`}
                              </Typography>
                              {canAddPayment && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); if (!showPaymentForm) initializePaymentForm(); setShowPaymentForm(true); setExpandedAddPaymentAccordion(true); }}
                                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                                >
                                  + Add Payment
                                </button>
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 0 }}>
                            {selectedOrder?.details?.payment && selectedOrder.details.payment.length > 0 ? (
                              <div className="divide-y">
                                {(selectedOrder.details.payment || []).map((payment, pIndex) => {
                                  const bankPres = getStatementMatchPresentation(payment)
                                  const iciciRef = payment?.merchantTranId || payment?.qrReferenceId
                                  const refLine =
                                    payment.utrNumber ||
                                    payment.transactionId ||
                                    payment.chequeNumber ||
                                    iciciRef ||
                                    ""
                                  const showVerifyIcici =
                                    iciciRef &&
                                    String(iciciRef).trim() !== "" &&
                                    (String(payment.modeOfPayment || "").toUpperCase().includes("UPI") ||
                                      String(payment.modeOfPayment || "").toUpperCase().includes("QR"))
                                  const payId = payment?._id != null ? String(payment._id) : String(pIndex)
                                  return (
                                    <div key={pIndex} className="p-3 hover:bg-gray-50 flex flex-col gap-1.5">
                                      <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center flex-wrap gap-2">
                                          <span className="text-base font-semibold text-gray-900">₹{payment.paidAmount}</span>
                                          <span className="text-xs text-gray-500">{payment.modeOfPayment}</span>
                                          <span className={`px-2 py-0.5 text-xs rounded-full ${payment.paymentStatus === "COLLECTED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                            {payment.paymentStatus}
                                          </span>
                                          {payment.isWalletPayment && <span className="px-2 py-0.5 text-xs rounded-full bg-brand-100 text-brand-700">Wallet</span>}
                                          <span className="text-xs text-gray-500">{moment(payment.paymentDate).format(ORDER_DATE_DISPLAY)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {showVerifyIcici && (
                                            <button
                                              type="button"
                                              disabled={verifyIciciLoadingPaymentId === payId}
                                              onClick={() => handleVerifyIciciForPayment(payment)}
                                              className="text-xs font-medium px-2 py-1 rounded border border-teal-600 text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                                            >
                                              {verifyIciciLoadingPaymentId === payId ? "Checking…" : "Verify with ICICI"}
                                            </button>
                                          )}
                                          {canAddPayment && (
                                            <button
                                              type="button"
                                              onClick={() => { if (!showPaymentForm) initializePaymentForm(); setShowPaymentForm(true); setExpandedAddPaymentAccordion(true); }}
                                              className="text-xs text-green-600 hover:text-green-700 font-medium"
                                            >
                                              + Add payment
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs">
                                        <span className={bankPres.className}>{bankPres.label}</span>
                                      </div>
                                      {refLine ? (
                                        <div className="text-[11px] text-gray-600 break-all">
                                          Ref: {refLine}
                                        </div>
                                      ) : null}
                                      {payment.remark && <div className="w-full text-xs text-gray-600">Remark: {payment.remark}</div>}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <Box sx={{ p: 2, textAlign: "center" }}>
                                <Typography variant="body2" color="text.secondary">No payments yet.</Typography>
                                {canAddPayment && (
                                  <button
                                    type="button"
                                    onClick={() => { if (!showPaymentForm) initializePaymentForm(); setShowPaymentForm(true); setExpandedAddPaymentAccordion(true); }}
                                    className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium"
                                  >
                                    + Add Payment
                                  </button>
                                )}
                              </Box>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      </div>
                    )}

                    {activeTab === "edit" && canEditOrderCore && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900">Edit Order Details</h3>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-6">
                          {/* Current Order Information */}
                          {selectedOrder?.details?.bookingSlot && (
                            <div className="mb-4 p-3 bg-brand-50 rounded-lg border border-brand-200">
                              <h4 className="text-sm font-medium text-brand-900 mb-2">
                                Current Order Information
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-brand-700">Current Delivery Period:</span>{" "}
                                  {selectedOrder.details.bookingSlot.startDay} -{" "}
                                  {selectedOrder.details.bookingSlot.endDay}
                                </div>
                                <div>
                                  <span className="text-brand-700">Current Delivery Date:</span>{" "}
                                  {selectedOrder.deliveryDate || "Not set"}
                                </div>
                                <div>
                                  <span className="text-brand-700">Current Quantity:</span>{" "}
                                  {selectedOrderCounts.base?.toLocaleString()}
                                  {selectedOrderCounts.additional > 0 && (
                                    <span className="ml-2 text-sm text-brand-600">
                                      (+{selectedOrderCounts.additional?.toLocaleString()} extra, total{" "}
                                      {selectedOrderCounts.total?.toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <label className="text-sm text-gray-500 font-medium">Rate (₹)</label>
                              <input
                                type="number"
                                value={
                                  updatedObject?.rate !== undefined
                                    ? updatedObject.rate
                                    : selectedOrder?.rate
                                }
                                onChange={(e) => handleInputChange(0, "rate", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-gray-500 font-medium">Quantity Delta</label>
                              {!canEditOrderPlantQuantity(selectedOrder?.orderStatus) ? (
                                <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                  Plant quantity is locked after <strong>Ready for dispatch</strong> or for completed/cancelled orders.
                                </div>
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    value={quantityDeltaInput}
                                    onChange={(e) => setQuantityDeltaInput(e.target.value)}
                                    placeholder="+500 or -300"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                                  />
                                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                                      <div>
                                        <div className="text-gray-500">Base</div>
                                        <div className="font-semibold text-gray-900">
                                          {editBaseQuantity.toLocaleString("en-IN")}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-gray-500">Delta</div>
                                        <div className={`font-semibold ${quantityDeltaParsed.valid ? "text-brand-700" : "text-red-600"}`}>
                                          {quantityDeltaParsed.valid
                                            ? quantityDeltaParsed.display
                                            : "Invalid"}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-gray-500">Final</div>
                                        <div className="font-semibold text-gray-900">
                                          {Number.isFinite(editFinalQuantity)
                                            ? editFinalQuantity.toLocaleString("en-IN")
                                            : "-"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  {quantityDeltaInput && !quantityDeltaParsed.valid && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {quantityDeltaParsed.error}
                                    </div>
                                  )}
                                  {quantityDeltaParsed.valid && quantityDeltaParsed.delta > 0 && (
                                    <div className="text-xs text-amber-600 mt-1">
                                      ⚠️ Increasing quantity may affect slot capacity
                                    </div>
                                  )}
                                  {quantityDeltaParsed.valid && quantityDeltaParsed.delta < 0 && (
                                    <div className="text-xs text-green-600 mt-1">
                                      ✅ Reducing quantity will free up slot capacity
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div>
                              <label className="text-sm text-gray-500 font-medium">
                                Delivery Date *
                              </label>
                              {slotsLoading ? (
                                <div className="w-full px-3 py-2 border rounded-lg mt-1 bg-gray-50 text-gray-500 text-sm">
                                  Loading available slots...
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (slots.length > 0) {
                                      setShowDeliveryDateModal(true)
                                    } else {
                                      Toast.info('No available slots found. Please select a different plant/subtype.')
                                    }
                                  }}
                                  className="w-full px-3 py-2 border rounded-lg mt-1 text-left hover:border-brand-500 focus:ring-2 focus:ring-brand-500 transition-colors bg-white"
                                  disabled={slots.length === 0}>
                                  <span className={updatedObject?.deliveryDate ? "text-gray-900" : "text-gray-400"}>
                                    {updatedObject?.deliveryDate 
                                      ? moment(updatedObject.deliveryDate).format(ORDER_DATE_DISPLAY)
                                      : "Click to select delivery date"}
                                  </span>
                                </button>
                              )}
                              {slots.length === 0 && !slotsLoading && (
                                <div className="text-xs text-red-500 mt-1">
                                  No available slots found for this plant/subtype combination
                                </div>
                              )}
                              {!slotsLoading && slots.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Click to select a delivery date from available slots
                                </div>
                              )}

                              {/* Show selected date slot information */}
                              {updatedObject?.deliveryDate &&
                                (() => {
                                  const slotDetails = getSlotDetailsForDate(updatedObject.deliveryDate)
                                  if (slotDetails) {
                                    const requestedQuantity = quantityDeltaParsed.valid
                                      ? Number(editFinalQuantity || 0)
                                      : Number(selectedOrder?.quantity || 0)
                                    const currentQuantity = Number(selectedOrder?.quantity || 0)
                                    const quantityChange = requestedQuantity - currentQuantity
                                    const adjustedAvailable =
                                      slotDetails.available + currentQuantity

                                    return (
                                      <div className="mt-2 p-3 bg-brand-50 rounded-lg border border-brand-200">
                                        <div className="text-xs text-gray-700 space-y-2">
                                          <div className="font-medium text-brand-900">
                                            📅 Delivery Period: {slotDetails.startDay} - {slotDetails.endDay}
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <span className="text-gray-600">Available Capacity:</span>
                                              <div className="font-semibold text-green-700">
                                                {adjustedAvailable}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-600">Requested Quantity:</span>
                                              <div className="font-semibold text-gray-900">
                                                {requestedQuantity}
                                              </div>
                                            </div>
                                          </div>
                                          {quantityChange !== 0 && (
                                            <div className={quantityChange > 0 ? "text-amber-700" : "text-green-700"}>
                                              {quantityChange > 0 ? "⚠️" : "✅"} Quantity change: {quantityChange > 0 ? "+" : ""}{quantityChange}
                                            </div>
                                          )}
                                          {requestedQuantity > adjustedAvailable && (
                                            <div className="text-red-700 font-medium bg-red-50 p-2 rounded">
                                              ❌ Insufficient capacity! Only {adjustedAvailable} available.
                                            </div>
                                          )}
                                          {requestedQuantity <= adjustedAvailable && requestedQuantity > 0 && (
                                            <div className="text-green-700 font-medium">
                                              ✅ Sufficient capacity available
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  } else {
                                    return (
                                      <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                                        <div className="text-xs text-red-600">
                                          ⚠️ Selected date does not fall within any available slot
                                        </div>
                                      </div>
                                    )
                                  }
                                })()}
                            </div>
                          </div>

                          {canReassignSalesPerson && (
                            <div className="mt-4 max-w-md">
                              <label className="text-sm text-gray-500 font-medium">
                                Sales person / dealer (booked by)
                              </label>
                              <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1 bg-white"
                                value={updatedObject?.salesPerson ?? ""}
                                onChange={(e) =>
                                  handleInputChange(0, "salesPerson", e.target.value)
                                }>
                                {(salesPeople || []).map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="flex items-center justify-end space-x-2 mt-6">
                            <button
                              onClick={() => {
                                setUpdatedObject(null)
                                setQuantityDeltaInput("")
                                setSelectedRow(null)
                              }}
                              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                const parsedDelta = parseDeltaInput(quantityDeltaInput)
                                if (!parsedDelta.valid) {
                                  Toast.error(parsedDelta.error || "Invalid quantity delta")
                                  return
                                }
                                if (
                                  !canEditOrderPlantQuantity(selectedOrder?.orderStatus) &&
                                  Number(parsedDelta.delta || 0) !== 0
                                ) {
                                  Toast.error(
                                    "Plant quantity cannot be changed after Ready for dispatch or for completed/cancelled orders."
                                  )
                                  return
                                }

                                const finalQuantity = Number(editBaseQuantity) + Number(parsedDelta.delta || 0)
                                const isDealerBulkEdit = Boolean(selectedOrder?.details?.dealerOrder)
                                if (!Number.isFinite(finalQuantity) || finalQuantity < 0) {
                                  Toast.error("Invalid quantity")
                                  return
                                }
                                if (finalQuantity <= 0 && !isDealerBulkEdit) {
                                  Toast.error("Final quantity must be greater than 0")
                                  return
                                }

                                const currentRate = Number(selectedOrder?.rate || 0)
                                const nextRate = Number(
                                  updatedObject?.rate !== undefined
                                    ? updatedObject.rate
                                    : selectedOrder?.rate
                                )
                                if (!Number.isFinite(nextRate) || nextRate < 0) {
                                  Toast.error("Rate cannot be negative")
                                  return
                                }
                                if (!isDealerBulkEdit && nextRate <= 0) {
                                  Toast.error("Rate must be greater than 0")
                                  return
                                }

                                const payloadForSave = {
                                  id: selectedOrder?.details?.orderid,
                                  ...updatedObject,
                                  rate: nextRate,
                                  quantity: finalQuantity
                                }
                                if (!canReassignSalesPerson) {
                                  delete payloadForSave.salesPerson
                                }

                                // Show confirmation dialog with changes summary
                                const changes = []
                                if (nextRate !== currentRate) {
                                  changes.push(
                                    `Rate: ₹${currentRate} → ₹${nextRate}`
                                  )
                                }

                                if (finalQuantity !== editBaseQuantity) {
                                  const deltaSign = parsedDelta.delta > 0 ? "+" : ""
                                  changes.push(
                                    `Quantity: ${editBaseQuantity.toLocaleString("en-IN")} ${deltaSign}${parsedDelta.delta.toLocaleString("en-IN")} = ${finalQuantity.toLocaleString("en-IN")}`
                                  )
                                }

                                const oldTotal = Number(currentRate || 0) * Number(editBaseQuantity || 0)
                                const newTotal = Number(nextRate || 0) * Number(finalQuantity || 0)
                                const totalDelta = newTotal - oldTotal
                                if (finalQuantity !== editBaseQuantity || nextRate !== currentRate) {
                                  changes.push(
                                    `Total: ₹${oldTotal.toLocaleString("en-IN")} → ₹${newTotal.toLocaleString("en-IN")} (Delta: ${totalDelta > 0 ? "+" : ""}₹${totalDelta.toLocaleString("en-IN")})`
                                  )
                                }

                                // Check if delivery date has changed
                                if (updatedObject.deliveryDate) {
                                  const currentDate = selectedOrder?.details?.deliveryDate 
                                    ? moment(selectedOrder.details.deliveryDate).format(ORDER_DATE_DISPLAY)
                                    : "Not set"
                                  const newDate = moment(updatedObject.deliveryDate).format(ORDER_DATE_DISPLAY)
                                  
                                  if (currentDate !== newDate) {
                                    const slotDetails = getSlotDetailsForDate(updatedObject.deliveryDate)
                                    const deliveryPeriod = slotDetails 
                                      ? `${slotDetails.startDay} - ${slotDetails.endDay}`
                                      : "Unknown"
                                    changes.push(
                                      `Delivery Date: ${currentDate} → ${newDate} (Period: ${deliveryPeriod})`
                                    )
                                  }
                                }

                                const curSpId = selectedOrder?.details?.salesPerson?._id
                                const nextSpId = updatedObject?.salesPerson
                                if (
                                  canReassignSalesPerson &&
                                  nextSpId &&
                                  String(nextSpId) !== String(curSpId || "")
                                ) {
                                  const curName =
                                    selectedOrder?.details?.salesPerson?.name || "—"
                                  const nextOpt = (salesPeople || []).find(
                                    (s) => String(s.value) === String(nextSpId)
                                  )
                                  const nextName = nextOpt?.label || "—"
                                  changes.push(`Sales person: ${curName} → ${nextName}`)
                                }

                                if (changes.length === 0) {
                                  Toast.info("No changes to save")
                                  return
                                }

                                setConfirmDialog({
                                  open: true,
                                  title: "Confirm Order Changes",
                                  description: `Are you sure you want to update this order?\n\nChanges:\n${changes.join(
                                    "\n"
                                  )}`,
                                  onConfirm: () => {
                                    setConfirmDialog((d) => ({ ...d, open: false }))
                                    
                                    // pacthOrders will handle deliveryDate conversion
                                    pacthOrders(payloadForSave, selectedOrder).then(() => {
                                      // Refresh modal data after successful edit
                                      refreshModalData()
                                    })
                                  }
                                })
                              }}
                              disabled={!updatedObject || Object.keys(updatedObject).length === 0}
                              className="px-4 py-2 text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed">
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "remarks" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Order Remarks</h3>

                        {selectedOrder?.details?.orderRemarks &&
                          selectedOrder?.details?.orderRemarks.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-3">Existing Remarks</h4>
                              <div className="space-y-2">
                                {(selectedOrder.details.orderRemarks || []).map(
                                  (remark, remarkIndex) => (
                                    <div key={remarkIndex} className="bg-white p-3 rounded border">
                                      <div className="text-sm text-gray-700">{remark}</div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        <div className="bg-white rounded-lg border p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Add New Remark</h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Enter a new remark..."
                              value={newRemark}
                              onChange={(e) => setNewRemark(e.target.value)}
                              className="flex-grow px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                            />
                            <button
                              onClick={() => handleAddRemark(selectedOrder.details.orderid)}
                              disabled={!newRemark.trim()}
                              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed">
                              Add Remark
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "dispatchTrail" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <span className="mr-2">🚚</span>
                          Dispatch Trail
                        </h3>

                        {selectedOrder?.details?.dispatchHistory &&
                        selectedOrder?.details?.dispatchHistory.length > 0 ? (
                          <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="text-sm text-gray-500 mb-1">Total Order Plants</div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {selectedOrderCounts.total?.toLocaleString()}
                                </div>
                              </div>
                              <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                                <div className="text-sm text-brand-600 mb-1">Total Dispatched</div>
                                <div className="text-2xl font-bold text-brand-900">
                                  {selectedOrderDispatchStats.dispatchedPlants?.toLocaleString()}
                                </div>
                                <div className="text-xs text-brand-600 mt-1">
                                  in {selectedOrder.details.dispatchHistory.length} dispatch{selectedOrder.details.dispatchHistory.length > 1 ? 'es' : ''}
                                </div>
                              </div>
                              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                <div className="text-sm text-orange-600 mb-1">Remaining to Dispatch</div>
                                <div className="text-2xl font-bold text-orange-900">
                                  {selectedOrderDispatchStats.remainingToDispatch?.toLocaleString()}
                                </div>
                                <div className="text-xs text-orange-600 mt-1">
                                  {selectedOrderDispatchStats.remainingToDispatch > 0 ? "Pending dispatch" : "Fully dispatched"}
                                </div>
                              </div>
                            </div>

                            {/* Dispatch Timeline */}
                            <div className="bg-white rounded-lg border">
                              <div className="p-3 border-b bg-brand-50">
                                <h4 className="font-medium text-brand-900 text-sm">Dispatch Timeline</h4>
                              </div>
                              <div className="p-4 space-y-4">
                                {(selectedOrder.details.dispatchHistory || []).map(
                                  (dispatchItem, dispatchIndex) => (
                                    <div 
                                      key={dispatchIndex} 
                                      className="relative pl-8 pb-6 border-l-2 border-brand-300 last:border-l-0 last:pb-0">
                                      {/* Timeline dot */}
                                      <div className="absolute left-0 top-0 -ml-2 w-4 h-4 bg-brand-600 rounded-full border-2 border-white"></div>
                                      
                                      <div className="bg-brand-50 p-4 rounded-lg border border-brand-200">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-brand-900">
                                              Dispatch #{dispatchIndex + 1}
                                            </span>
                                            <span className="px-2 py-1 bg-brand-200 text-brand-800 rounded text-xs font-medium">
                                              {dispatchItem.quantity?.toLocaleString()} plants
                                            </span>
                                          </div>
                                          <span className="text-xs text-gray-600">
                                            {dispatchItem.date
                                              ? moment(dispatchItem.date).format(ORDER_DATETIME_DISPLAY)
                                              : "N/A"}
                                          </span>
                                        </div>

                                        {/* Dispatch Details */}
                                        {dispatchItem.dispatch && (
                                          <div className="bg-white p-3 rounded border border-brand-100 mb-3">
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                              <div>
                                                <span className="text-gray-500">Transport ID:</span>
                                                <div className="font-medium text-gray-900">
                                                  #{dispatchItem.dispatch.transportId}
                                                </div>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Driver:</span>
                                                <div className="font-medium text-gray-900">
                                                  {dispatchItem.dispatch.driverName}
                                                </div>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Vehicle:</span>
                                                <div className="font-medium text-gray-900">
                                                  {dispatchItem.dispatch.vehicleName}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Quantity Details */}
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                          <div className="bg-white p-2 rounded border border-gray-200">
                                            <span className="text-gray-500">Dispatched Quantity:</span>
                                            <div className="font-bold text-brand-600">
                                              {dispatchItem.quantity?.toLocaleString()} plants
                                            </div>
                                          </div>
                                          <div className="bg-white p-2 rounded border border-gray-200">
                                            <span className="text-gray-500">Remaining After:</span>
                                            <div className="font-bold text-orange-600">
                                              {dispatchItem.remainingAfterDispatch?.toLocaleString()} plants
                                            </div>
                                          </div>
                                        </div>

                                        {/* Processed By */}
                                        {dispatchItem.processedBy && (
                                          <div className="mt-3 pt-3 border-t border-brand-100">
                                            <div className="text-xs text-gray-600">
                                              <span className="font-medium">Processed by:</span>{" "}
                                              {dispatchItem.processedBy.name}
                                              {dispatchItem.processedBy.phoneNumber && 
                                                ` • ${dispatchItem.processedBy.phoneNumber}`}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                            <div className="text-gray-400 text-4xl mb-3">📦</div>
                            <h4 className="text-lg font-medium text-gray-700 mb-2">No Dispatch History</h4>
                            <p className="text-gray-500 text-sm">
                              This order has not been dispatched yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "editHistory" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <span className="mr-2">📝</span>
                          Order Edit History
                        </h3>

                        {selectedOrder?.details?.orderEditHistory &&
                        selectedOrder?.details?.orderEditHistory.length > 0 ? (
                          <>
                            {/* Summary Card */}
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                              <div className="text-sm text-purple-600 mb-1">Total Edits Made</div>
                              <div className="text-2xl font-bold text-purple-900">
                                {selectedOrder.details.orderEditHistory.length}
                              </div>
                              <div className="text-xs text-purple-600 mt-1">
                                Changes to rate, quantity, delivery date, and sales person
                              </div>
                            </div>

                            {/* Edit Timeline */}
                            <div className="bg-white rounded-lg border">
                              <div className="p-3 border-b bg-purple-50">
                                <h4 className="font-medium text-purple-900 text-sm">Edit Timeline</h4>
                              </div>
                              <div className="p-4 space-y-4">
                                {(selectedOrder.details.orderEditHistory || []).map(
                                  (edit, editIndex) => {
                                    // Format the field name for display
                                    const fieldDisplayName = {
                                      rate: "Rate per Plant",
                                      numberOfPlants: "Quantity",
                                      deliveryDate: "Delivery Date",
                                      salesPerson: "Sales person",
                                    }[edit.field] || edit.field;

                                    // Format values based on field type
                                    let previousValueDisplay = edit.previousValue;
                                    let newValueDisplay = edit.newValue;

                                    if (edit.field === "rate") {
                                      previousValueDisplay = `₹${edit.previousValue}`;
                                      newValueDisplay = `₹${edit.newValue}`;
                                    } else if (edit.field === "numberOfPlants") {
                                      previousValueDisplay = `${edit.previousValue} plants`;
                                      newValueDisplay = `${edit.newValue} plants`;
                                    } else if (edit.field === "deliveryDate") {
                                      previousValueDisplay = edit.previousValue 
                                        ? moment(edit.previousValue).format(ORDER_DATE_DISPLAY)
                                        : "Not set";
                                      newValueDisplay = moment(edit.newValue).format(ORDER_DATE_DISPLAY);
                                    }

                                    return (
                                      <div 
                                        key={editIndex} 
                                        className="relative pl-8 pb-6 border-l-2 border-purple-300 last:border-l-0 last:pb-0">
                                        {/* Timeline dot */}
                                        <div className="absolute left-0 top-0 -ml-2 w-4 h-4 bg-purple-600 rounded-full border-2 border-white"></div>
                                        
                                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-semibold text-purple-900">
                                                {fieldDisplayName} Changed
                                              </span>
                                              <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-medium">
                                                Edit #{editIndex + 1}
                                              </span>
                                            </div>
                                            <span className="text-xs text-gray-600">
                                              {edit.createdAt
                                                ? moment(edit.createdAt).format(ORDER_DATETIME_DISPLAY)
                                                : "N/A"}
                                            </span>
                                          </div>

                                          {/* Change Details */}
                                          <div className="bg-white p-3 rounded border border-purple-100 mb-3">
                                            {edit.field === "salesPerson" ? (
                                              <div className="text-sm text-gray-800">
                                                {edit.notes ||
                                                  "Sales person updated (see order details for current assignee)."}
                                              </div>
                                            ) : (
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                                <div className="bg-red-50 px-3 py-2 rounded-md">
                                                  <div className="text-xs text-red-600 mb-1">Previous Value</div>
                                                  <span className="text-red-700 line-through text-sm font-medium">
                                                    {previousValueDisplay}
                                                  </span>
                                                </div>
                                                <div className="flex justify-center">
                                                  <span className="text-gray-400 text-xl">→</span>
                                                </div>
                                                <div className="bg-green-50 px-3 py-2 rounded-md">
                                                  <div className="text-xs text-green-600 mb-1">New Value</div>
                                                  <span className="text-green-700 font-bold text-sm">
                                                    {newValueDisplay}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {/* Notes */}
                                          {edit.notes && edit.field !== "salesPerson" && (
                                            <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 mb-3">
                                              <span className="font-medium">Notes:</span> {edit.notes}
                                            </div>
                                          )}

                                          {/* Changed By */}
                                          {edit.changedBy && (
                                            <div className="pt-3 border-t border-purple-100">
                                              <div className="text-xs text-gray-600">
                                                <span className="font-medium">Changed by:</span>{" "}
                                                {edit.changedBy.name || "Unknown User"}
                                                {edit.changedBy.phoneNumber && 
                                                  ` • ${edit.changedBy.phoneNumber}`}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                            <div className="text-gray-400 text-4xl mb-3">📝</div>
                            <h4 className="text-lg font-medium text-gray-700 mb-2">No Edit History</h4>
                            <p className="text-gray-500 text-sm">
                              This order has not been edited yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <Dialog
        open={recentQtyEditsOpen}
        onClose={() => setRecentQtyEditsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Recent quantity edits</DialogTitle>
        <DialogContent dividers>
          {recentPlantQuantityEdits.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No plant quantity edits found on the orders currently loaded. Load more orders or open a single order to see full edit history.
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 420, overflow: "auto" }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-[10px] uppercase text-gray-500">
                    <th className="py-2 pr-2 font-semibold">When</th>
                    <th className="py-2 pr-2 font-semibold">Order</th>
                    <th className="py-2 pr-2 font-semibold">Farmer</th>
                    <th className="py-2 pr-2 font-semibold">Change</th>
                    <th className="py-2 font-semibold">By</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPlantQuantityEdits.map((r) => (
                    <tr key={r.key} className="border-b border-gray-100 align-top">
                      <td className="py-1.5 pr-2 whitespace-nowrap text-gray-700">
                        {r.when ? moment(r.when).format(ORDER_DATETIME_DISPLAY) : "—"}
                      </td>
                      <td className="py-1.5 pr-2 font-semibold text-gray-900">#{r.orderRef}</td>
                      <td className="py-1.5 pr-2 text-gray-800 max-w-[140px] break-words">
                        {r.farmer}
                      </td>
                      <td className="py-1.5 pr-2 text-gray-800">
                        {Number(r.prev ?? 0).toLocaleString("en-IN")} →{" "}
                        {Number(r.next ?? 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-1.5 text-gray-600">{r.byName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            onClick={() => setRecentQtyEditsOpen(false)}
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
      />
      <Dialog
        open={statusRemarkDialog.open}
        onClose={() =>
          setStatusRemarkDialog((prev) => ({
            ...prev,
            open: false
          }))
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{statusRemarkDialog.title || "Enter remark"}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 0.5, mb: 1.5, color: "text.secondary", fontSize: "0.9rem" }}>
            {statusRemarkDialog.description || "Please enter a remark to continue."}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Remark"
            value={statusRemarkDialog.remark}
            onChange={(e) =>
              setStatusRemarkDialog((prev) => ({
                ...prev,
                remark: e.target.value
              }))
            }
            placeholder="Type remark here..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() =>
              setStatusRemarkDialog((prev) => ({
                ...prev,
                open: false
              }))
            }
            sx={{ textTransform: "none" }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              const remarkText = (statusRemarkDialog.remark || "").trim()
              if (!remarkText) {
                Toast.error("Please enter a remark")
                return
              }
              const submitAction = statusRemarkDialog.onSubmit
              setStatusRemarkDialog((prev) => ({
                ...prev,
                open: false
              }))
              if (typeof submitAction === "function") {
                await submitAction(remarkText)
              }
            }}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {statusRemarkDialog.confirmLabel || "Apply"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={clubDialogOpen}
        onClose={() => {
          setClubDialogOpen(false)
          setClubSuggestedGroups([])
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Club Ready Orders</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, mt: 0.5 }}>
            <TextField
              label="Vehicle Capacity Max"
              type="number"
              size="small"
              value={clubCapacityMax}
              onChange={(e) => setClubCapacityMax(e.target.value)}
            />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <TextField
                label="Capacity Type"
                size="small"
                value={clubCapacityType}
                onChange={(e) => setClubCapacityType(e.target.value)}
              />
              <TextField
                label="Unit"
                size="small"
                value={clubCapacityUnit}
                onChange={(e) => setClubCapacityUnit(e.target.value)}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleSuggestClubGroups}
                disabled={clubLoading}
                sx={{ textTransform: "none" }}
              >
                {clubLoading ? "Suggesting..." : "Suggest Groups"}
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveClubGroups}
                disabled={clubLoading || !clubSuggestedGroups.length}
                sx={{ textTransform: "none" }}
              >
                Save Groups
              </Button>
            </Box>
            {clubSuggestedGroups.length > 0 && (
              <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 1.5, p: 1 }}>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.6 }}>
                  Suggested Groups ({clubSuggestedGroups.length})
                </Typography>
                {clubSuggestedGroups.map((g) => (
                  <Typography key={g.tempId} sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                    {g.tempId}: {g.orderIds?.length || 0} orders • {Number(g.totalPlants || 0).toLocaleString()} plants
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            onClick={() => {
              setClubDialogOpen(false)
              setClubSuggestedGroups([])
            }}
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={readyDispatchDialog.open}
        onClose={() =>
          setReadyDispatchDialog({
            open: false,
            row: null,
            newStatus: "READY_FOR_DISPATCH",
            dispatchDayKey: ""
          })
        }
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Select Dispatch Day</DialogTitle>
        <DialogContent>
          <FormControl sx={{ mt: 1 }}>
            <FormLabel>Choose one (mandatory)</FormLabel>
            <RadioGroup
              value={readyDispatchDialog.dispatchDayKey}
              onChange={(e) =>
                setReadyDispatchDialog((prev) => ({
                  ...prev,
                  dispatchDayKey: e.target.value
                }))
              }
            >
              <FormControlLabel value="TODAY" control={<Radio />} label="Aaj" />
              <FormControlLabel value="TOMORROW" control={<Radio />} label="Udya" />
              <FormControlLabel value="DAY_AFTER" control={<Radio />} label="Parva" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            onClick={() =>
              setReadyDispatchDialog({
                open: false,
                row: null,
                newStatus: "READY_FOR_DISPATCH",
                dispatchDayKey: ""
              })
            }
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReadyDispatchStatus}
            variant="contained"
            color="success"
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* WATI WhatsApp — accept (order_accpeted_revamped) or dispatch (delivery_final_revamp) */}
      {watiDialogOpen && watiDialogOrder && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
            <div
              className={
                watiDialogMode === "dispatch"
                  ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white p-4"
                  : "bg-gradient-to-r from-green-600 to-green-500 text-white p-4"
              }>
              <div className="flex items-center gap-2">
                <FaWhatsapp className="text-2xl" />
                <h2 className="text-xl font-bold">WhatsApp संदेश पाठवायचा का?</h2>
              </div>
              <p className="text-white/90 text-sm mt-1">
                {watiDialogMode === "dispatch"
                  ? `Order #${watiDialogOrder.order} — डिस्पॅच / रवानगी`
                  : `Order #${watiDialogOrder.order} — स्वीकृत`}
              </p>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <p className="text-xs text-gray-500 mb-2">Message Preview:</p>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-sans border border-gray-200">
                {buildDashboardFarmerOrdersWatiPreviewText(watiDialogOrder, watiDialogMode)}
              </pre>
            </div>
            <div className="p-4 flex gap-3 justify-end flex-wrap border-t bg-gray-50">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      buildDashboardFarmerOrdersWatiPreviewText(watiDialogOrder, watiDialogMode)
                    )
                    Toast.success("संदेश कॉपी झाला")
                  } catch {
                    Toast.error("कॉपी करता आले नाही")
                  }
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium inline-flex items-center gap-2">
                <FaCopy /> कॉपी
              </button>
              <button
                type="button"
                onClick={() => {
                  const body = buildDashboardFarmerOrdersWatiPreviewText(watiDialogOrder, watiDialogMode)
                  const text = encodeURIComponent(body)
                  const rawFarmer = watiDialogOrder.details?.farmer
                  const f = Array.isArray(rawFarmer) ? rawFarmer[0] : rawFarmer
                  const toDealer = Boolean(watiDialogOrder.details?.dealerOrder)
                  const raw = String(
                    toDealer
                      ? watiDialogOrder.details?.salesPerson?.phoneNumber || ""
                      : f?.mobileNumber || watiDialogOrder.details?.contact || ""
                  ).replace(/\D/g, "")
                  const ten = raw.slice(-10)
                  const url =
                    ten.length === 10 ? `https://wa.me/91${ten}?text=${text}` : `https://wa.me/?text=${text}`
                  window.open(url, "_blank")
                }}
                className="px-4 py-2 rounded-lg border border-green-500 bg-white text-green-800 hover:bg-green-50 font-medium inline-flex items-center gap-2">
                <FaWhatsapp /> WhatsApp वर शेअर
              </button>
              <button
                type="button"
                onClick={() => {
                  setWatiDialogOpen(false)
                  setWatiDialogOrder(null)
                  setWatiDialogMode("accept")
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium">
                नाही
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!whatsappMessagingEnabled) {
                    Toast.error("WhatsApp messaging is turned off (use the WhatsApp msgs switch above)")
                    return
                  }
                  setWatiSending(true)
                  try {
                    const oid = watiDialogOrder?.details?.orderid || watiDialogOrder?.details?._id
                    const api =
                      watiDialogMode === "dispatch"
                        ? API.ORDER.SEND_DISPATCH_WHATSAPP
                        : API.ORDER.SEND_ACCEPTED_WHATSAPP
                    const instance = NetworkManager(api)
                    const res = await instance.request({}, [oid])
                    const body = res?.data
                    if (body?.status === "Success") {
                      const d = body?.data
                      if (d?.alreadySent) {
                        Toast.success("संदेश आधीच पाठवला आहे")
                        setOrders((prev) =>
                          (prev || []).map((o) =>
                            String(o?.details?.orderid) === String(oid)
                              ? {
                                  ...o,
                                  details: {
                                    ...o.details,
                                    ...(d.whatsappAcceptedSentAt != null && {
                                      whatsappAcceptedSentAt: d.whatsappAcceptedSentAt,
                                      whatsappAcceptedMessageKey:
                                        d.whatsappAcceptedMessageKey ?? o.details.whatsappAcceptedMessageKey,
                                    }),
                                    ...(d.whatsappDispatchSentAt != null && {
                                      whatsappDispatchSentAt: d.whatsappDispatchSentAt,
                                      whatsappDispatchMessageKey:
                                        d.whatsappDispatchMessageKey ?? o.details.whatsappDispatchMessageKey,
                                    }),
                                  },
                                }
                              : o
                          )
                        )
                      } else {
                        Toast.success("WhatsApp message sent successfully")
                        const stored = d?.stored
                        const ts =
                          watiDialogMode === "dispatch"
                            ? stored?.whatsappDispatchSentAt || new Date().toISOString()
                            : stored?.whatsappAcceptedSentAt || new Date().toISOString()
                        const msgKey =
                          watiDialogMode === "dispatch"
                            ? stored?.whatsappDispatchMessageKey ?? d?.local_message_id ?? null
                            : stored?.whatsappAcceptedMessageKey ?? d?.local_message_id ?? null
                        setOrders((prev) =>
                          (prev || []).map((o) =>
                            String(o?.details?.orderid) === String(oid)
                              ? {
                                  ...o,
                                  details: {
                                    ...o.details,
                                    ...(watiDialogMode === "dispatch"
                                      ? {
                                          whatsappDispatchSentAt: ts,
                                          ...(msgKey ? { whatsappDispatchMessageKey: String(msgKey) } : {}),
                                        }
                                      : {
                                          whatsappAcceptedSentAt: ts,
                                          ...(msgKey ? { whatsappAcceptedMessageKey: String(msgKey) } : {}),
                                        }),
                                  },
                                }
                              : o
                          )
                        )
                      }
                    } else {
                      Toast.error(body?.message || "Failed to send message")
                    }
                  } catch (err) {
                    Toast.error(err?.response?.data?.message || "Failed to send WhatsApp message")
                  } finally {
                    setWatiSending(false)
                    setWatiDialogOpen(false)
                    setWatiDialogOrder(null)
                    setWatiDialogMode("accept")
                  }
                }}
                disabled={watiSending}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium disabled:opacity-50">
                {watiSending ? "पाठवत आहे..." : "होय पाठवा"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delivery Date Picker Modal */}
      {showDeliveryDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📅</span>
                <h2 className="text-xl font-bold">Select Delivery Date</h2>
              </div>
              <button
                onClick={() => setShowDeliveryDateModal(false)}
                className="text-white hover:text-brand-100 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20">
                <XIcon size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6">
              {slots.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Available Slots</h3>
                  <p className="text-gray-500">Please select a different plant/subtype combination</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {slots.map((slot) => {
                    if (!slot.startDay || !slot.endDay) return null

                    const slotStart = moment(slot.startDay, "DD-MM-YYYY")
                    const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
                    const dates = []
                    let currentDate = slotStart.clone()
                    const today = moment().startOf('day')

                    // Generate all dates in the slot
                    while (currentDate.isSameOrBefore(slotEnd, 'day')) {
                      if (currentDate.isSameOrAfter(today, 'day')) {
                        dates.push(currentDate.clone())
                      }
                      currentDate.add(1, 'day')
                    }

                    if (dates.length === 0) return null

                    return (
                      <div key={slot.value} className="border-b border-gray-200 pb-6 last:border-b-0">
                        {/* Slot Header */}
                        <div className="flex items-center mb-4 pb-3 border-b-2 border-brand-100">
                          <div className="w-2 h-2 rounded-full bg-brand-600 mr-3"></div>
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-brand-600">
                              {slot.label}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Available: {slot.available} plants
                            </p>
                          </div>
                        </div>

                        {/* Dates Grid */}
                        <div className="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-3">
                          {dates.map((date) => {
                            const isSelected = updatedObject?.deliveryDate && 
                              moment(updatedObject.deliveryDate).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
                            const isToday = date.isSame(today, 'day')

                            return (
                              <button
                                key={date.format('YYYY-MM-DD')}
                                type="button"
                                onClick={() => {
                                  setUpdatedObject({
                                    ...updatedObject,
                                    deliveryDate: date.toDate(),
                                    bookingSlot: slot.value
                                  })
                                  setShowDeliveryDateModal(false)
                                  Toast.success(`Delivery date set to ${date.format(ORDER_DATE_DISPLAY)}`)
                                }}
                                className={`
                                  relative p-3 rounded-2xl border-2 transition-all duration-200
                                  ${isSelected 
                                    ? 'bg-brand-600 border-brand-600 text-white shadow-lg scale-105' 
                                    : isToday
                                      ? 'border-amber-400 bg-amber-50 text-gray-900 hover:bg-amber-100'
                                      : 'border-gray-200 bg-white text-gray-900 hover:border-brand-400 hover:bg-brand-50'
                                  }
                                `}>
                                <div className="flex flex-col items-center">
                                  <span className={`text-xs font-semibold uppercase ${isSelected ? 'text-brand-100' : 'text-gray-500'}`}>
                                    {date.format('ddd')}
                                  </span>
                                  <span className={`text-xl font-bold my-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                    {date.format('DD')}
                                  </span>
                                  <span className={`text-xs font-semibold uppercase ${isSelected ? 'text-brand-100' : 'text-gray-600'}`}>
                                    {date.format('MMM')}
                                  </span>
                                </div>
                                {isToday && !isSelected && (
                                  <div className="absolute top-1 right-1 bg-amber-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                    TODAY
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute top-1 right-1 bg-white text-brand-600 rounded-full w-5 h-5 flex items-center justify-center">
                                    <CheckIcon size={12} />
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {/* Helper Text */}
                  <div className="bg-brand-50 border-l-4 border-brand-600 p-4 rounded-r-lg">
                    <p className="text-sm text-brand-800">
                      💡 <span className="font-semibold">Tip:</span> Click on any date to select it as the delivery date. Only dates within available slots are shown.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BulkPaymentEntryDialog
        open={showBulkPaymentDialog}
        onClose={() => setShowBulkPaymentDialog(false)}
        mode={showAgriSalesOrders ? "agri" : "plant"}
        onSuccess={() => {
          getOrders()
          if (showAgriSalesOrders) fetchAgriStatusCounts()
        }}
      />

      {/* Add Agri Sales Order Dialog */}
      <AddAgriSalesOrderForm
        open={showAddAgriSalesOrderForm}
        linkedNurseryOrder={linkedAgriSourceOrder}
        onClose={() => {
          setShowAddAgriSalesOrderForm(false)
          setLinkedAgriSourceOrder(null)
        }}
        onSuccess={() => {
          setShowAddAgriSalesOrderForm(false)
          setLinkedAgriSourceOrder(null)
          getOrders() // Refresh orders after creating
        }}
      />

      {/* Agri Sales Dispatch Modal */}
      {showAgriDispatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">
                  {agriDispatchForm.dispatchMode === "COURIER"
                    ? "📦"
                    : agriDispatchForm.dispatchMode === "WITH_ORDER"
                    ? "🔗"
                    : "🚚"}
                </span>
                <div>
                  <h2 className="text-lg font-bold">Dispatch Orders</h2>
                  <p className="text-sm text-brand-100">{selectedAgriSalesOrders.length} order(s) selected</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAgriDispatchModal(false)
                  setAgriDispatchPrefillMeta(null)
                  setAgriDispatchForm({
                    dispatchMode: "VEHICLE",
                    vehicleId: "",
                    vehicleNumber: "",
                    driverName: "",
                    driverMobile: "",
                    courierName: "",
                    courierTrackingId: "",
                    courierContact: "",
                    dispatchNotes: "",
                  })
                }}
                className="text-white hover:text-brand-100 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20">
                <XIcon size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-160px)] p-6">
              {/* Selected Orders Summary */}
              <div className="mb-4 p-3 bg-brand-50 rounded-lg border border-brand-200">
                <h4 className="text-sm font-semibold text-brand-800 mb-2">Selected Orders</h4>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {orders
                    .filter((o) => selectedAgriSalesOrders.includes(o.details?.orderid))
                    .map((order) => (
                      <div key={order.details?.orderid} className="text-xs text-brand-700 flex justify-between">
                        <span className="font-medium">{order.order}</span>
                        <span>
                          {order.farmerName || order.details?.customerName}
                          {(order.details?.customerTaluka || order.details?.customerVillage) && (
                            <> • {order.details?.customerTaluka && order.details?.customerVillage
                              ? `${order.details.customerTaluka} → ${order.details.customerVillage}`
                              : order.details?.customerTaluka || order.details?.customerVillage}
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {agriDispatchPrefillLoading && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium">
                    Fetching linked regular dispatch details for prefill...
                  </p>
                </div>
              )}

              {!agriDispatchPrefillLoading && agriDispatchPrefillMeta && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-800 font-semibold">
                    Auto-prefilled from linked regular dispatch
                    {agriDispatchPrefillMeta?.linkedOrderCode
                      ? ` #${agriDispatchPrefillMeta.linkedOrderCode}`
                      : ""}.
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Vehicle: {agriDispatchPrefillMeta.vehicleNumber || "-"} | Driver:{" "}
                    {agriDispatchPrefillMeta.driverName || "-"} | Mobile:{" "}
                    {agriDispatchPrefillMeta.driverMobile || "Fill manually"}
                    {agriDispatchPrefillMeta.transportId ? ` | Dispatch #${agriDispatchPrefillMeta.transportId}` : ""}
                  </p>
                  {agriDispatchPrefillMeta.hasVehicleConflict && (
                    <p className="text-xs text-amber-700 mt-1">
                      Multiple linked vehicles found. Latest dispatch details are prefilled.
                    </p>
                  )}
                </div>
              )}

              {/* Dispatch Mode Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dispatch Mode *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleAgriDispatchModeChange("VEHICLE")}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      agriDispatchForm.dispatchMode === "VEHICLE"
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                    }`}>
                    <span className="text-xl">🚚</span>
                    <span className="font-medium">By Vehicle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAgriDispatchModeChange("COURIER")}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      agriDispatchForm.dispatchMode === "COURIER"
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                    }`}>
                    <span className="text-xl">📦</span>
                    <span className="font-medium">By Courier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAgriDispatchModeChange("WITH_ORDER")}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      agriDispatchForm.dispatchMode === "WITH_ORDER"
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                    }`}>
                    <span className="text-xl">🔗</span>
                    <span className="font-medium">With Order</span>
                  </button>
                </div>
              </div>

              {/* Vehicle Mode Fields */}
              {(agriDispatchForm.dispatchMode === "VEHICLE" ||
                agriDispatchForm.dispatchMode === "WITH_ORDER") && (
                <>
                  {/* Vehicle Selection */}
                  {agriDispatchForm.dispatchMode === "VEHICLE" && (
                    <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Vehicle</label>
                    <select
                      value={agriDispatchForm.vehicleId}
                      onChange={(e) => handleAgriVehicleSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500">
                      <option value="">-- Select or enter manually --</option>
                      {Array.isArray(agriVehicles) && agriVehicles.map((vehicle) => (
                        <option key={vehicle._id || vehicle.id} value={vehicle._id || vehicle.id}>
                          {vehicle.number} - {vehicle.name}
                          {vehicle.driverName && ` (${vehicle.driverName})`}
                        </option>
                      ))}
                    </select>
                    </div>
                  )}

                  {agriDispatchForm.dispatchMode === "WITH_ORDER" && !agriDispatchPrefillMeta && (
                    <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-700 font-medium">
                        No linked regular dispatch found yet. Select orders linked to a dispatched regular order.
                      </p>
                    </div>
                  )}

                  {/* Vehicle Number */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number *</label>
                    <input
                      type="text"
                      value={agriDispatchForm.vehicleNumber}
                      onChange={(e) => setAgriDispatchForm((prev) => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                      placeholder="e.g., MH12AB1234"
                      readOnly={agriDispatchForm.dispatchMode === "WITH_ORDER"}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 ${
                        agriDispatchForm.dispatchMode === "WITH_ORDER" ? "bg-gray-100" : ""
                      }`}
                    />
                  </div>

                  {/* Driver Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                    <input
                      type="text"
                      value={agriDispatchForm.driverName}
                      onChange={(e) => setAgriDispatchForm((prev) => ({ ...prev, driverName: e.target.value }))}
                      placeholder="Enter driver name"
                      readOnly={agriDispatchForm.dispatchMode === "WITH_ORDER"}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 ${
                        agriDispatchForm.dispatchMode === "WITH_ORDER" ? "bg-gray-100" : ""
                      }`}
                    />
                  </div>

                  {/* Driver Mobile */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver Mobile *</label>
                    <input
                      type="text"
                      value={agriDispatchForm.driverMobile}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                        setAgriDispatchForm((prev) => ({ ...prev, driverMobile: value }))
                      }}
                      placeholder="10 digit mobile number"
                      maxLength={10}
                      readOnly={agriDispatchForm.dispatchMode === "WITH_ORDER"}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 ${
                        agriDispatchForm.dispatchMode === "WITH_ORDER" ? "bg-gray-100" : ""
                      }`}
                    />
                  </div>
                </>
              )}

              {/* Courier Mode Fields */}
              {agriDispatchForm.dispatchMode === "COURIER" && (
                <>
                  {/* Courier Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Courier Service Name *</label>
                    <input
                      type="text"
                      value={agriDispatchForm.courierName}
                      onChange={(e) => setAgriDispatchForm((prev) => ({ ...prev, courierName: e.target.value }))}
                      placeholder="e.g., DTDC, Blue Dart, Delhivery"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Tracking ID */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tracking ID / AWB Number</label>
                    <input
                      type="text"
                      value={agriDispatchForm.courierTrackingId}
                      onChange={(e) => setAgriDispatchForm((prev) => ({ ...prev, courierTrackingId: e.target.value.toUpperCase() }))}
                      placeholder="Enter tracking ID (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Courier Contact */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Courier Contact Number</label>
                    <input
                      type="text"
                      value={agriDispatchForm.courierContact}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                        setAgriDispatchForm((prev) => ({ ...prev, courierContact: value }))
                      }}
                      placeholder="10 digit contact number (optional)"
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </>
              )}

              {/* Dispatch Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Notes (Optional)</label>
                <textarea
                  value={agriDispatchForm.dispatchNotes}
                  onChange={(e) => setAgriDispatchForm((prev) => ({ ...prev, dispatchNotes: e.target.value }))}
                  placeholder="Any special instructions, delivery notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAgriDispatchModal(false)
                  setAgriDispatchPrefillMeta(null)
                  setAgriDispatchForm({
                    dispatchMode: "VEHICLE",
                    vehicleId: "",
                    vehicleNumber: "",
                    driverName: "",
                    driverMobile: "",
                    courierName: "",
                    courierTrackingId: "",
                    courierContact: "",
                    dispatchNotes: "",
                  })
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAgriDispatch}
                disabled={
                  ((agriDispatchForm.dispatchMode === "VEHICLE" ||
                    agriDispatchForm.dispatchMode === "WITH_ORDER") && (
                    !agriDispatchForm.vehicleNumber ||
                    !agriDispatchForm.driverName ||
                    agriDispatchForm.driverMobile.length !== 10
                  )) ||
                  (agriDispatchForm.dispatchMode === "COURIER" && !agriDispatchForm.courierName) ||
                  agriDispatchLoading
                }
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 ${
                  agriDispatchForm.dispatchMode === "VEHICLE"
                    ? "bg-brand-600 hover:bg-brand-700" 
                    : agriDispatchForm.dispatchMode === "WITH_ORDER"
                    ? "bg-teal-600 hover:bg-teal-700"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}>
                {agriDispatchLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    {agriDispatchForm.dispatchMode === "COURIER"
                      ? "📦"
                      : agriDispatchForm.dispatchMode === "WITH_ORDER"
                      ? "🔗"
                      : "🚚"}{" "}
                    Dispatch {selectedAgriSalesOrders.length} Order(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agri Sales Complete Order Modal */}
      {showAgriCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Complete Orders</h3>
                  <p className="text-green-100 text-sm">{selectedAgriOrdersForComplete.length} order(s) • Mark as Delivered</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAgriCompleteModal(false)
                  setAgriCompleteForm({
                    returnQuantities: {},
                    returnReason: "",
                    returnNotes: "",
                  })
                }}
                className="text-white/80 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Selected Orders with Return Quantity Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-green-700 mb-2">
                  ORDERS TO COMPLETE (Enter return quantity if any)
                </label>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {orders
                    .filter((o) => selectedAgriOrdersForComplete.includes(o.id || o._id || o.details?.orderid))
                    .map((order) => {
                      const orderId = order.id || order._id || order.details?.orderid
                      const orderQty = order.details?.quantity || order.quantity || 0
                      const returnQty = agriCompleteForm.returnQuantities[orderId] || 0
                      // For completed orders, show final quantity
                      const displayQty = (order.orderStatus === "COMPLETED" && order.details?.deliveredQuantity > 0) 
                        ? order.details.deliveredQuantity 
                        : orderQty
                      return (
                        <div
                          key={orderId}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="text-sm font-bold text-gray-900">{order.order || order.orderNumber}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {order.details?.farmer?.name || order.customerName || order.farmerName}
                                {(order.isAgriSalesOrder || order.details?.isRamAgriProduct)
                                  ? (order.details?.customerTaluka && order.details?.customerVillage
                                      ? ` • ${order.details.customerTaluka} → ${order.details.customerVillage}`
                                      : order.details?.customerTaluka || order.details?.customerVillage
                                        ? ` • ${order.details.customerTaluka || order.details.customerVillage}`
                                        : '')
                                  : (order.details?.farmer?.village ? ` • ${order.details.farmer.village}` : '')}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              order.orderStatus === "COMPLETED" && order.details?.deliveredQuantity > 0
                                ? "bg-green-100 text-green-700"
                                : "bg-brand-100 text-brand-700"
                            }`}>
                              {order.orderStatus === "COMPLETED" && order.details?.deliveredQuantity > 0 
                                ? `Final Qty: ${displayQty}${order.details?.returnQuantity > 0 ? ` (Ret: ${order.details.returnQuantity})` : ""}`
                                : `Qty: ${orderQty}`
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 min-w-[80px]">Return Qty:</span>
                            <input
                              type="number"
                              min="0"
                              max={orderQty}
                              value={returnQty}
                              onChange={(e) => {
                                const value = Math.max(0, Math.min(orderQty, parseInt(e.target.value) || 0))
                                setAgriCompleteForm((prev) => ({
                                  ...prev,
                                  returnQuantities: {
                                    ...prev.returnQuantities,
                                    [orderId]: value,
                                  },
                                }))
                              }}
                              className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                            />
                            <span className="text-xs text-gray-500">/ {orderQty}</span>
                            {returnQty > 0 && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                                Delivering: {orderQty - returnQty}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Return Reason (shown if any returns) */}
              {Object.values(agriCompleteForm.returnQuantities).some((q) => q > 0) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={agriCompleteForm.returnReason}
                    onChange={(e) => setAgriCompleteForm((prev) => ({ ...prev, returnReason: e.target.value }))}
                    placeholder="e.g., Damaged, Wrong product, Customer refused"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={agriCompleteForm.returnNotes}
                  onChange={(e) => setAgriCompleteForm((prev) => ({ ...prev, returnNotes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Summary */}
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-xs font-medium text-green-700 block mb-1">SUMMARY</span>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Total Orders: {selectedAgriOrdersForComplete.length}</span>
                  <span>With Returns: {Object.values(agriCompleteForm.returnQuantities).filter((q) => q > 0).length}</span>
                </div>
                {Object.values(agriCompleteForm.returnQuantities).some((q) => q > 0) && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Returned stock will be added back to inventory
                  </p>
                )}
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  💰 Payment will be adjusted based on final delivered quantity (original - returns).
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAgriCompleteModal(false)
                  setAgriCompleteForm({
                    returnQuantities: {},
                    returnReason: "",
                    returnNotes: "",
                  })
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAgriCompleteOrders}
                disabled={agriCompleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
                {agriCompleteLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    ✅ Complete {selectedAgriOrdersForComplete.length} Order(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Sales Person Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Assign to Sales Person</h3>
                  <p className="text-purple-100 text-sm">{selectedAgriSalesOrders.length} order(s) selected</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setAssignToUser("")
                  setAssignmentNotes("")
                }}
                className="text-white/80 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Info Banner */}
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700">
                  <strong>Note:</strong> Assigned orders will appear in the sales person&apos;s dispatch queue. 
                  Stock will be deducted when they dispatch the order.
                </p>
              </div>

              {/* Selected Orders Summary */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs font-medium text-gray-600 block mb-2">SELECTED ORDERS</span>
                <div className="max-h-[120px] overflow-y-auto space-y-1">
                  {orders
                    .filter((o) => selectedAgriSalesOrders.includes(o.id || o._id || o.details?.orderid))
                    .map((order) => (
                      <div key={order.id || order._id || order.details?.orderid} className="flex justify-between text-xs">
                        <span className="font-medium">{order.order || order.orderNumber}</span>
                        <span className="text-gray-500">
                          {order.details?.farmer?.name || order.customerName || order.farmerName} • ₹{(order.details?.totalAmount || order.totalAmount)?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Select Sales Person */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Sales Person <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignToUser}
                  onChange={(e) => setAssignToUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500">
                  <option value="">-- Select Sales Person --</option>
                  {ramAgriSalesUsers.map((user) => (
                    <option key={user.value} value={user.value}>
                      {user.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="Any instructions for the sales person..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setAssignToUser("")
                  setAssignmentNotes("")
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAssignToSalesPerson}
                disabled={!assignToUser || assignLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
                {assignLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    👤 Assign {selectedAgriSalesOrders.length} Order(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentQRModal
        open={paymentQRModalOpen}
        onClose={() => { setPaymentQRModalOpen(false); setPaymentQRModalData(null) }}
        qrImageOrString={paymentQRModalData?.qrImageOrString}
        amount={paymentQRModalData?.amount}
        orderId={paymentQRModalData?.orderId}
        customerName={paymentQRModalData?.customerName}
        mobileNumber={paymentQRModalData?.mobileNumber}
        expiresAt={paymentQRModalData?.expiresAt}
        merchantTranId={paymentQRModalData?.merchantTranId}
        qrReferenceId={paymentQRModalData?.qrReferenceId}
        onVerified={refreshModalData}
      />

      {/* Route Planner — fullscreen map for Ready tab orders */}
      <Dialog fullScreen open={routeMapOpen} onClose={() => setRouteMapOpen(false)}>
        <Suspense fallback={
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
            <CircularProgress />
          </Box>
        }>
          <OrderMapView orders={orders} onClose={() => setRouteMapOpen(false)} />
        </Suspense>
      </Dialog>
    </div>
  )
}

export default FarmerOrdersTable
