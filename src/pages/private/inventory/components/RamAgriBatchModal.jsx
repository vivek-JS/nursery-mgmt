import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Loader2 } from 'lucide-react';
import { API, NetworkManager } from '../../../../network/core';
import { formatDisplayDate } from '../../../../utils/dateUtils';

const statusClass = (status) => {
  if (status === 'active') return 'bg-green-100 text-green-800';
  if (status === 'exhausted') return 'bg-gray-100 text-gray-600';
  if (status === 'expired') return 'bg-red-100 text-red-800';
  if (status === 'blocked') return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-700';
};

export default function RamAgriBatchModal({
  open,
  onClose,
  cropId,
  varietyId,
  cropName,
  varietyName,
  formatCurrency,
}) {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !cropId || !varietyId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_VARIETY_BATCHES);
        const response = await instance.request({}, [cropId, varietyId]);
        const body = response?.data;
        const list = body?.data || body?.data?.data || [];
        if (!cancelled) setBatches(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load batches');
          setBatches([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, cropId, varietyId]);

  if (!open) return null;

  const fmt = formatCurrency || ((n) => `₹${Number(n || 0).toLocaleString('en-IN')}`);

  return createPortal(
    (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Batch inventory</h2>
            <p className="text-sm text-gray-600">
              {cropName} · {varietyName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
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
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : batches.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p>No batches for this variety</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Batch #</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Received</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Expiry</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Qty / Remaining</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Rate</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {batches.map((batch) => (
                    <tr key={batch._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{batch.batchNumber}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDisplayDate(batch.receivedDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {batch.expiryDate ? formatDisplayDate(batch.expiryDate) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {batch.remainingQuantity} / {batch.quantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{fmt(batch.purchasePrice)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(batch.status)}`}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {batch.source}
                        {batch.referenceNumber ? ` · ${batch.referenceNumber}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    ),
    document.body
  );
}
