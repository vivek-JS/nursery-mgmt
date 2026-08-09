import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Trash2,
  CheckCircle,
  Receipt,
} from "lucide-react";
import {
  summarizeDispatchRow,
  statusChipClass,
  canShowInvoice,
} from "./dispatchVehiclesUtils";
import { openDispatchPdfUrl } from "utils/dispatchPdfHelpers";
import { Toast } from "helpers/toasts/toastHelper";

function ActionBtn({ onClick, children, className = "", disabled = false, title = "" }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border transition disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export default function DispatchedVehiclesTable({
  dateGroups = [],
  dispatches = [],
  loading = false,
  pdfBusyId = null,
  onDeliveryChallan,
  onInvoice,
  onOpenForm,
  onCollectSlip,
  onCompleteOrder,
  onDeleteDispatch,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const groups = dateGroups.length ? dateGroups : [{ dateKey: "all", label: "", rows: dispatches }];
  const colSpan = 10;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[240px] rounded-xl border border-gray-200 bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!dispatches.length) {
    return (
      <div className="text-center py-16 text-gray-500 border border-dashed border-gray-200 rounded-xl bg-white">
        <TruckPlaceholder />
        <p className="mt-3 font-medium text-gray-700">No dispatched vehicles found</p>
        <p className="text-sm text-gray-500">Try another date range, status tab, or search term.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-green-50/60 text-left text-[11px] uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-3 w-8" />
              <th className="px-3 py-3">Transport</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Vehicle / Driver</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Orders</th>
              <th className="px-3 py-3 text-right">Plants</th>
              <th className="px-3 py-3 text-right">Due ₹</th>
              <th className="px-3 py-3">Documents</th>
              <th className="px-3 py-3 min-w-[320px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {groups.map((group) => (
              <React.Fragment key={group.dateKey}>
                {group.label ? (
                  <tr className="bg-green-50/80">
                    <td colSpan={colSpan} className="px-3 py-2 text-xs font-bold text-green-900 border-y border-green-100">
                      {group.label}
                      <span className="ml-2 font-semibold text-green-700">
                        · {group.rows.length} vehicle{group.rows.length === 1 ? "" : "s"}
                      </span>
                    </td>
                  </tr>
                ) : null}
                {group.rows.map((dispatch) => {
                  const row = summarizeDispatchRow(dispatch);
                  const id = String(dispatch._id);
                  const expanded = expandedId === id;
                  const pdfBusy = pdfBusyId === id;
                  const showInvoice = canShowInvoice(dispatch);
                  const isDelivered = String(row.status).toUpperCase() === "DELIVERED";
                  const agriLoadBlocked = Boolean(dispatch?.agriLoadBlocked);

                  return (
                    <React.Fragment key={id}>
                      <tr
                        className={`hover:bg-green-50/50 cursor-pointer ${expanded ? "bg-green-50/30" : ""}`}
                        onClick={() => setExpandedId(expanded ? null : id)}
                      >
                        <td className="px-3 py-2.5">
                          {expanded ? (
                            <ChevronDown size={16} className="text-gray-500" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-500" />
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-gray-900">#{row.transportId}</div>
                          {row.dispatchName ? (
                            <div className="text-[10px] text-gray-500 truncate max-w-[120px]" title={row.dispatchName}>
                              {row.dispatchName}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                          <div className="text-xs font-medium">{row.dispatchTimeLabel || "—"}</div>
                          {!group.label && row.dispatchDateLabel !== "—" ? (
                            <div className="text-[10px] text-gray-500">{row.dispatchDateLabel}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">
                          <div className="font-medium">{row.vehicleLabel}</div>
                          <div className="text-xs text-gray-500">
                            {row.driverName}
                            {row.driverMobile ? ` · ${row.driverMobile}` : ""}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusChipClass(row.status)}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium">{row.orderCount}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                          {row.plantTotal.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={row.dueTotal > 0 ? "text-amber-700 font-semibold" : "text-green-700"}>
                            ₹{row.dueTotal.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-1">
                            {row.dcPdfUrl ? (
                              <ActionBtn
                                onClick={() => {
                                  if (!openDispatchPdfUrl(row.dcPdfUrl)) {
                                    Toast.error("Could not open DC PDF");
                                  }
                                }}
                                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                                title="Open DC PDF"
                              >
                                <Download size={10} /> DC PDF
                              </ActionBtn>
                            ) : null}
                            {row.invPdfUrl ? (
                              <ActionBtn
                                onClick={() => {
                                  if (!showInvoice) {
                                    Toast.error("Complete the order form first to generate the invoice");
                                    return;
                                  }
                                  if (!openDispatchPdfUrl(row.invPdfUrl)) {
                                    Toast.error("Could not open invoice PDF");
                                  }
                                }}
                                className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                                title="Open Invoice PDF"
                              >
                                <Download size={10} /> Invoice PDF
                              </ActionBtn>
                            ) : null}
                            {!row.dcPdfUrl && !row.invPdfUrl ? (
                              <span className="text-[10px] text-gray-400">—</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center gap-1">
                            <ActionBtn
                              onClick={() => onOpenForm?.(dispatch)}
                              className="border-blue-200 text-blue-700 hover:bg-blue-50"
                              title="Open dispatch form"
                            >
                              <Eye size={10} /> View
                            </ActionBtn>
                            <ActionBtn
                              onClick={() => onCollectSlip?.(dispatch)}
                              className="border-green-200 text-green-700 hover:bg-green-50"
                            >
                              <ClipboardList size={10} /> Collect Slip
                            </ActionBtn>
                            <ActionBtn
                              disabled={agriLoadBlocked || pdfBusy}
                              onClick={() => onDeliveryChallan?.(dispatch)}
                              className={
                                agriLoadBlocked || pdfBusy
                                  ? "border-gray-200 text-gray-400"
                                  : "border-purple-200 text-purple-700 hover:bg-purple-50"
                              }
                              title={
                                agriLoadBlocked
                                  ? "Agri Input pending load by Agri admin"
                                  : pdfBusy
                                    ? "Preparing DC…"
                                    : "Delivery Challan"
                              }
                            >
                              <FileText size={10} />
                              {pdfBusy ? "DC…" : "Delivery Challan"}
                            </ActionBtn>
                            <ActionBtn
                              disabled={pdfBusy}
                              onClick={() => {
                                if (!showInvoice) {
                                  Toast.error("Complete the order form first to generate the invoice");
                                  return;
                                }
                                onInvoice?.(dispatch, false);
                              }}
                              className={
                                !showInvoice
                                  ? "border-gray-200 text-gray-400"
                                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
                              }
                              title={
                                !showInvoice
                                  ? "Complete the order form first to generate the invoice"
                                  : row.invPdfUrl
                                    ? "Open server invoice PDF"
                                    : "Generate server invoice PDF"
                              }
                            >
                              <Receipt size={10} />
                              {pdfBusy && showInvoice ? "Invoice…" : "Invoice"}
                            </ActionBtn>
                            {showInvoice && row.invPdfUrl ? (
                              <ActionBtn
                                disabled={pdfBusy}
                                onClick={() => onInvoice?.(dispatch, true)}
                                className="border-amber-200 text-amber-900 hover:bg-amber-50"
                                title="Regenerate invoice PDF (keeps previous in history)"
                              >
                                Regen invoice
                              </ActionBtn>
                            ) : null}
                            {!isDelivered ? (
                              <>
                                <ActionBtn
                                  onClick={() => onCompleteOrder?.(dispatch)}
                                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                                  title="Complete order form"
                                >
                                  <CheckCircle size={10} /> Complete Order
                                </ActionBtn>
                                <ActionBtn
                                  onClick={() => onDeleteDispatch?.(dispatch)}
                                  className="border-red-200 text-red-700 hover:bg-red-50"
                                  title="Delete transport"
                                >
                                  <Trash2 size={10} /> Delete
                                </ActionBtn>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-gray-50/90">
                          <td colSpan={colSpan} className="px-4 py-4">
                            <ExpandedDispatchDetail
                              row={row}
                              dispatch={dispatch}
                              onOpenForm={() => onOpenForm?.(dispatch)}
                              onCompleteOrder={
                                !isDelivered ? () => onCompleteOrder?.(dispatch) : null
                              }
                            />
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpandedDispatchDetail({ row, dispatch, onOpenForm, onCompleteOrder }) {
  const notes = [
    row.routeNotes && `Route: ${row.routeNotes}`,
    row.driverRemark && `Driver: ${row.driverRemark}`,
    row.vehicleRemark && `Vehicle: ${row.vehicleRemark}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <StatPill label="Total amount" value={`₹${row.amountTotal.toLocaleString()}`} />
          <StatPill label="Paid" value={`₹${row.paidTotal.toLocaleString()}`} good />
          <StatPill label="Due" value={`₹${row.dueTotal.toLocaleString()}`} warn={row.dueTotal > 0} />
          <StatPill label="Farmers" value={row.farmersLabel} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenForm}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            Open full dispatch form
          </button>
          {onCompleteOrder ? (
            <button
              type="button"
              onClick={onCompleteOrder}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700"
            >
              Complete Order
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-100 text-green-800 border border-green-200">
              <CheckCircle size={12} /> Delivered
            </span>
          )}
        </div>
      </div>
      {notes ? (
        <p className="text-xs text-slate-600 bg-white border border-gray-200 rounded-lg px-3 py-2">{notes}</p>
      ) : null}
      {dispatch.agriLoadBlocked ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Agri Input pending load — delivery challan may be blocked until loaded.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-2 py-2 text-left">Order #</th>
              <th className="px-2 py-2 text-left">Farmer</th>
              <th className="px-2 py-2 text-left">Village</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Rate</th>
              <th className="px-2 py-2 text-left">DC #</th>
              <th className="px-2 py-2 text-right">Paid</th>
              <th className="px-2 py-2 text-right">Due</th>
            </tr>
          </thead>
          <tbody>
            {row.orderRows.map((o, i) => (
              <tr key={i} className="border-t border-gray-100 hover:bg-green-50/40">
                <td className="px-2 py-1.5 font-semibold">{o.orderId}</td>
                <td className="px-2 py-1.5">{o.farmerName}</td>
                <td className="px-2 py-1.5">{o.village || "—"}</td>
                <td className="px-2 py-1.5 text-right">{o.quantity.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right">₹{o.rate}</td>
                <td className="px-2 py-1.5">{o.dcNo || "—"}</td>
                <td className="px-2 py-1.5 text-right text-green-700">₹{o.paid.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right font-medium text-amber-700">₹{o.due.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatPill({ label, value, good = false, warn = false }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`font-bold ${good ? "text-green-700" : warn ? "text-amber-700" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function TruckPlaceholder() {
  return (
    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM5 11h11l2-4H6l-1 4zm0 0L4 7H2" />
    </svg>
  );
}
