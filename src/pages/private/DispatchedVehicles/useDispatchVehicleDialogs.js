import { useCallback, useState } from "react";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import {
  mergeDispatchWithFreshDetail,
  parseDispatchFromGetByIdResponse,
  transformDataToMap,
  transformDispatchForForm,
  transformGetDispatchToMap,
} from "./dispatchFormHelpers";

export function useDispatchVehicleDialogs({ onRefresh }) {
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCollectSlipOpen, setIsCollectSlipOpen] = useState(false);
  const [isDcOpen, setIsDcOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceAadharByOrderId, setInvoiceAadharByOrderId] = useState({});
  const [isOrderCompleteOpen, setIsOrderCompleteOpen] = useState(false);

  const dialogBusy =
    isFormOpen || isCollectSlipOpen || isDcOpen || isInvoiceOpen || isOrderCompleteOpen;

  const fetchFresh = useCallback(async (dispatch) => {
    try {
      const inst = NetworkManager(API.DISPATCHED.GET_BY_ID);
      const res = await inst.request({}, [String(dispatch._id)]);
      const d = parseDispatchFromGetByIdResponse(res);
      return d?._id ? mergeDispatchWithFreshDetail(dispatch, d) : dispatch;
    } catch {
      return dispatch;
    }
  }, []);

  const closeAll = useCallback(() => {
    setIsFormOpen(false);
    setIsCollectSlipOpen(false);
    setIsDcOpen(false);
    setIsInvoiceOpen(false);
    setInvoiceAadharByOrderId({});
    setIsOrderCompleteOpen(false);
    setSelectedDispatch(null);
    setSelectedOrders(null);
  }, []);

  const openForm = useCallback(
    async (dispatch) => {
      if (dialogBusy) return;
      try {
        const inst = NetworkManager(API.DISPATCHED.GET_BY_ID);
        const res = await inst.request({}, [String(dispatch._id)]);
        const raw = res?.data?.data ?? res?.data;
        const d = raw && raw._id ? raw : raw?.data;
        const merged = d?._id ? mergeDispatchWithFreshDetail(dispatch, d) : dispatch;
        setSelectedDispatch(transformDispatchForForm(merged));
        setSelectedOrders(d?._id ? transformGetDispatchToMap(d) : transformDataToMap(merged));
        setIsFormOpen(true);
      } catch (err) {
        console.error(err);
        setSelectedDispatch(transformDispatchForForm(dispatch));
        setSelectedOrders(transformDataToMap(dispatch));
        setIsFormOpen(true);
      }
    },
    [dialogBusy]
  );

  const openCollectSlip = useCallback(
    async (dispatch) => {
      if (dialogBusy) return;
      const merged = await fetchFresh(dispatch);
      setSelectedDispatch(transformDispatchForForm(merged));
      setIsCollectSlipOpen(true);
    },
    [dialogBusy, fetchFresh]
  );

  const openDc = useCallback(
    async (dispatch) => {
      if (dialogBusy) return;
      const merged = await fetchFresh(dispatch);
      setSelectedDispatch(merged);
      setIsDcOpen(true);
    },
    [dialogBusy, fetchFresh]
  );

  const openInvoice = useCallback(
    async (dispatch, aadharByOrderId = {}) => {
      if (dialogBusy) return;
      const merged = await fetchFresh(dispatch);
      setInvoiceAadharByOrderId(aadharByOrderId || {});
      setSelectedDispatch(merged);
      setIsInvoiceOpen(true);
    },
    [dialogBusy, fetchFresh]
  );

  const openCompleteOrder = useCallback(
    (dispatch) => {
      if (dialogBusy) return;
      const incomplete = (dispatch.orderIds || []).filter((order) => {
        const dispatchDetail = dispatch.orderDispatchDetails?.find(
          (detail) => detail.orderId?.toString() === order._id?.toString()
        );
        const dispatchedQty =
          dispatchDetail?.dispatchQuantity ||
          (dispatch.plantsDetails?.reduce((sum, plant) => sum + (plant.quantity || 0), 0) /
            Math.max(1, dispatch.orderIds?.length || 1)) ||
          0;
        const dispatchedAmount = dispatchedQty * (order.rate || 0);
        const totalPaid = order["Paid Amt"] || 0;
        return totalPaid < dispatchedAmount;
      });
      if (incomplete.length > 0) {
        const errorMessage = incomplete
          .map((order) => {
            const dispatchDetail = dispatch.orderDispatchDetails?.find(
              (detail) => detail.orderId?.toString() === order._id?.toString()
            );
            const dispatchedQty =
              dispatchDetail?.dispatchQuantity ||
              (dispatch.plantsDetails?.reduce((sum, plant) => sum + (plant.quantity || 0), 0) /
                Math.max(1, dispatch.orderIds?.length || 1)) ||
              0;
            const dispatchedAmount = dispatchedQty * (order.rate || 0);
            return `Order #${order.order} - ${order.farmerName}: ₹${order["Paid Amt"] || 0} paid, ₹${dispatchedAmount} required`;
          })
          .join("\n");
        Toast.error(`Cannot complete — pending payments:\n${errorMessage}`);
        return;
      }
      setSelectedDispatch(dispatch);
      setIsOrderCompleteOpen(true);
    },
    [dialogBusy]
  );

  const deleteDispatch = useCallback(
    async (dispatch) => {
      if (
        !window.confirm(
          "Remove this transport and restore orders to farm ready queue? This cannot be undone."
        )
      ) {
        return;
      }
      try {
        const inst = NetworkManager(API.DISPATCHED.DELETE_TRANSPORT);
        await inst.request({}, [dispatch.transportId]);
        Toast.success("Transport removed.");
        void onRefresh?.();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dispatchCreated"));
        }
      } catch (err) {
        Toast.error(err?.response?.data?.message || err?.message || "Failed to remove transport");
      }
    },
    [onRefresh]
  );

  return {
    selectedDispatch,
    selectedOrders,
    isFormOpen,
    isCollectSlipOpen,
    isDcOpen,
    isInvoiceOpen,
    invoiceAadharByOrderId,
    isOrderCompleteOpen,
    setIsFormOpen,
    setIsCollectSlipOpen,
    setIsDcOpen,
    setIsInvoiceOpen,
    setIsOrderCompleteOpen,
    setSelectedDispatch,
    closeAll,
    openForm,
    openCollectSlip,
    openDc,
    openInvoice,
    openCompleteOrder,
    deleteDispatch,
    fetchFresh,
  };
}
