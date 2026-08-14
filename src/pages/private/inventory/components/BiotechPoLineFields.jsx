import React from 'react';

/**
 * Plant → variety selectors for Biotech Seed Product Master PO lines.
 * Sets productId from variety.inventoryLink (linked inventory Product).
 */
export default function BiotechPoLineFields({
  item,
  index,
  biotechPlants = [],
  updateOrderItem,
}) {
  const plant = biotechPlants.find((p) => String(p._id) === String(item.biotechPlantId || ''));
  const varieties = (plant?.varieties || []).filter(
    (v) => v.isActive !== false && (v.inventoryLink?.productId || v.linkedInventoryProductId)
  );
  const variety = varieties.find((v) => String(v._id) === String(item.biotechVarietyId || ''));
  const stock = Number(variety?.inventoryLink?.currentStock) || 0;
  const unit =
    (typeof variety?.inventoryLink?.primaryUnit === 'object' &&
      (variety.inventoryLink.primaryUnit?.abbreviation ||
        variety.inventoryLink.primaryUnit?.name)) ||
    '';

  const selectablePlants = biotechPlants.filter((p) =>
    (p.varieties || []).some(
      (v) =>
        v.isActive !== false &&
        (v.inventoryLink?.productId || v.linkedInventoryProductId)
    )
  );

  const handlePlantChange = (plantId) => {
    const selected = biotechPlants.find((p) => String(p._id) === String(plantId));
    updateOrderItem(index, 'biotechPlantId', plantId);
    updateOrderItem(index, 'biotechPlantName', selected?.plantName || '');
    updateOrderItem(index, 'biotechVarietyId', '');
    updateOrderItem(index, 'biotechVarietyName', '');
    updateOrderItem(index, 'productId', '');
  };

  const handleVarietyChange = (varietyId) => {
    const v = plant?.varieties?.find((x) => String(x._id) === String(varietyId));
    const productId = v?.inventoryLink?.productId || v?.linkedInventoryProductId || '';
    const unit =
      v?.inventoryLink?.primaryUnit ||
      v?.primaryUnit ||
      null;
    const unitId =
      unit && typeof unit === 'object' ? unit._id : unit || '';
    updateOrderItem(index, 'biotechVarietyId', varietyId);
    updateOrderItem(index, 'biotechVarietyName', v?.name || '');
    updateOrderItem(index, 'productId', productId ? String(productId) : '');
    updateOrderItem(
      index,
      'conversionFactor',
      v?.inventoryLink?.conversionFactor || v?.conversionFactor || 1
    );
    if (unitId) {
      updateOrderItem(index, 'unitId', String(unitId));
      updateOrderItem(index, 'selectedUnitType', 'primary');
    }
  };

  return (
    <div className="space-y-2 min-w-[220px]">
      <select
        value={item.biotechPlantId || ''}
        onChange={(e) => handlePlantChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        required
      >
        <option value="">Select plant (Biotech Master)</option>
        {selectablePlants.map((p) => (
          <option key={p._id} value={p._id}>
            {p.plantName}
          </option>
        ))}
      </select>
      <select
        value={item.biotechVarietyId || ''}
        onChange={(e) => handleVarietyChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        required
        disabled={!item.biotechPlantId}
      >
        <option value="">Select variety</option>
        {varieties.map((v) => (
          <option key={v._id} value={v._id}>
            {v.name}
            {v.inventoryLink?.productCode ? ` · ${v.inventoryLink.productCode}` : ''}
          </option>
        ))}
      </select>
      {selectablePlants.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          No Biotech Master varieties linked to inventory yet. Add varieties in Biotech Seed Product Master.
        </p>
      )}
      {item.biotechPlantId && varieties.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          No linked inventory varieties for this plant. Add variety in Biotech Seed Product Master.
        </p>
      )}
      {variety?.inventoryLink?.linked && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px]">
          <span className="font-semibold text-blue-900">Stock: </span>
          <span className="font-bold tabular-nums text-blue-800">
            {stock.toLocaleString('en-IN')}
            {unit ? ` ${unit}` : ''}
          </span>
          {variety.inventoryLink.productCode ? (
            <span className="text-blue-700"> · {variety.inventoryLink.productCode}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
