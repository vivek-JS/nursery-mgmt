import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@mui/material";
import { buildDefaultAadharMap, listInvoiceOrders } from "./invoiceAadharUtils";

export default function InvoiceAadharDialog({ open, dispatch, onConfirm, onClose }) {
  const rows = useMemo(() => (open && dispatch ? listInvoiceOrders(dispatch) : []), [dispatch, open]);
  const [aadharByOrderId, setAadharByOrderId] = useState({});

  useEffect(() => {
    if (!open || !dispatch) return;
    setAadharByOrderId(buildDefaultAadharMap(dispatch));
  }, [dispatch, open]);

  if (!open) return null;

  const handleSubmit = () => {
    const cleaned = {};
    for (const row of rows) {
      const raw = String(aadharByOrderId[row.orderKey] ?? "").trim();
      if (raw) cleaned[row.orderKey] = raw;
    }
    onConfirm?.(cleaned);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Invoice details</h2>
          <p className="text-sm text-gray-600 mt-1">
            Dealer orders bill to dealer and ship to farmer. Aadhar is optional (banana invoices).
          </p>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {rows.map((row) => (
            <div key={row.orderKey} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Order #{row.orderNo} · {row.farmerName}
                  </p>
                  {row.dealerOrder ? (
                    <p className="text-[11px] font-medium text-emerald-700">
                      Dealer order · Bill to dealer / Ship to farmer
                    </p>
                  ) : null}
                </div>
              </div>
              <label className="block text-xs font-semibold text-gray-600">
                Aadhar No. (optional)
                <input
                  type="text"
                  inputMode="numeric"
                  value={aadharByOrderId[row.orderKey] ?? ""}
                  onChange={(e) =>
                    setAadharByOrderId((prev) => ({ ...prev, [row.orderKey]: e.target.value }))
                  }
                  placeholder="12-digit Aadhar"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            Continue
          </button>
        </div>
      </div>
    </Dialog>
  );
}
