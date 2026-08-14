import React from "react"
import { FaCopy, FaCreditCard, FaEdit } from "react-icons/fa"
import DeliveryDateBadge from "components/DeliveryDateBadge"
import DeliveryDateChangesInfo from "components/DeliveryDateChangesInfo"
import { canEditAgriSalesOrderRow, formatAgriDisplayOrderKey } from "./agriSalesOrderEditPrefill"
import {
  getAgriDeliveryChallanUrl,
  openOrGenerateAgriDeliveryChallan,
} from "utils/agriDeliveryChallan"

const toStatusBadgeCssClass = (status) => {
  if (status == null || status === "") return "unknown"
  return String(status).toLowerCase().replace(/_/g, "-")
}

const formatOrderStatusLabel = (s) => {
  if (!s) return "N/A"
  return String(s).replace(/_/g, " ")
}

const cellPad = "px-3 py-2.5 align-top"
const thClass =
  "px-3 py-2.5 text-left text-[11px] font-bold text-orange-900 uppercase tracking-wide bg-gradient-to-r from-orange-50 to-amber-50"

function getLinkedNurseryOrderIdString(row) {
  const raw = row?.details?.linkedNurseryOrderId
  if (raw == null || raw === "") return ""
  if (typeof raw === "object" && raw._id != null) return String(raw._id)
  return String(raw)
}

function RamAgriLinkedPlantDeliveryNote({ row, linkedPlantDispatchByNurseryId, onMarkLoaded, markBusy }) {
  const id = getLinkedNurseryOrderIdString(row)
  if (!id) return null
  const info = linkedPlantDispatchByNurseryId?.[id]
  const agriLoadStatus = row?.details?.agriLoadStatus || row?.agriLoadStatus
  const hasPlantDispatch =
    info &&
    !info.error &&
    (info.vehicleNumber || info.driverName || info.dispatchDateLabel)
  const pendingLoad = agriLoadStatus === "PENDING_LOAD" && hasPlantDispatch

  if (pendingLoad) {
    const orderId = row?.details?.orderid || row?.details?._id || row?._id
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (orderId && onMarkLoaded) onMarkLoaded(orderId)
        }}
        disabled={markBusy}
        className="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-400 animate-pulse hover:bg-amber-200 disabled:opacity-60"
        title="Plant dispatched — mark agri inputs as loaded on vehicle"
      >
        <span aria-hidden>🚚</span>
        Plant dispatched — Agri load pending
        {markBusy ? "…" : " · Mark loaded"}
      </button>
    )
  }

  if (agriLoadStatus === "LOADED") {
    return (
      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
        ✓ Loaded with plant delivery
      </span>
    )
  }

  if (!info) return null
  if (info.error) {
    return <p className="text-[10px] mt-1 text-red-600 leading-snug max-w-[18rem]">Linked plant delivery could not be loaded</p>
  }
  const bits = []
  if (info.deliveryLabel) bits.push(`Plant delivery ${info.deliveryLabel}`)
  if (info.vehicleNumber) bits.push(info.vehicleNumber)
  if (info.driverName) bits.push(info.driverName)
  if (!bits.length) {
    return (
      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
        Linked plant — not dispatched yet
      </span>
    )
  }
  return (
    <p className="text-[10px] mt-1 text-gray-600 leading-snug max-w-[18rem]" title={bits.join(" · ")}>
      {bits.join(" · ")}
    </p>
  )
}

function AgriProductLines({ row }) {
  const lineItems = row?.details?.lineItems
  if (Array.isArray(lineItems) && lineItems.length > 0) {
    return (
      <div className="space-y-1 mt-1">
        {lineItems.slice(0, 3).map((ln, i) => (
          <div
            key={ln._id || i}
            className="text-[11px] leading-snug rounded-md border border-orange-100 bg-orange-50/60 px-2 py-1"
          >
            <span className="font-semibold text-orange-950">{ln.ramAgriCropName || ln.productName || "Product"}</span>
            {ln.ramAgriVarietyName ? (
              <span className="text-orange-800"> · {ln.ramAgriVarietyName}</span>
            ) : null}
            <div className="text-orange-900 tabular-nums">
              {Number(ln.quantity || 0).toLocaleString()} × ₹{Number(ln.rate || 0).toFixed(2)}
            </div>
          </div>
        ))}
        {lineItems.length > 3 && (
          <div className="text-[10px] text-gray-500">+{lineItems.length - 3} more product(s)</div>
        )}
      </div>
    )
  }
  return (
    <div className="inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[12px] font-bold text-orange-950 leading-tight max-w-[200px]">
      {row.plantType || row.details?.productName || "—"}
    </div>
  )
}

export function RamAgriTableHeader({ hidePaymentDetails, selectedAgriSalesOrders, orders, onToggleSelectAll }) {
  const dispatchableCount = (orders || []).filter(
    (o) => o.isAgriSalesOrder && (o.orderStatus === "ACCEPTED" || o.orderStatus === "ASSIGNED")
  ).length

  return (
    <tr>
      <th className={`${thClass} w-10`}>
        <input
          type="checkbox"
          onChange={onToggleSelectAll}
          checked={selectedAgriSalesOrders.length > 0 && selectedAgriSalesOrders.length === dispatchableCount}
          className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
          title="Select all accepted and assigned orders for dispatch"
        />
      </th>
      <th className={`${thClass} min-w-[56px]`}>#</th>
      <th className={`${thClass} min-w-[130px]`}>Order</th>
      <th className={`${thClass} min-w-[96px]`}>Order date</th>
      <th className={`${thClass} min-w-[170px]`}>Customer</th>
      <th className={`${thClass} min-w-[150px]`}>Products</th>
      <th className={`${thClass} min-w-[110px]`}>Delivery</th>
      <th className={`${thClass} min-w-[80px]`}>Qty</th>
      <th className={`${thClass} min-w-[72px]`}>Rate</th>
      {!hidePaymentDetails && <th className={`${thClass} min-w-[120px]`}>Amount / Pay</th>}
      <th className={`${thClass} min-w-[100px]`}>Dispatch</th>
      <th className={`${thClass} min-w-[110px]`}>Status</th>
      <th className={`${thClass} min-w-[88px]`}>Actions</th>
    </tr>
  )
}

export function RamAgriTableRowCells({
  row,
  sr,
  hidePaymentDetails,
  selectedAgriSalesOrders,
  selectedAgriOrdersForComplete,
  linkedPlantDispatchByNurseryId,
  onMarkLinkedAgriLoaded,
  agriLoadActionBusyId,
  canAddPayment,
  canChangeOrderStatus,
  canEditOrderCore,
  isRamAgriSalesUser,
  isRamAgriMasterUser,
  onToggleDispatchSelection,
  onToggleCompleteSelection,
  onCopyLinkedOrderCode,
  onOpenDetails,
  onOpenAddPayment,
  onOpenEdit,
  onAccept,
  onReject,
  orderDateDisplayFormat,
}) {
  const farmerLocation =
    row.details?.customerTaluka && row.details?.customerVillage
      ? `${row.details.customerTaluka} → ${row.details.customerVillage}`
      : row.details?.customerTaluka || row.details?.customerVillage || null
  const hasPendingPayment = row?.details?.payment?.some((p) => p.paymentStatus === "PENDING")
  const canEdit = canEditAgriSalesOrderRow(row, {
    canEditOrderCore,
    isRamAgriSalesUser,
    isRamAgriMasterUser,
  })

  return (
    <>
      <td className={cellPad} onClick={(e) => e.stopPropagation()}>
        {row.orderStatus === "ACCEPTED" || row.orderStatus === "ASSIGNED" ? (
          <input
            type="checkbox"
            onChange={() => onToggleDispatchSelection(row.details.orderid)}
            checked={selectedAgriSalesOrders.includes(row.details.orderid)}
            className="w-4 h-4 rounded border-2 border-orange-400 text-orange-600 focus:ring-orange-500 cursor-pointer"
            title="Select for dispatch or assign"
          />
        ) : row.orderStatus === "DISPATCHED" || row.details?.dispatchStatus === "DISPATCHED" ? (
          <div className="flex items-center gap-1">
            <input
              type="checkbox"
              onChange={() => onToggleCompleteSelection(row.details.orderid)}
              checked={selectedAgriOrdersForComplete.includes(row.details.orderid)}
              className="w-4 h-4 rounded border-2 border-green-400 text-green-600 focus:ring-green-500 cursor-pointer"
              title="Select for complete"
            />
            <span>{row.details.dispatchMode === "COURIER" ? "📦" : "🚚"}</span>
          </div>
        ) : row.orderStatus === "COMPLETED" || row.details?.dispatchStatus === "DELIVERED" ? (
          <span className="text-lg">✅</span>
        ) : row.orderStatus === "PENDING" ? (
          <span className="text-yellow-500 text-lg" title="Pending acceptance">
            ⏳
          </span>
        ) : (
          <span className="text-gray-300 text-lg">○</span>
        )}
      </td>

      <td className={`${cellPad} whitespace-nowrap`}>
        <span className="text-xs font-semibold text-gray-700 tabular-nums">{sr}</span>
      </td>

      <td className={`${cellPad} whitespace-normal`}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-gray-900 tabular-nums">#{formatAgriDisplayOrderKey(row)}</span>
            {row.details?.isDealerSelfOrder || row.details?.orderSource === "DEALER_SELF" ? (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200"
                title="Dealer self order"
              >
                Dealer
              </span>
            ) : null}
            {(row.isOld || row.details?.isOld) ? (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-300"
                title="Pre–30 Jul 2026 booking era"
              >
                Old
              </span>
            ) : null}
            {row.details?.linkedNurseryOrderCode ? (
              <button
                type="button"
                onClick={(e) => onCopyLinkedOrderCode(row.details.linkedNurseryOrderCode, e)}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200"
                title="Copy linked regular order ID"
              >
                <FaCopy className="mr-0.5" />
                Linked #{row.details.linkedNurseryOrderCode}
              </button>
            ) : null}
          </div>
          {getLinkedNurseryOrderIdString(row) ? (
            <RamAgriLinkedPlantDeliveryNote
              row={row}
              linkedPlantDispatchByNurseryId={linkedPlantDispatchByNurseryId}
              onMarkLoaded={onMarkLinkedAgriLoaded}
              markBusy={agriLoadActionBusyId === (row?.details?.orderid || row?.details?._id || row?._id)}
            />
          ) : null}
        </div>
      </td>

      <td className={`${cellPad} whitespace-nowrap`}>
        <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-900 tabular-nums">
          {row.orderDate || "—"}
        </span>
      </td>

      <td className={cellPad}>
        <div className="text-[13px] font-semibold text-gray-900 leading-tight">{row.farmerName}</div>
        {row.details?.customerMobile ? (
          <div className="text-[11px] text-gray-600 mt-0.5 tabular-nums">{row.details.customerMobile}</div>
        ) : null}
        {row.details?.isDealerSelfOrder || row.details?.orderSource === "DEALER_SELF" ? (
          <div className="text-[10px] text-violet-700 mt-1 font-semibold">Dealer self order</div>
        ) : row.details?.salesPerson ? (
          <div className="text-[10px] text-orange-700 mt-1 font-medium">By: {row.details.salesPerson.name}</div>
        ) : row.details?.dealer?.name ? (
          <div className="text-[10px] text-violet-700 mt-1 font-medium">Dealer: {row.details.dealer.name}</div>
        ) : null}
        {farmerLocation ? (
          <div className="text-[11px] font-medium text-gray-700 mt-1 leading-snug max-w-[180px]">{farmerLocation}</div>
        ) : null}
      </td>

      <td className={cellPad}>
        <AgriProductLines row={row} />
      </td>

      <td className={`${cellPad} whitespace-nowrap`}>
        <DeliveryDateBadge order={row} format={orderDateDisplayFormat} />
        <DeliveryDateChangesInfo order={row} dateFormat={orderDateDisplayFormat} datetimeFormat={orderDateDisplayFormat} />
      </td>

      <td className={cellPad}>
        {row.orderStatus === "COMPLETED" && row.details?.deliveredQuantity > 0 ? (
          <>
            <div className="text-xs font-bold text-green-700 tabular-nums">
              Final: {row.details.deliveredQuantity?.toLocaleString()}
            </div>
            {row.details.returnQuantity > 0 ? (
              <div className="text-[10px] text-red-600 mt-0.5 tabular-nums">
                Returned: {row.details.returnQuantity?.toLocaleString()}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-sm font-bold text-gray-900 tabular-nums">
            {(row.totalPlants ?? row.quantity)?.toLocaleString()}
          </div>
        )}
      </td>

      <td className={`${cellPad} whitespace-nowrap`}>
        <div className="text-sm font-bold text-gray-900 tabular-nums">₹{Number(row.rate).toFixed(2)}</div>
      </td>

      {!hidePaymentDetails && (
        <td className={cellPad} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-gray-900">{row.total}</div>
            <div className="text-[11px] text-green-700 font-medium">{row["Paid Amt"]}</div>
            <div className="text-[11px] text-amber-700 font-medium">{row["remaining Amt"]}</div>
            {hasPendingPayment ? (
              <span className="inline-block text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold">
                Pending
              </span>
            ) : null}
            {canAddPayment ? (
              <button
                type="button"
                title="Add payment"
                onClick={(e) => onOpenAddPayment(row, e)}
                className="mt-1 inline-flex items-center gap-0.5 rounded-md border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-800 hover:bg-green-100"
              >
                <FaCreditCard className="h-2.5 w-2.5" />
                Pay
              </button>
            ) : null}
          </div>
        </td>
      )}

      <td className={cellPad}>
        {row.details?.dispatchStatus && row.details.dispatchStatus !== "NOT_DISPATCHED" ? (
          <div className="space-y-0.5">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold inline-block ${
                row.details.dispatchStatus === "DISPATCHED"
                  ? row.details.dispatchMode === "COURIER"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-sky-100 text-sky-800"
                  : row.details.dispatchStatus === "DELIVERED"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {row.details.dispatchMode === "COURIER" ? "📦 " : "🚚 "}
              {row.details.dispatchStatus}
            </span>
            {(row.details?.vehicleNumber || row.details?.courierName) && (
              <div className="text-[10px] text-gray-600 truncate max-w-[100px]">
                {row.details.dispatchMode === "COURIER"
                  ? row.details.courierName || row.details.courierTrackingId
                  : row.details.vehicleNumber}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">⏳ Pending</span>
        )}
      </td>

      <td className={cellPad} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1">
          <span
            className={`status-badge-enhanced status-${toStatusBadgeCssClass(row.orderStatus)} inline-flex items-center gap-1 text-[10px] px-2 py-0.5 w-fit`}
          >
            {formatOrderStatusLabel(row.orderStatus)}
          </span>
          {canChangeOrderStatus && row.orderStatus === "PENDING" ? (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAccept(row)
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold hover:bg-green-200"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onReject(row)
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200"
              >
                Reject
              </button>
            </div>
          ) : null}
          {(row.orderStatus === "DISPATCHED" ||
            row.orderStatus === "COMPLETED" ||
            row.details?.dispatchStatus === "DISPATCHED" ||
            row.details?.dispatchStatus === "DELIVERED" ||
            row.details?.dispatchStatus === "IN_TRANSIT") && (
            <button
              type="button"
              title={
                getAgriDeliveryChallanUrl(row)
                  ? "Open delivery challan PDF"
                  : "Generate / open delivery challan"
              }
              onClick={(e) => {
                e.stopPropagation()
                openOrGenerateAgriDeliveryChallan(row.details?.orderid || row._id, {
                  existingUrl: getAgriDeliveryChallanUrl(row),
                  force: true,
                })
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold hover:bg-indigo-200 w-fit"
            >
              {getAgriDeliveryChallanUrl(row) ? "Open DC" : "Get DC"}
            </button>
          )}
        </div>
      </td>

      <td className={cellPad} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetails(row)
            }}
            className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 px-1.5 py-0.5 rounded hover:bg-sky-50 text-left"
          >
            View
          </button>
          {canEdit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenEdit(row)
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-800 hover:text-orange-950 px-1.5 py-0.5 rounded hover:bg-orange-50 text-left"
            >
              <FaEdit className="w-3 h-3" />
              Edit
            </button>
          ) : null}
        </div>
      </td>
    </>
  )
}
