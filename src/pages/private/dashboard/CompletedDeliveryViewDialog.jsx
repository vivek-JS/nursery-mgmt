import React, { useEffect, useState } from "react"
import { CheckCircle, Lock, Printer, X } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { formatOrderDateDisplay } from "utils/istCalendar"
import {
  normalizeDispatchOrderPlantFields,
  orderPlantDisplayLabel,
} from "utils/orderPlantResolve"
import CompleteInvoicePDF from "./CompleteInvoicePDF"

const num = (v) => Number(v || 0) || 0
const rupee = (v) => `₹${num(v).toLocaleString("en-IN")}`
const plants = (v) => num(v).toLocaleString("en-IN")

function parseDispatch(res) {
  const raw = res?.data?.data ?? res?.data
  return raw?._id ? raw : raw?.data?._id ? raw.data : null
}

function orderPayments(order) {
  return Array.isArray(order?.payment) ? order.payment : []
}

function ReadField({ label, value, wide = false, multiline = false }) {
  const text = value == null || value === "" ? "—" : String(value)
  return (
    <div className={wide ? "col-span-2 sm:col-span-4" : ""}>
      <label className="text-[10px] font-medium text-gray-600">{label}</label>
      {multiline ? (
        <textarea
          disabled
          rows={2}
          value={text}
          className="mt-0.5 w-full cursor-not-allowed resize-none rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-800"
        />
      ) : (
        <input
          disabled
          value={text}
          className="mt-0.5 w-full cursor-not-allowed rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-800"
        />
      )}
    </div>
  )
}

function Section({ title, tone = "gray", children }) {
  const tones = {
    gray: "border-gray-200 bg-gray-50/60 text-gray-700",
    blue: "border-blue-200 bg-blue-50/50 text-blue-800",
    amber: "border-amber-200 bg-amber-50/50 text-amber-800",
    green: "border-green-200 bg-green-50/50 text-green-800",
    violet: "border-violet-200 bg-violet-50/50 text-violet-800",
  }
  return (
    <div className={`rounded-lg border p-2.5 ${tones[tone]}`}>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

function OrderBlock({ order, dispatch }) {
  const detail = (dispatch.orderDispatchDetails || []).find(
    (d) => String(d.orderId) === String(order._id)
  )
  const base = num(order.numberOfPlants)
  const additional = num(order.additionalPlants)
  const dispatched = num(detail?.dispatchQuantity) || base + additional
  const returned = num(order.returnedPlants)
  const damaged = num(order.damagedPlants)
  const delivered = Math.max(0, dispatched - returned - damaged)
  const rate = num(order.rate)
  const freight = order.freight || {}
  const farmerFreight = num(order.freightCharges ?? freight.farmerShareAmount)
  const payments = orderPayments(order)
  const discount = payments
    .filter((p) => p?.isDiscount || p?.modeOfPayment === "Discount")
    .reduce((s, p) => s + num(p.paidAmount), 0)
  const paid = payments
    .filter((p) => !(p?.isDiscount || p?.modeOfPayment === "Discount"))
    .filter((p) => p?.paymentStatus === "COLLECTED" || p?.paymentStatus === "PENDING")
    .reduce((s, p) => s + num(p.paidAmount), 0)
  const gross = delivered * rate + farmerFreight
  const due = Math.max(0, gross - paid - discount)
  const batch = order.deliveryCompleteBatch || {}
  const lastReturn = [...(order.returnHistory || [])].reverse().find((h) => h?.reason)

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            #{order.orderId ?? order.order ?? "—"} · {order.farmer?.name || "—"}
          </p>
          <p className="truncate text-xs text-gray-500">
            {orderPlantDisplayLabel(normalizeDispatchOrderPlantFields(order))}
            {order.farmer?.village ? ` · ${order.farmer.village}` : ""}
            {order.farmer?.mobileNumber ? ` · ${order.farmer.mobileNumber}` : ""}
          </p>
        </div>
        <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-800">
          {String(order.orderStatus || "—").replace(/_/g, " ")}
        </span>
      </div>

      <div className="space-y-2 p-3">
        <Section title="Plants">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ReadField label="Booked plants" value={plants(base)} />
            <ReadField label="Additional plants" value={plants(additional)} />
            <ReadField label="Dispatched" value={plants(dispatched)} />
            <ReadField label="Delivered" value={plants(delivered)} />
            <ReadField label="Returned to nursery" value={plants(returned)} />
            <ReadField label="Damaged" value={plants(damaged)} />
            <ReadField label="Rate" value={rupee(rate)} />
            <ReadField label="Nursery" value={order.expectedNursery} />
            <ReadField
              label="Return reason"
              value={order.returnReason || lastReturn?.reason}
              wide
            />
          </div>
        </Section>

        <Section title="Batch / shed" tone="blue">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ReadField label="Batch" value={batch.batchNumber || order.batchNumber} />
            <ReadField label="Shed" value={batch.pollyhouse} />
            <ReadField label="Source" value={batch.source ? batch.source.replace(/_/g, " ") : ""} />
          </div>
        </Section>

        <Section title="Freight" tone="amber">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ReadField label="Total freight" value={rupee(freight.totalAmount ?? farmerFreight)} />
            <ReadField label="Farmer share" value={rupee(farmerFreight)} />
            <ReadField label="Company share" value={rupee(freight.companyShareAmount)} />
            <ReadField label="Paid by" value={freight.paidBy} />
            <ReadField label="Transporter" value={freight.transporterName} />
            <ReadField label="Vehicle no." value={freight.vehicleNumber} />
            <ReadField label="Freight remark" value={freight.remark} wide />
          </div>
        </Section>

        <Section title="Payments" tone="green">
          {payments.length === 0 ? (
            <p className="text-xs text-gray-500">No payments recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="py-1 pr-2">Date</th>
                    <th className="py-1 pr-2">Mode</th>
                    <th className="py-1 pr-2 text-right">Amount</th>
                    <th className="py-1 pr-2">Status</th>
                    <th className="py-1 pr-2">UTR / Cheque</th>
                    <th className="py-1">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-100">
                  {payments.map((p, i) => (
                    <tr key={p?._id || i} className="text-gray-800">
                      <td className="py-1 pr-2 whitespace-nowrap">
                        {p?.paymentDate ? formatOrderDateDisplay(p.paymentDate) : "—"}
                      </td>
                      <td className="py-1 pr-2">
                        {p?.isWalletPayment ? "Wallet" : p?.modeOfPayment || "—"}
                      </td>
                      <td className="py-1 pr-2 text-right font-semibold">{rupee(p?.paidAmount)}</td>
                      <td className="py-1 pr-2">{p?.paymentStatus || "—"}</td>
                      <td className="py-1 pr-2">
                        {p?.utrNumber || p?.transactionId || p?.chequeNumber || "—"}
                      </td>
                      <td className="py-1">{p?.remark || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ReadField label="Gross" value={rupee(gross)} />
            <ReadField label="Paid" value={rupee(paid)} />
            <ReadField label="Discount" value={rupee(discount)} />
            <ReadField label="Due" value={rupee(due)} />
          </div>
        </Section>
      </div>
    </div>
  )
}

/** Read-only view of a delivered dispatch's complete form, with print. */
export default function CompletedDeliveryViewDialog({ open, onClose, dispatch }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const dispatchId = String(dispatch?._id || "")

  useEffect(() => {
    if (!open || !dispatchId) return undefined
    let cancelled = false
    setLoading(true)
    setData(null)
    NetworkManager(API.DISPATCHED.GET_BY_ID)
      .request({}, [dispatchId])
      .then((res) => {
        if (!cancelled) setData(parseDispatch(res))
      })
      .catch((err) => {
        if (!cancelled) Toast.error(err?.response?.data?.message || "Failed to load completed form")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, dispatchId])

  if (!open && !printOpen) return null

  const view = data || dispatch || {}
  const orders = Array.isArray(data?.orderIds) ? data.orderIds : []
  const trip = data?.trip || {}

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
          onClick={onClose}>
          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 truncate text-base font-semibold text-gray-900 sm:text-lg">
                  <CheckCircle size={18} className="text-green-600" />
                  Completed delivery · Transport {view.transportId ?? "—"}
                </h2>
                <p className="truncate text-xs text-gray-600 sm:text-sm">
                  {view.driverName || "—"} · {view.vehicleName || "—"}
                  {view.vehicleNumber ? ` (${view.vehicleNumber})` : ""}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500">
                  <Lock size={11} /> Read-only — saved values from the complete form
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-3">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
                </div>
              ) : orders.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">No orders on this dispatch.</p>
              ) : (
                <>
                  {orders.map((order) => (
                    <OrderBlock key={String(order._id)} order={order} dispatch={data} />
                  ))}
                  <Section title="Vehicle trip" tone="violet">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <ReadField label="Trip #" value={trip.tripNumber} />
                      <ReadField label="KM run" value={trip.kmRun} />
                      <ReadField
                        label="Rent (₹)"
                        value={trip.rent != null ? rupee(trip.rent) : ""}
                      />
                      <ReadField
                        label="Other charges (₹)"
                        value={trip.otherCharges != null ? rupee(trip.otherCharges) : ""}
                      />
                      <ReadField label="Remark" value={trip.tripRemark} wide multiline />
                    </div>
                  </Section>
                </>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                Close
              </button>
              <button
                type="button"
                disabled={!data || loading}
                onClick={() => setPrintOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50">
                <Printer size={15} /> Print
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CompleteInvoicePDF
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        dispatchData={printOpen ? data : null}
      />
    </>
  )
}
