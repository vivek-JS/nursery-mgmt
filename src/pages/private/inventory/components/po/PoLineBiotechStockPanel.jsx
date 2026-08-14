import React, { useState } from "react";
import { Layers3, Package } from "lucide-react";
import BiotechBatchModal from "../BiotechBatchModal";
import { formatCurrency } from "../../../../../utils/numberUtils";

/**
 * Biotech PO line: current stock strip + Batches modal (same as product master).
 */
export default function PoLineBiotechStockPanel({ product }) {
  const [batchOpen, setBatchOpen] = useState(false);
  if (!product?._id) return null;

  const unit =
    (typeof product.primaryUnit === "object" &&
      (product.primaryUnit?.abbreviation || product.primaryUnit?.name)) ||
    "";
  const stock = Number(product.currentStock) || 0;
  const batchCount =
    product.batchCount != null
      ? Number(product.batchCount)
      : Array.isArray(product.batches)
        ? product.batches.length
        : null;

  return (
    <>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-2 py-1.5">
        <Package className="h-3.5 w-3.5 shrink-0 text-blue-600" />
        <span className="text-[11px] font-semibold text-slate-700">Stock:</span>
        <span className="text-[11px] font-bold tabular-nums text-blue-800">
          {stock.toLocaleString("en-IN")}
          {unit ? ` ${unit}` : ""}
        </span>
        <button
          type="button"
          onClick={() => setBatchOpen(true)}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-900 hover:bg-teal-100"
        >
          <Layers3 className="h-3 w-3" />
          Batches{batchCount != null ? ` (${batchCount})` : ""}
        </button>
      </div>
      <BiotechBatchModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        productId={product._id}
        productName={product.name || product.code || "Product"}
        formatCurrency={formatCurrency}
      />
    </>
  );
}
