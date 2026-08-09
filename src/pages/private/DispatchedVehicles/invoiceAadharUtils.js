import { getFarmerFromOrder } from "shared/dispatch-documents/challanUtils";
import { formatAadharDisplay } from "shared/dispatch-documents/invoicePlantConfig";

export function getOrderInvoiceKey(order) {
  return String(order?._id ?? order?.details?.orderid ?? "");
}

export function listInvoiceOrders(dispatch) {
  return (dispatch?.orderIds || [])
    .map((order) => {
      const orderKey = getOrderInvoiceKey(order);
      const farmer = getFarmerFromOrder(order);
      const orderNo = order?.order ?? order?.orderId ?? order?.details?.orderid ?? "—";
      return {
        orderKey,
        orderNo,
        farmerName: farmer?.name || order?.farmerName || "—",
        defaultAadhar: formatAadharDisplay(farmer, order),
        dealerOrder: Boolean(order?.dealerOrder || order?.details?.dealerOrder),
      };
    })
    .filter((row) => row.orderKey);
}

export function buildDefaultAadharMap(dispatch) {
  const map = {};
  for (const row of listInvoiceOrders(dispatch)) {
    if (row.defaultAadhar) map[row.orderKey] = row.defaultAadhar;
  }
  return map;
}
