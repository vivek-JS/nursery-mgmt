import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * Compact searchable dropdown for PO table / header (Tailwind).
 * options: [{ value, label, subLabel? }]
 */
export default function PoSearchSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Search & select…',
  disabled = false,
  className = '',
  emptyLabel = 'No matches',
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) =>
        String(o.label || '').toLowerCase().includes(term) ||
        String(o.subLabel || '').toLowerCase().includes(term)
    );
  }, [options, q]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQ('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm border rounded-lg transition
          ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200 hover:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30'}
          ${open ? 'border-emerald-500 ring-2 ring-emerald-500/30' : ''}`}
      >
        <span className={`flex-1 truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected?.label || placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            className="p-0.5 rounded hover:bg-slate-100 text-slate-400"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setQ('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onChange('');
              }
            }}
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : (
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] max-w-[420px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-slate-100 bg-slate-50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to filter…"
              className="w-full bg-transparent text-sm outline-none text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">{emptyLabel}</li>
            ) : (
              filtered.map((opt) => (
                <li key={String(opt.value)}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition
                      ${String(opt.value) === String(value) ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700'}`}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQ('');
                    }}
                  >
                    <div className="truncate font-medium">{opt.label}</div>
                    {opt.subLabel ? (
                      <div className="truncate text-[11px] text-slate-500 mt-0.5">{opt.subLabel}</div>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
