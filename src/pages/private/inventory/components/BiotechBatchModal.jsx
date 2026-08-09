import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { API, NetworkManager } from "network/core";
import { formatDisplayDate } from "utils/dateUtils";

const statusClass = (status) => {
  if (status === "active") return "bg-green-100 text-green-800";
  if (status === "exhausted") return "bg-gray-100 text-gray-600";
  if (status === "expired") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
};

export default function BiotechBatchModal({ open, onClose, productId, productName, formatCurrency }) {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const instance = NetworkManager(API.INVENTORY.GET_PRODUCT_BY_ID);
        const response = await instance.request({}, [productId]);
        const body = response?.data?.data ?? response?.data;
        const inner = body?.data ?? body;
        const list = inner?.batches || body?.batches || [];
        if (!cancelled) setBatches(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || "Failed to load batches");
          setBatches([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  if (!open) return null;

  const fmt = formatCurrency || ((n) => `₹${Number(n || 0).toLocaleString("en-IN")}`);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Biotech batches</h2>
            <p className="text-sm text-gray-600">{productName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Loading batches…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : batches.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No batches for this product</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Batch #</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Remaining</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Rate</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Received</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batches.map((batch) => (
                    <tr key={batch._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{batch.batchNumber}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{batch.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{batch.remainingQuantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(batch.purchasePrice)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {batch.receivedDate ? formatDisplayDate(batch.receivedDate) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(batch.status)}`}
                        >
                          {batch.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
