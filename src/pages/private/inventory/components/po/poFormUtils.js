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
  isBiotechProduct: false,
  biotechPlantId: '',
  biotechVarietyId: '',
  biotechPlantName: '',
  biotechVarietyName: '',
  selectedUnitType: 'primary',
  conversionFactor: 1,
  unitId: '',
  ...overrides,
});

/** Flatten linked inventory Product stubs from Biotech Seed Master plants. */
export const buildBiotechLinkedProductIndex = (biotechPlants = []) => {
  const map = new Map();
  for (const plant of biotechPlants) {
    for (const v of plant.varieties || []) {
      const link = v.inventoryLink;
      const productId = link?.productId || v.linkedInventoryProductId;
      if (!productId) continue;
      const id = String(productId);
      map.set(id, {
        _id: link?.productId || productId,
        code: link?.productCode || '',
        name: link?.productName || v.name || '',
        currentStock: link?.currentStock ?? 0,
        primaryUnit: link?.primaryUnit || v.primaryUnit || null,
        secondaryUnit: link?.secondaryUnit || v.secondaryUnit || null,
        conversionFactor: link?.conversionFactor || v.conversionFactor || 1,
        category: link?.category || 'seeds',
        plantId: link?.plantId || v.sowingPlantId || null,
        subtypeId: link?.subtypeId || v.sowingSubtypeId || null,
        biotechPlantId: plant._id,
        biotechVarietyId: v._id,
        biotechPlantName: plant.plantName || '',
        biotechVarietyName: v.name || '',
      });
    }
  }
  return map;
};

/** Resolve plant/variety ids for a linked inventory productId. */
export const resolveBiotechMasterFromProductId = (biotechPlants = [], productId) => {
  if (!productId) return null;
  const pid = String(productId);
  for (const plant of biotechPlants) {
    for (const v of plant.varieties || []) {
      const linked = String(v.inventoryLink?.productId || v.linkedInventoryProductId || '');
      if (linked && linked === pid) {
        return {
          biotechPlantId: plant._id,
          biotechVarietyId: v._id,
          biotechPlantName: plant.plantName || '',
          biotechVarietyName: v.name || '',
        };
      }
    }
  }
  return null;
};

export const productOptionLabel = (product) => {
  const plantName = getPlantName(product);
  const subtypeName = getSubtypeName(product);
  let label = `${product.name} · ${product.category || '—'}`;
  if (product.code) label = `${product.code} — ${label}`;
  if (plantName && subtypeName) label += ` · ${plantName}/${subtypeName}`;
  else if (plantName) label += ` · ${plantName}`;
  if (product.currentStock != null && product.currentStock !== '') {
    const unit =
      (typeof product.primaryUnit === 'object' &&
        (product.primaryUnit?.abbreviation || product.primaryUnit?.name)) ||
      '';
    label += ` · Stock ${Number(product.currentStock) || 0}${unit ? ` ${unit}` : ''}`;
  }
  return label;
};

export const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition';
export const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1';
