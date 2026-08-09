import React from 'react';

function formatQty(value, unit) {
  const qty = Number(value) || 0;
  const unitLabel = unit ? ` ${unit}` : '';
  return `${qty.toLocaleString('en-IN')}${unitLabel}`;
}

export default function LinkedDispatchLoadsPanel({
  loading = false,
  blockedBy = [],
  isViewMode = false,
}) {
  if (isViewMode || (!loading && (!blockedBy || blockedBy.length === 0))) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-amber-900">
          Linked loads — seeds, chemicals & gifts
        </p>
        <p className="text-xs text-amber-800 mt-1">
          When this dispatch is saved, linked Agri / gift orders below are marked{' '}
          <strong>Loaded</strong> with the same driver and vehicle for the delivery challan.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-amber-700">Checking linked gift / Agri loads…</p>
      ) : (
        blockedBy.map((row) => {
          const loadLines = Array.isArray(row.loadLines) && row.loadLines.length
            ? row.loadLines
            : [
                {
                  productName: row.productName,
                  quantity: row.quantity,
                  isGift: false,
                  isRamAgriProduct: true,
                },
              ];
          const nurseryCode =
            row.linkedNurseryOrderCode || row.linkedNurseryOrderId || '—';

          return (
            <div
              key={String(row.agriOrderId || row.agriOrderNumber || nurseryCode)}
              className="rounded-md border border-amber-200 bg-white/80 p-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-900">
                <span className="font-semibold">
                  {row.agriOrderNumber ? `#${row.agriOrderNumber}` : 'Linked order'}
                </span>
                <span className="text-amber-600">·</span>
                <span>Nursery #{nurseryCode}</span>
                {row.customerName ? (
                  <>
                    <span className="text-amber-600">·</span>
                    <span>{row.customerName}</span>
                  </>
                ) : null}
              </div>
              <ul className="mt-2 space-y-1">
                {loadLines.map((line, idx) => (
                  <li
                    key={`${row.agriOrderId}-${idx}`}
                    className="flex flex-wrap items-center gap-2 text-xs text-slate-800"
                  >
                    {line.isGift ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 font-semibold uppercase tracking-wide">
                        Gift
                      </span>
                    ) : line.isRamAgriProduct ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                        Agri
                      </span>
                    ) : (
                      <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        Product
                      </span>
                    )}
                    <span className="font-medium">{line.productName || 'Product'}</span>
                    <span className="text-slate-500">
                      Qty {formatQty(line.quantity, line.unitAbbreviation)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
