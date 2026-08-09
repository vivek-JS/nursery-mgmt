import React from 'react';

/**
 * Crop / variety / unit selectors for Ram Agri PO line items.
 */
export default function RamAgriPoLineFields({
  item,
  index,
  ramAgriCrops,
  units,
  updateOrderItem,
}) {
  const crop = ramAgriCrops.find((c) => c._id === item.ramAgriCropId);
  const variety = crop?.varieties?.find((v) => v._id === item.ramAgriVarietyId);

  const primaryUnit =
    variety?.primaryUnit && typeof variety.primaryUnit === 'object'
      ? variety.primaryUnit
      : units.find((u) => u._id === (variety?.primaryUnit?._id || variety?.primaryUnit));
  const secondaryUnit =
    variety?.secondaryUnit && typeof variety.secondaryUnit === 'object'
      ? variety.secondaryUnit
      : units.find((u) => u._id === (variety?.secondaryUnit?._id || variety?.secondaryUnit));

  const handleCropChange = (cropId) => {
    const selected = ramAgriCrops.find((c) => c._id === cropId);
    updateOrderItem(index, 'ramAgriCropId', cropId);
    updateOrderItem(index, 'ramAgriCropName', selected?.cropName || '');
    updateOrderItem(index, 'ramAgriVarietyId', '');
    updateOrderItem(index, 'ramAgriVarietyName', '');
    updateOrderItem(index, 'productId', '');
  };

  const handleVarietyChange = (varietyId) => {
    const v = crop?.varieties?.find((x) => x._id === varietyId);
    updateOrderItem(index, 'ramAgriVarietyId', varietyId);
    updateOrderItem(index, 'ramAgriVarietyName', v?.name || '');
    updateOrderItem(index, 'conversionFactor', v?.conversionFactor || 1);
    updateOrderItem(index, 'rate', v?.purchasePrice || v?.defaultRate || item.rate || 0);
    const uid =
      (v?.primaryUnit &&
        (typeof v.primaryUnit === 'object' ? v.primaryUnit._id : v.primaryUnit)) ||
      units.find((u) => u.abbreviation === 'pks' || u.name === 'Pkt')?._id ||
      units.find((u) => u.name === 'Seeds')?._id ||
      '';
    if (uid) {
      updateOrderItem(index, 'unitId', uid);
      updateOrderItem(index, 'selectedUnitType', 'primary');
    }
  };

  return (
    <div className="space-y-2 min-w-[220px]">
      <select
        value={item.ramAgriCropId || ''}
        onChange={(e) => handleCropChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      >
        <option value="">Select crop</option>
        {ramAgriCrops.map((c) => (
          <option key={c._id} value={c._id}>
            {c.cropName}
          </option>
        ))}
      </select>
      <select
        value={item.ramAgriVarietyId || ''}
        onChange={(e) => handleVarietyChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
        disabled={!item.ramAgriCropId}
      >
        <option value="">Select variety (subtype)</option>
        {(crop?.varieties || [])
          .filter((v) => v.isActive !== false)
          .map((v) => (
            <option key={v._id} value={v._id}>
              {v.name}
            </option>
          ))}
      </select>
      {variety && secondaryUnit && variety.conversionFactor > 1 && (
        <select
          value={item.selectedUnitType || 'primary'}
          onChange={(e) => updateOrderItem(index, 'selectedUnitType', e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-purple-200 rounded-lg bg-purple-50"
        >
          <option value="primary">
            {primaryUnit?.name || 'Primary'} ({primaryUnit?.abbreviation})
          </option>
          <option value="secondary">
            {secondaryUnit?.name || 'Secondary'} ({secondaryUnit?.abbreviation})
          </option>
        </select>
      )}
      {variety && !primaryUnit && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          No unit on variety — using default Pkt for this PO. Update unit in Ram Agri Master.
        </p>
      )}
      {variety && primaryUnit && (
        <p className="text-xs text-gray-500">
          Unit: {primaryUnit.name} ({primaryUnit.abbreviation})
          {secondaryUnit && variety.conversionFactor > 1
            ? ` · 1 ${primaryUnit.abbreviation} = ${variety.conversionFactor} ${secondaryUnit.abbreviation}`
            : ''}
        </p>
      )}
    </div>
  );
}
