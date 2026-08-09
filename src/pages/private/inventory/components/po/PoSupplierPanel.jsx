import React, { useMemo } from 'react';
import { FileText, Truck, Upload, ExternalLink } from 'lucide-react';
import PoSearchSelect from './PoSearchSelect';
import { inputClass, labelClass } from './poFormUtils';

export default function PoSupplierPanel({
  allSuppliers,
  selectedSupplier,
  formData,
  setFormData,
  onSupplierChange,
  isEditMode,
  invoiceFile,
  onInvoiceFileChange,
  existingInvoiceUrl,
}) {
  const invoiceRequired = !!formData.autoGRN;
  const supplierOptions = useMemo(
    () =>
      allSuppliers.map((s) => {
        const linked = s.linkedProducts?.length || 0;
        return {
          value: s._id,
          label: s.displayName || s.name,
          subLabel: [
            s.contact || s.phone || '',
            linked ? `${linked} Ram Agri linked` : '',
            s.gstNumber || s.gstin || '',
          ]
            .filter(Boolean)
            .join(' · '),
        };
      }),
    [allSuppliers]
  );

  return (
    <div className="shrink-0 grid grid-cols-12 gap-3 p-3 bg-white border-b border-slate-200">
      <div className="col-span-12 sm:col-span-4 lg:col-span-3">
        <label className={labelClass}>
          Supplier <span className="text-rose-500">*</span>
        </label>
        <PoSearchSelect
          value={selectedSupplier?._id || ''}
          onChange={onSupplierChange}
          options={supplierOptions}
          placeholder="Search supplier…"
          disabled={isEditMode}
        />
        {selectedSupplier ? (
          <p className="mt-1 text-[11px] text-slate-500 truncate">
            {formData.supplier.contact || '—'}
            {formData.supplier.gstNumber ? ` · GST ${formData.supplier.gstNumber}` : ''}
          </p>
        ) : null}
      </div>

      <div className="col-span-6 sm:col-span-4 lg:col-span-2">
        <label className={labelClass}>
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Invoice number {invoiceRequired ? <span className="text-rose-500">*</span> : null}
          </span>
        </label>
        <input
          type="text"
          required={invoiceRequired}
          value={formData.supplierInvoiceNumber || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, supplierInvoiceNumber: e.target.value }))
          }
          className={inputClass}
          placeholder="Invoice / bill no."
        />
      </div>

      <div className="col-span-6 sm:col-span-4 lg:col-span-2">
        <label className={labelClass}>
          <span className="inline-flex items-center gap-1">
            <Upload className="w-3 h-3" />
            Invoice file{' '}
            {invoiceRequired && !existingInvoiceUrl ? (
              <span className="text-rose-500">*</span>
            ) : null}
          </span>
        </label>
        <label
          className={`${inputClass} flex items-center gap-2 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40`}
        >
          <Upload className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span className="truncate text-slate-700">
            {invoiceFile?.name
              ? invoiceFile.name
              : existingInvoiceUrl
                ? 'Replace file (optional)'
                : 'Upload JPG / PNG / PDF'}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => onInvoiceFileChange?.(e.target.files?.[0] || null)}
          />
        </label>
        {existingInvoiceUrl ? (
          <a
            href={existingInvoiceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            View current invoice
          </a>
        ) : null}
      </div>

      <div className="col-span-6 sm:col-span-4 lg:col-span-2">
        <label className={labelClass}>
          <span className="inline-flex items-center gap-1">
            <Truck className="w-3 h-3" />
            Expected delivery <span className="text-rose-500">*</span>
          </span>
        </label>
        <input
          type="date"
          required
          value={formData.expectedDeliveryDate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))
          }
          className={inputClass}
        />
      </div>

      <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex items-end">
        <label className="flex items-start gap-2.5 w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-emerald-50/60 transition">
          <input
            type="checkbox"
            checked={!!formData.autoGRN}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, autoGRN: e.target.checked }))
            }
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            <span className="block text-sm font-medium text-slate-800">Auto GRN on approve</span>
            <span className="block text-[11px] text-slate-500 leading-snug">
              Stock updates when PO is approved. Invoice number & file required only when this is on.
            </span>
          </span>
        </label>
      </div>

      <div className="col-span-12 sm:col-span-6 lg:col-span-2">
        <label className={labelClass}>Notes</label>
        <input
          type="text"
          value={formData.notes || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          className={inputClass}
          placeholder="Optional notes"
        />
      </div>
    </div>
  );
}
