import React from 'react';
import { Trash2, Info } from 'lucide-react';
import RamAgriPoLineFields from '../RamAgriPoLineFields';
import BiotechPoLineFields from '../BiotechPoLineFields';
import {
  inputClass,
  requiresSecondaryUnit,
} from './poFormUtils';
import { formatCurrency, formatDecimal } from '../../../../../utils/numberUtils';

export default function PoLineRow({
  item,
  index,
  products,
  units,
  ramAgriCrops,
  biotechPlants = [],
  autoGRN,
  updateOrderItem,
  removeOrderItem,
}) {
  const product = products.find(
    (p) => String(p._id) === String(item.productId || '')
  );

  const primaryUnit = product
    ? typeof product.primaryUnit === 'object'
      ? product.primaryUnit
      : units.find((u) => u._id === product.primaryUnit)
    : null;
  const secondaryUnit = product?.secondaryUnit
    ? typeof product.secondaryUnit === 'object'
      ? product.secondaryUnit
      : units.find((u) => u._id === product.secondaryUnit)
    : null;
  const needsSecondary = primaryUnit && requiresSecondaryUnit(primaryUnit);
  return (
    <tr className="group hover:bg-emerald-50/30 transition-colors align-top">
      <td className="px-3 py-2.5 sticky left-0 bg-white group-hover:bg-emerald-50/40 z-[1] border-r border-slate-100 min-w-[240px]">
        {item.isRamAgriProduct ? (
          <RamAgriPoLineFields
            item={item}
            index={index}
            ramAgriCrops={ramAgriCrops}
            units={units}
            updateOrderItem={updateOrderItem}
          />
        ) : (
          <BiotechPoLineFields
            item={item}
            index={index}
            biotechPlants={biotechPlants}
            updateOrderItem={updateOrderItem}
          />
        )}
      </td>

      <td className="px-3 py-2.5 min-w-[110px]">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={item.quantity}
          onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 0)}
          required
          className={inputClass}
          placeholder="Qty"
        />
        {primaryUnit ? (
          <p className="mt-1 text-[10px] text-slate-500">
            {primaryUnit.abbreviation || primaryUnit.name}
            {secondaryUnit && product?.conversionFactor > 1 ? (
              <span className="ml-1 inline-flex items-center gap-0.5 text-violet-700">
                <Info className="w-2.5 h-2.5" />
                1={product.conversionFactor} {secondaryUnit.abbreviation}
              </span>
            ) : null}
          </p>
        ) : null}
      </td>

      <td className="px-3 py-2.5 min-w-[100px]">
        {needsSecondary ? (
          <div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.secondaryQuantity || ''}
              onChange={(e) =>
                updateOrderItem(index, 'secondaryQuantity', parseFloat(e.target.value) || '')
              }
              className={inputClass}
              placeholder="Sec qty"
            />
            {secondaryUnit ? (
              <p className="mt-1 text-[10px] text-slate-500">{secondaryUnit.abbreviation}</p>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>

      <td className="px-3 py-2.5 min-w-[100px]">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.rate}
          onChange={(e) => updateOrderItem(index, 'rate', parseFloat(e.target.value) || 0)}
          required={item.isRamAgriProduct || item.isBiotechProduct}
          className={inputClass}
          placeholder="Rate"
        />
      </td>

      {autoGRN ? (
        <td className="px-3 py-2.5 min-w-[120px]">
          <input
            type="text"
            value={item.batchNumber || ''}
            onChange={(e) => updateOrderItem(index, 'batchNumber', e.target.value)}
            placeholder="Batch / lot"
            required
            className={inputClass}
          />
        </td>
      ) : null}

      <td className="px-3 py-2.5 min-w-[130px]">
        <input
          type="date"
          value={item.expiryDate || ''}
          onChange={(e) => updateOrderItem(index, 'expiryDate', e.target.value)}
          required
          className={inputClass}
        />
      </td>

      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-sm font-semibold text-slate-800">
          {formatCurrency(formatDecimal(item.amount) || 0)}
        </span>
      </td>

      <td className="px-3 py-2.5">
        <button
          type="button"
          onClick={() => removeOrderItem(index)}
          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
          title="Remove line"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
