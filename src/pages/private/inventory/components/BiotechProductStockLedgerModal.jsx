import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ChevronRight } from "lucide-react";

const formatQty = (type, quantity) => {
  const n = Number(quantity) || 0;
  if (type === "CREDIT") return `+${n.toLocaleString("en-IN")}`;
  if (type === "DEBIT") return `−${n.toLocaleString("en-IN")}`;
  return n.toLocaleString("en-IN");
};

export default function BiotechProductStockLedgerModal({
  open,
  onClose,
  loading,
  data,
  formatNumber,
}) {
  const [expandedRows, setExpandedRows] = useState({});

  if (!open) return null;

  const fmt = formatNumber || ((n) => Number(n || 0).toLocaleString("en-IN"));
  const product = data?.product;
  const summary = data?.summary || {};
  const entries = data?.entries || [];

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Biotech stock ledger</h2>
            <p className="mt-1 text-gray-600">
              {product?.code} · {product?.name}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">All-time movement history (Ram Biotech inventory)</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand-600" />
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
                  <p className="text-sm text-gray-600">Opening stock</p>
                  <p className="text-xl font-bold text-brand-600">{fmt(summary.openingStock || 0)}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-gray-600">Total IN</p>
                  <p className="text-xl font-bold text-green-700">{fmt(summary.totalCredit || 0)}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-gray-600">Total OUT</p>
                  <p className="text-xl font-bold text-red-600">{fmt(summary.totalDebit || 0)}</p>
                </div>
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <p className="text-sm text-gray-600">Closing stock</p>
                  <p className="text-xl font-bold text-purple-600">{fmt(summary.closingStock || 0)}</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-8 px-2 py-3" />
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                          No stock movements recorded yet
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry, index) => {
                        const batches = entry.batches || [];
                        const expanded = expandedRows[index];
                        const qtyClass = entry.type === "CREDIT" ? "text-green-700" : "text-red-700";
                        return (
                          <React.Fragment key={`${entry.reference}-${index}`}>
                            <tr className="hover:bg-gray-50">
                              <td className="px-2 py-3">
                                {batches.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedRows((p) => ({ ...p, [index]: !p[index] }))
                                    }
                                    className="rounded p-0.5 text-gray-500 hover:bg-gray-100"
                                  >
                                    {expanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : null}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                                {entry.date ? new Date(entry.date).toLocaleDateString("en-IN") : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    entry.type === "CREDIT"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {entry.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                {entry.category || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{entry.reference || "—"}</td>
                              <td className="max-w-[220px] truncate px-4 py-3 text-sm text-gray-800" title={entry.description}>
                                {entry.description || "—"}
                              </td>
                              <td className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${qtyClass}`}>
                                {formatQty(entry.type, entry.quantity)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                                {fmt(entry.balance || 0)}
                              </td>
                            </tr>
                            {batches.length > 0 && expanded ? (
                              <tr className="bg-slate-50/80">
                                <td colSpan={8} className="px-4 py-2">
                                  <div className="ml-6 flex flex-wrap gap-2">
                                    {batches.map((b, bi) => (
                                      <span
                                        key={`${b.batchNumber}-${bi}`}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                                      >
                                        <span className="font-semibold">{b.batchNumber || "Batch"}</span>
                                        <span className="text-slate-400">·</span>
                                        <span>{fmt(b.quantity)}</span>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
