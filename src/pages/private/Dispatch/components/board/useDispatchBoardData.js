import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import { API, NetworkManager } from "network/core";
import { isApiErrorResponse } from "network/core/responseParser";
import { Toast } from "helpers/toasts/toastHelper";
import { toYmd } from "../../../DispatchedVehicles/dispatchVehiclesUtils";
import {
  buildCallingParams,
  defaultCallingFilters,
  extractList,
  extractOrderPage,
  isOpenDispatch,
  orderMongoId,
} from "./orderBoardUtils";

const PAGE_LIMIT = 40;
const MAX_PAGES = 4;

function mergeOrders(prev, incoming) {
  const map = new Map();
  prev.forEach((order) => {
    const id = orderMongoId(order);
    if (id) map.set(id, order);
  });
  incoming.forEach((order) => {
    const id = orderMongoId(order);
    if (id) map.set(id, order);
  });
  return [...map.values()];
}

async function fetchOrderPage(params, abortScope, page) {
  const instance = NetworkManager(API.ORDER.GET_ORDERS, false, { abortScope });
  const response = await instance.request({}, { ...params, page, limit: PAGE_LIMIT });
  if (response?.aborted) return { aborted: true, rows: [], totalPages: 1 };
  const parsed = extractOrderPage(response);
  return { aborted: false, rows: parsed.rows, totalPages: parsed.totalPages };
}

async function fetchTodayDispatches() {
  const ymd = toYmd(new Date());
  const rows = [];
  let page = 1;
  let more = true;
  while (more && page <= 4) {
    const instance = NetworkManager(API.DISPATCHED.GET_TRAYS);
    const response = await instance.request(
      {},
      { paged: "1", page, limit: 50, ledger: "new", startDate: ymd, endDate: ymd }
    );
    const batch = extractList(response);
    rows.push(...batch);
    const pages = Number(response?.data?.pagination?.pages);
    more = Number.isFinite(pages) && pages > 0 ? page < pages : batch.length === 50;
    page += 1;
  }
  return rows.filter(isOpenDispatch);
}

export default function useDispatchBoardData() {
  const [callingOrders, setCallingOrders] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [openDispatches, setOpenDispatches] = useState([]);
  const [callingFilters, setCallingFilters] = useState(defaultCallingFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [callingLoading, setCallingLoading] = useState(true);
  const [readyLoading, setReadyLoading] = useState(true);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [markingIds, setMarkingIds] = useState(() => new Set());
  const [savingQtyId, setSavingQtyId] = useState("");
  const loadSeq = useRef(0);
  const callingSeq = useRef(0);
  const callingFiltersRef = useRef(defaultCallingFilters());

  const loadOrders = useCallback(async (seq, params, abortScope, accept, setOrders, setLoadingFlag) => {
    setLoadingFlag(true);
    try {
      const first = await fetchOrderPage(params, abortScope, 1);
      if (loadSeq.current !== seq || first.aborted) return;
      setOrders(accept(first.rows));
      setLoadingFlag(false);
      const pages = Math.min(first.totalPages || 1, MAX_PAGES);
      for (let page = 2; page <= pages; page += 1) {
        const next = await fetchOrderPage(params, abortScope, page);
        if (loadSeq.current !== seq || next.aborted) return;
        if (!next.rows.length) break;
        setOrders((prev) => mergeOrders(prev, accept(next.rows)));
      }
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return;
      console.error("[DispatchBoard] orders load failed", error);
      Toast.error(error?.response?.data?.message || "Could not load orders");
    } finally {
      if (loadSeq.current === seq) setLoadingFlag(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(String(callingFilters.search || "").trim()), 400);
    return () => clearTimeout(timer);
  }, [callingFilters.search]);

  const activeCallingFilters = useMemo(
    () => ({ ...callingFilters, search: debouncedSearch }),
    [callingFilters, debouncedSearch]
  );
  callingFiltersRef.current = activeCallingFilters;
  const callingFiltersKey = JSON.stringify(activeCallingFilters);

  const loadCalling = useCallback(async () => {
    const seq = callingSeq.current + 1;
    callingSeq.current = seq;
    const filters = callingFiltersRef.current;
    const accept = (rows) =>
      rows.filter((order) => {
        const status = String(order?.orderStatus || "").toUpperCase();
        if (filters.farmReadyOnly) return status === "FARM_READY";
        return status === "ACCEPTED" || status === "FARM_READY";
      });
    const windowParams = buildCallingParams(filters, { includePastDue: false });
    const wantPastDue = Boolean(filters.includePastDue) && !String(filters.search || "").trim();
    setCallingOrders([]);
    setCallingLoading(true);
    try {
      const first = await fetchOrderPage(windowParams, "dispatch-board-calling", 1);
      if (callingSeq.current !== seq || first.aborted) return;
      setCallingOrders(accept(first.rows));
      setCallingLoading(false);
      const windowPages = Math.min(first.totalPages || 1, MAX_PAGES);
      for (let page = 2; page <= windowPages; page += 1) {
        const next = await fetchOrderPage(windowParams, "dispatch-board-calling", page);
        if (callingSeq.current !== seq || next.aborted || !next.rows.length) break;
        setCallingOrders((prev) => mergeOrders(prev, accept(next.rows)));
      }
      if (!wantPastDue || callingSeq.current !== seq) return;
      const pastParams = buildCallingParams(filters, { includePastDue: true });
      const pastFirst = await fetchOrderPage(pastParams, "dispatch-board-calling-due", 1);
      if (callingSeq.current !== seq || pastFirst.aborted) return;
      setCallingOrders((prev) => mergeOrders(prev, accept(pastFirst.rows)));
      const pastPages = Math.min(pastFirst.totalPages || 1, MAX_PAGES);
      for (let page = 2; page <= pastPages; page += 1) {
        const next = await fetchOrderPage(pastParams, "dispatch-board-calling-due", page);
        if (callingSeq.current !== seq || next.aborted || !next.rows.length) break;
        setCallingOrders((prev) => mergeOrders(prev, accept(next.rows)));
      }
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return;
      console.error("[DispatchBoard] calling list failed", error);
      Toast.error(error?.response?.data?.message || "Could not load the calling list");
    } finally {
      if (callingSeq.current === seq) setCallingLoading(false);
    }
  }, []);

  const callingFiltersReady = useRef(false);
  useEffect(() => {
    if (!callingFiltersReady.current) {
      callingFiltersReady.current = true;
      return;
    }
    loadCalling();
  }, [callingFiltersKey, loadCalling]);

  const patchCallingFilters = useCallback((patch) => {
    setCallingFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const load = useCallback(async () => {
    const seq = loadSeq.current + 1;
    loadSeq.current = seq;
    const fleetTask = (async () => {
      setFleetLoading(true);
      try {
        const [vehicleRes, dispatches] = await Promise.all([
          NetworkManager(API.VEHICLE.GET_ACTIVE_VEHICLES).request({}, {}),
          fetchTodayDispatches(),
        ]);
        if (loadSeq.current !== seq) return;
        setVehicles(extractList(vehicleRes));
        setOpenDispatches(dispatches);
      } catch (error) {
        if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return;
        console.error("[DispatchBoard] fleet load failed", error);
      } finally {
        if (loadSeq.current === seq) setFleetLoading(false);
      }
    })();
    await Promise.all([
      loadCalling(),
      loadOrders(
        seq,
        { dispatched: false, ready_for_dispatch: "true" },
        "dispatch-board-ready",
        (rows) =>
          rows.filter((order) => String(order?.orderStatus || "").toUpperCase() === "READY_FOR_DISPATCH"),
        setReadyOrders,
        setReadyLoading
      ),
      fleetTask,
    ]);
  }, [loadCalling, loadOrders]);

  useEffect(() => {
    load();
  }, [load]);

  const markReady = useCallback(async (orders, dispatchDayKey) => {
    const list = (Array.isArray(orders) ? orders : [orders]).filter(Boolean);
    if (!list.length) return false;
    if (!dispatchDayKey) {
      Toast.error("Please select Aaj / Udya / Parva");
      return false;
    }
    const ids = list.map(orderMongoId).filter(Boolean);
    setMarkingIds((prev) => new Set([...prev, ...ids]));
    let ok = 0;
    try {
      for (const order of list) {
        const id = orderMongoId(order);
        if (!id) continue;
        const instance = NetworkManager(API.ORDER.UPDATE_ORDER);
        const response = await instance.request({
          id,
          orderStatus: "READY_FOR_DISPATCH",
          dispatchDayKey,
        });
        if (isApiErrorResponse(response) || response?.success === false) {
          throw new Error(response?.message || response?.data?.message || "Failed to mark ready");
        }
        ok += 1;
      }
      Toast.success(ok === 1 ? "Marked ready for dispatch" : `${ok} orders marked ready`);
      await load();
      return true;
    } catch (error) {
      console.error("[DispatchBoard] mark ready failed", error);
      Toast.error(error?.response?.data?.message || error?.message || "Failed to mark ready");
      if (ok > 0) await load();
      return false;
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [load]);

  const updatePlantCount = useCallback(async (order, numberOfPlants) => {
    const id = orderMongoId(order);
    const qty = Number(numberOfPlants);
    if (!id) return false;
    if (!Number.isFinite(qty) || qty <= 0) {
      Toast.error("Quantity must be greater than 0");
      return false;
    }
    setSavingQtyId(id);
    try {
      const instance = NetworkManager(API.ORDER.UPDATE_ORDER);
      const response = await instance.request({ id, numberOfPlants: qty });
      if (isApiErrorResponse(response) || response?.success === false) {
        throw new Error(response?.message || response?.data?.message || "Failed to update quantity");
      }
      setReadyOrders((prev) =>
        prev.map((row) => (orderMongoId(row) === id ? { ...row, numberOfPlants: qty } : row))
      );
      Toast.success("Plant count updated");
      return true;
    } catch (error) {
      console.error("[DispatchBoard] quantity update failed", error);
      Toast.error(error?.response?.data?.message || error?.message || "Failed to update quantity");
      return false;
    } finally {
      setSavingQtyId("");
    }
  }, []);

  return {
    callingOrders,
    callingFilters,
    patchCallingFilters,
    readyOrders,
    vehicles,
    openDispatches,
    callingLoading,
    readyLoading,
    fleetLoading,
    markingIds,
    savingQtyId,
    refresh: load,
    markReady,
    updatePlantCount,
    todayLabel: moment().format("D MMM"),
  };
}
