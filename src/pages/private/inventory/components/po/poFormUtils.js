/** Shared helpers for Purchase Order form */

export const parseDateFromDDMMYYYY = (dateString) => {
  if (!dateString || String(dateString).trim() === '') return null;
  const parts = String(dateString).split('-');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day);
};

export const formatDateToDDMMYYYY = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const isReadyPlantsCategory = (category) => {
  if (!category) return false;
  const normalized = String(category).toLowerCase().trim().replace(/_/g, ' ');
  return normalized === 'ready plants';
};

export const requiresSecondaryUnit = (unit) => {
  if (!unit) return false;
  if (unit.requiresSecondaryUnit === true) return true;
  const unitName = unit.name?.toLowerCase() || '';
  return ['bag', 'box', 'seeds'].includes(unitName);
};

export const getPlantName = (product) => {
  if (!product?.plantId) return null;
  if (typeof product.plantId === 'object' && product.plantId.name) return product.plantId.name;
  return null;
};

export const getSubtypeName = (product) => {
  if (!product?.plantId || !product?.subtypeId) return null;
  if (typeof product.plantId === 'object' && Array.isArray(product.plantId.subtypes)) {
    const subtype = product.plantId.subtypes.find(
      (st) => st._id === product.subtypeId || st._id?.toString() === product.subtypeId?.toString()
    );
    return subtype?.name || null;
  }
  return null;
};

export const emptyOrderItem = (overrides = {}) => ({
  productId: '',
  quantity: 1,
  secondaryQuantity: '',
  rate: 0,
  amount: 0,
  batchNumber: '',
  expiryDate: '',
  slotId: '',
  productName: '',
  isReadyPlantsProduct: false,
  dateRange: { startDate: '', endDate: '' },
  displayTitle: '',
  plantId: '',
  subtypeId: '',
  isRamAgriProduct: false,
  ramAgriCropId: '',
  ramAgriVarietyId: '',
  ramAgriCropName: '',
  ramAgriVarietyName: '',
  selectedUnitType: 'primary',
  conversionFactor: 1,
  unitId: '',
  ...overrides,
});

export const productOptionLabel = (product) => {
  const plantName = getPlantName(product);
  const subtypeName = getSubtypeName(product);
  let label = `${product.name} · ${product.category || '—'}`;
  if (product.code) label = `${product.code} — ${label}`;
  if (plantName && subtypeName) label += ` · ${plantName}/${subtypeName}`;
  else if (plantName) label += ` · ${plantName}`;
  return label;
};

export const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition';
export const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1';
