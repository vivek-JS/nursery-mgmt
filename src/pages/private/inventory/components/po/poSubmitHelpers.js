import { isReadyPlantsCategory } from './poFormUtils';

function resolveRamAgriUnitId(item, variety, units) {
  if (item.unitId) return item.unitId;
  if (variety?.primaryUnit) {
    return typeof variety.primaryUnit === 'object'
      ? variety.primaryUnit._id
      : variety.primaryUnit;
  }
  const pkt =
    units.find((u) => u.abbreviation === 'pks' || u.name === 'Pkt') ||
    units.find((u) => u.name === 'Seeds');
  return pkt?._id || null;
}

/** Build API line payloads from form order items. */
export function buildPoItemPayloads({
  orderItems,
  products,
  ramAgriCrops,
  units = [],
  autoGRN,
  isSuperAdmin,
  hideExpiry = false,
}) {
  return orderItems.map((item) => {
    if (item.isRamAgriProduct) {
      const crop = ramAgriCrops.find((c) => c._id === item.ramAgriCropId);
      const variety = crop?.varieties?.find((v) => v._id === item.ramAgriVarietyId);
      const unitId = resolveRamAgriUnitId(item, variety, units);
      if (!unitId) {
        throw new Error(
          `Unit not found for Ram Agri variety ${item.ramAgriVarietyName}. Set primary unit in Ram Agri Master.`
        );
      }
      const itemData = {
        isRamAgriProduct: true,
        ramAgriCropId: item.ramAgriCropId,
        ramAgriVarietyId: item.ramAgriVarietyId,
        ramAgriCropName: item.ramAgriCropName || crop?.cropName,
        ramAgriVarietyName: item.ramAgriVarietyName || variety?.name,
        unit: unitId,
        quantity: item.quantity,
        rate: item.rate || 0,
        amount: (item.quantity || 0) * (item.rate || 0),
        gst: 0,
        discount: 0,
        selectedUnitType: item.selectedUnitType || 'primary',
        conversionFactor: item.conversionFactor || variety?.conversionFactor || 1,
      };
      if (autoGRN) {
        itemData.batchNumber = item.batchNumber || '';
        if (!hideExpiry) itemData.expiryDate = item.expiryDate || null;
      }
      return itemData;
    }

    const product = products.find((p) => p._id === item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    const unitId =
      typeof product.primaryUnit === 'object'
        ? product.primaryUnit?._id
        : product.primaryUnit;
    if (!unitId) throw new Error(`Product ${product.name} has no primary unit`);

    const itemData = {
      product: item.productId,
      unit: unitId,
      quantity: item.quantity,
      rate: item.rate || 0,
      amount: (item.quantity || 0) * (item.rate || 0),
      gst: 0,
      discount: 0,
    };

    if (isSuperAdmin) {
      if (item.slotId) itemData.slotId = item.slotId;
      if (item.productName) itemData.productName = item.productName;
      if (item.isReadyPlantsProduct) {
        const autoCat = isReadyPlantsCategory(product.category);
        itemData.isReadyPlantsProduct = true;
        if (autoCat) {
          const plantId =
            typeof product.plantId === 'object' ? product.plantId._id : product.plantId;
          itemData.plantId = plantId || item.plantId;
          itemData.subtypeId = product.subtypeId || item.subtypeId;
          itemData.displayTitle = product.name || item.displayTitle;
        } else {
          itemData.plantId = item.plantId;
          itemData.subtypeId = item.subtypeId;
          itemData.displayTitle = item.displayTitle;
        }
        itemData.dateRange = {
          startDate: item.dateRange.startDate,
          endDate: item.dateRange.endDate,
        };
      }
    }

    if (autoGRN) {
      itemData.batchNumber = item.batchNumber || '';
      if (!hideExpiry) itemData.expiryDate = item.expiryDate || null;
    }
    return itemData;
  });
}

/** Returns error message or null if ready-plants rows are valid (super admin). */
export function validateReadyPlantsItems(orderItems, products) {
  for (const item of orderItems) {
    if (item.isRamAgriProduct || !item.isReadyPlantsProduct) continue;
    const product = products.find((p) => p._id === item.productId);
    const autoCat = product && isReadyPlantsCategory(product.category);
    if (!autoCat) {
      if (!item.plantId) return 'Plant Type is required for ready plants products';
      if (!item.subtypeId) return 'Subtype is required for ready plants products';
      if (!item.displayTitle?.trim()) return 'Display title is required for ready plants products';
    } else {
      const productPlantId =
        typeof product.plantId === 'object' ? product.plantId?._id : product.plantId;
      if (!item.plantId && !productPlantId) {
        return `Product "${product.name}" is missing plant link.`;
      }
      if (!item.subtypeId && !product.subtypeId) {
        return `Product "${product.name}" is missing subtype link.`;
      }
      if (!item.plantId && productPlantId) item.plantId = productPlantId;
      if (!item.subtypeId && product.subtypeId) item.subtypeId = product.subtypeId;
    }
    if (!item.dateRange?.startDate || !item.dateRange?.endDate) {
      return 'Date range is required for ready plants products';
    }
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (
      !dateRegex.test(item.dateRange.startDate) ||
      !dateRegex.test(item.dateRange.endDate)
    ) {
      return 'Invalid date format. Use DD-MM-YYYY';
    }
  }
  return null;
}
