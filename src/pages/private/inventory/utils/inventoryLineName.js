export function inventoryLineProductName(item) {
  if (item?.product?.name) return item.product.name;
  if (item?.targetProduct?.name) return item.targetProduct.name;
  if (item?.productName) return item.productName;
  const agri = [item?.ramAgriCropName, item?.ramAgriVarietyName]
    .filter(Boolean)
    .join(' — ');
  if (agri) return agri;
  return 'N/A';
}
