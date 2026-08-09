import React from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, CheckCircle } from 'lucide-react';
import {
  formatDateToDDMMYYYY,
  isReadyPlantsCategory,
  parseDateFromDDMMYYYY,
} from './poFormUtils';

export default function PoReadyPlantsCell({
  item,
  index,
  product,
  plants,
  subtypes,
  loadingSubtypes,
  updateOrderItem,
  loadSubtypes,
  setSubtypes,
}) {
  const autoReady = product && isReadyPlantsCategory(product.category);

  if (autoReady) {
    return (
      <div className="space-y-1.5 min-w-[180px]">
        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-semibold border border-sky-100">
          <Calendar className="w-3 h-3" /> Ready plants
        </div>
        <DatePair
          item={item}
          index={index}
          updateOrderItem={updateOrderItem}
          required
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5 min-w-[200px]">
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={!!item.isReadyPlantsProduct}
          onChange={(e) => {
            const isReady = e.target.checked;
            updateOrderItem(index, 'isReadyPlantsProduct', isReady);
            if (!isReady) {
              updateOrderItem(index, 'dateRange', { startDate: '', endDate: '' });
              updateOrderItem(index, 'displayTitle', '');
              updateOrderItem(index, 'plantId', '');
              updateOrderItem(index, 'subtypeId', '');
            }
          }}
          className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600"
        />
        <span className="text-xs text-slate-700">Mark ready plants</span>
      </label>

      {item.isReadyPlantsProduct ? (
        <div className="p-2 rounded-lg bg-sky-50/80 border border-sky-100 space-y-1.5">
          <select
            value={item.plantId || ''}
            onChange={(e) => {
              const plantId = e.target.value;
              updateOrderItem(index, 'plantId', plantId);
              updateOrderItem(index, 'subtypeId', '');
              if (plantId) loadSubtypes(plantId, index);
              else setSubtypes((prev) => ({ ...prev, [index]: [] }));
            }}
            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
            required
          >
            <option value="">Plant *</option>
            {plants.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {item.plantId ? (
            <select
              value={item.subtypeId || ''}
              onChange={(e) => updateOrderItem(index, 'subtypeId', e.target.value)}
              disabled={loadingSubtypes[index]}
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
              required
            >
              <option value="">
                {loadingSubtypes[index] ? 'Loading…' : 'Subtype *'}
              </option>
              {(subtypes[index] || []).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : null}

          {item.plantId && item.subtypeId ? (
            <>
              <input
                type="text"
                value={item.displayTitle || ''}
                onChange={(e) => updateOrderItem(index, 'displayTitle', e.target.value)}
                placeholder="Display title *"
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
                required
              />
              <DatePair item={item} index={index} updateOrderItem={updateOrderItem} required />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DatePair({ item, index, updateOrderItem, required }) {
  const start = parseDateFromDDMMYYYY(item.dateRange?.startDate);
  const end = parseDateFromDDMMYYYY(item.dateRange?.endDate);
  const dpClass =
    'w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1.5">
        <DatePicker
          selected={start}
          onChange={(date) =>
            updateOrderItem(index, 'dateRange', {
              ...item.dateRange,
              startDate: formatDateToDDMMYYYY(date),
            })
          }
          dateFormat="dd-MM-yyyy"
          placeholderText="Start *"
          minDate={new Date()}
          isClearable
          showYearDropdown
          showMonthDropdown
          dropdownMode="select"
          wrapperClassName="w-full"
          className={dpClass}
          required={required}
          withPortal
          portalId="root-portal"
        />
        <DatePicker
          selected={end}
          onChange={(date) =>
            updateOrderItem(index, 'dateRange', {
              ...item.dateRange,
              endDate: formatDateToDDMMYYYY(date),
            })
          }
          dateFormat="dd-MM-yyyy"
          placeholderText="End *"
          minDate={start || new Date()}
          isClearable
          showYearDropdown
          showMonthDropdown
          dropdownMode="select"
          wrapperClassName="w-full"
          className={dpClass}
          required={required}
          withPortal
          portalId="root-portal"
        />
      </div>
      {item.dateRange?.startDate && item.dateRange?.endDate ? (
        <div className="text-[10px] text-emerald-700 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {item.dateRange.startDate} → {item.dateRange.endDate}
        </div>
      ) : null}
    </div>
  );
}
