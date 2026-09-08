import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, List, Package, RefreshCw, Search, Truck, User } from "lucide-react";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import DispatchAccordion from "../dashboard/DispatchAccordion";
import DispatchForm from "../dashboard/DispatchedForm";
import DeliveryChallanPDF from "../dashboard/DeliveryChallan";
import RamBiotechInvoicePDF from "../dashboard/RamBiotechInvoicePDF";
import CollectSlipPDF from "../dashboard/CollectSlipPDF";
import OrderCompleteDialog from "../dashboard/OrderCompleteDialog";
import DispatchedVehiclesTable from "./DispatchedVehiclesTable";
import DispatchedVehiclesStats from "./DispatchedVehiclesStats";
import DispatchDateFilter from "./DispatchDateFilter";
import { useDispatchVehicleDialogs } from "./useDispatchVehicleDialogs";
import { useInvoiceAadharPrompt } from "./useInvoiceAadharPrompt";
import { useDuplicateInvoicePrompt } from "./useDuplicateInvoicePrompt";
import {
  runDeliveryChallanFlow,
  runInvoiceFlow,
} from "./dispatchDocumentActions";
import {
  STATUS_TABS,
  computeDispatchStats,
  collectDispatchSearchHits,
  resolveDatePresetRange,
  groupDispatchesByDate,
} from "./dispatchVehiclesUtils";

const PAGE_SIZE = 20;
/** Default to Today so first paint is small + fast (was last7). */
const DEFAULT_DATE_PRESET = "today";

export default function DispatchedVehiclesPage() {
  const initialRange = resolveDatePresetRange(DEFAULT_DATE_PRESET);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusTab, setStatusTab] = useState("ALL");
  const [datePreset, setDatePreset] = useState(DEFAULT_DATE_PRESET);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [viewMode, setViewMode] = useState("table");
  const [pdfBusyId, setPdfBusyId] = useState(null);
  const pageRef = useRef(1);
  const loadMoreInFlightRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadPage = useCallback(
    async (page) => {
      const inst = NetworkManager(API.DISPATCHED.GET_TRAYS);
      const query = { paged: "1", page, limit: PAGE_SIZE };
      if (debouncedSearch) query.search = debouncedSearch;
      else if (startDate && endDate) {
        query.startDate = startDate;
        query.endDate = endDate;
      }
      if (statusTab !== "ALL") query.transportStatus = statusTab;
      const response = await inst.request({}, query);
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const pag = response.data?.pagination;
      const curPage = Number(pag?.page) || page;
      const totalPages = Number(pag?.pages);
      let more = true;
      if (Number.isFinite(totalPages) && totalPages > 0) {
        more = curPage < totalPages;
      } else if (Number.isFinite(Number(pag?.total))) {
        more = (curPage - 1) * PAGE_SIZE + rows.length < Number(pag.total);
      } else {
        more = rows.length >= PAGE_SIZE;
      }
      return { rows, curPage, more };
    },
    [debouncedSearch, endDate, startDate, statusTab]
  );

  const handleDatePreset = useCallback((presetId) => {
    const range = resolveDatePresetRange(presetId);
    setDatePreset(presetId);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, []);

  const handleDateRangeChange = useCallback((from, to, preset = "custom") => {
    setDatePreset(preset);
    setStartDate(from);
    setEndDate(to);
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    try {
      pageRef.current = 1;
      // List API already attaches agriLoadBlocked / agriLoadBlockedBy — no second bulk status call.
      const { rows, curPage, more } = await loadPage(1);
      pageRef.current = curPage;
      setHasMore(more);
      setDispatches(rows);
    } catch (err) {
      console.error(err);
      Toast.error("Failed to load dispatches");
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  const patchPdfFields = useCallback((dispatchId, patch) => {
    setDispatches((prev) =>
      prev.map((d) => (String(d._id) === String(dispatchId) ? { ...d, ...patch } : d))
    );
  }, []);

  const dialogs = useDispatchVehicleDialogs({ onRefresh: refreshList });
  const { prompt: promptInvoiceAadhar, dialog: invoiceAadharDialog } = useInvoiceAadharPrompt();
  const { prompt: promptDuplicateInvoice, dialog: duplicateInvoiceDialog } =
    useDuplicateInvoicePrompt();

  const handleDeliveryChallan = useCallback(
    async (dispatch) => {
      const id = String(dispatch._id);
      if (pdfBusyId === id) return;
      setPdfBusyId(id);
      try {
        await runDeliveryChallanFlow(dispatch, {
          agriLoadBlocked: Boolean(dispatch?.agriLoadBlocked),
          onOpenDcPreview: (merged) => dialogs.openDc(merged),
        });
      } finally {
        setPdfBusyId(null);
      }
    },
    [dialogs, pdfBusyId]
  );

  const handleInvoice = useCallback(
    async (dispatch, force = false) => {
      const id = String(dispatch._id);
      if (pdfBusyId === id) return;
      setPdfBusyId(id);
      try {
        await runInvoiceFlow(dispatch, {
          force,
          promptInvoiceAadhar,
          promptDuplicateInvoice,
          onPatchPdfFields: patchPdfFields,
          onOpenInvoicePreview: (merged, aadharByOrderId) =>
            dialogs.openInvoice(merged, aadharByOrderId),
          onRefresh: refreshList,
        });
      } finally {
        setPdfBusyId(null);
      }
    },
    [
      dialogs,
      patchPdfFields,
      pdfBusyId,
      promptDuplicateInvoice,
      promptInvoiceAadhar,
      refreshList,
    ]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loadMoreInFlightRef.current || loading) return;
    loadMoreInFlightRef.current = true;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const { rows, curPage, more } = await loadPage(next);
      pageRef.current = curPage;
      setHasMore(more);
      setDispatches((prev) => {
        const seen = new Set(prev.map((d) => String(d._id)));
        return [...prev, ...rows.filter((d) => !seen.has(String(d._id)))];
      });
    } catch (err) {
      console.error(err);
    } finally {
      loadMoreInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loadPage, loading, loadingMore]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const stats = useMemo(() => computeDispatchStats(dispatches), [dispatches]);
  const dateGroups = useMemo(() => groupDispatchesByDate(dispatches), [dispatches]);
  const searchActive = debouncedSearch.length >= 2;
  const searchHits = useMemo(
    () => (searchActive ? collectDispatchSearchHits(dispatches) : []),
    [dispatches, searchActive]
  );

  const scrollToDispatch = (dispatchId) => {
    const el = document.getElementById(`dispatch-accordion-${dispatchId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-teal-400", "ring-offset-2");
      window.setTimeout(() => el.classList.remove("ring-2", "ring-teal-400", "ring-offset-2"), 2400);
    }
  };

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
            <Truck size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dispatched Vehicles</h1>
            <p className="text-sm text-gray-500">
              Full dispatch management — form, documents, complete &amp; delete
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle active={viewMode} onChange={setViewMode} />
          <button
            type="button"
            onClick={() => void refreshList()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 bg-white hover:bg-gray-50"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </header>

      <DispatchedVehiclesStats stats={stats} />

      <DispatchDateFilter
        startDate={startDate}
        endDate={endDate}
        activePreset={datePreset}
        onPreset={handleDatePreset}
        onRangeChange={handleDateRangeChange}
      />

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Transport #, driver, farmer, order, mobile…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                statusTab === tab.id
                  ? "bg-green-600 text-white border-green-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {searchActive && searchHits.length > 0 ? (
        <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-3 shadow-sm">
          <p className="text-xs font-bold uppercase text-teal-800 mb-2">
            Search matches for &ldquo;{debouncedSearch}&rdquo;
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {searchHits.slice(0, 3).map((hit) => (
              <button
                key={hit.orderMongoId}
                type="button"
                onClick={() => scrollToDispatch(hit.dispatchId)}
                className="rounded-lg border border-teal-200 bg-white p-3 text-left hover:border-teal-400 hover:shadow-md transition"
              >
                <div className="flex justify-between gap-2 mb-1">
                  <span className="font-bold text-sm">#{hit.orderId}</span>
                  <span className="text-[10px] font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    T#{hit.transportId}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-800">
                  <User size={12} /> {hit.farmerName}
                </div>
                <p className="text-xs font-semibold text-blue-700 mt-1">
                  {hit.quantity.toLocaleString()} plants · ₹{hit.amount.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {viewMode === "table" ? (
        <>
          <DispatchedVehiclesTable
            dateGroups={dateGroups}
            dispatches={dispatches}
            loading={loading}
            pdfBusyId={pdfBusyId}
            onDeliveryChallan={handleDeliveryChallan}
            onInvoice={handleInvoice}
            onOpenForm={dialogs.openForm}
            onCollectSlip={dialogs.openCollectSlip}
            onCompleteOrder={dialogs.openCompleteOrder}
            onDeleteDispatch={dialogs.deleteDispatch}
          />
          <InfiniteScrollSentinel
            hasMore={hasMore}
            loadingMore={loadingMore}
            disabled={loading}
            onLoadMore={loadMore}
          />
        </>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : dispatches.length === 0 ? (
        <EmptyState search={debouncedSearch} statusTab={statusTab} startDate={startDate} endDate={endDate} />
      ) : (
        <div className="space-y-6">
          {dateGroups.map((group) => (
            <section key={group.dateKey} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-bold text-gray-800">{group.label}</h2>
                <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  {group.rows.length} vehicle{group.rows.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-4">
                {group.rows.map((dispatch) => (
                  <DispatchAccordion
                    key={dispatch._id}
                    dispatch={dispatch}
                    onRefresh={refreshList}
                    onDispatchPdfFields={patchPdfFields}
                    onViewDispatch={dialogs.openForm}
                    onCollectSlip={dialogs.openCollectSlip}
                    onDeliveryChallan={dialogs.openDc}
                    onCompleteInvoice={(dispatch, aadharByOrderId) =>
                      dialogs.openInvoice(dispatch, aadharByOrderId)
                    }
                    onCompleteOrder={dialogs.openCompleteOrder}
                    onDeleteDispatch={dialogs.deleteDispatch}
                  />
                ))}
              </div>
            </section>
          ))}
          <InfiniteScrollSentinel
            hasMore={hasMore}
            loadingMore={loadingMore}
            disabled={loading}
            onLoadMore={loadMore}
          />
        </div>
      )}

      {dialogs.isFormOpen && dialogs.selectedDispatch && (
        <DispatchForm
          open={dialogs.isFormOpen}
          onClose={() => {
            dialogs.setIsFormOpen(false);
            dialogs.setSelectedDispatch(null);
            void refreshList();
          }}
          dispatchData={dialogs.selectedDispatch}
          mode="view"
          selectedOrders={dialogs.selectedOrders}
        />
      )}

      {dialogs.isCollectSlipOpen && dialogs.selectedDispatch && (
        <CollectSlipPDF
          open={dialogs.isCollectSlipOpen}
          onClose={() => {
            dialogs.setIsCollectSlipOpen(false);
            dialogs.setSelectedDispatch(null);
          }}
          dispatchData={dialogs.selectedDispatch}
        />
      )}

      {dialogs.isDcOpen && dialogs.selectedDispatch && (
        <DeliveryChallanPDF
          open={dialogs.isDcOpen}
          onClose={() => {
            dialogs.setIsDcOpen(false);
            dialogs.setSelectedDispatch(null);
          }}
          dispatchData={dialogs.selectedDispatch}
        />
      )}

      {dialogs.isInvoiceOpen && dialogs.selectedDispatch && (
        <RamBiotechInvoicePDF
          open={dialogs.isInvoiceOpen}
          onClose={() => {
            dialogs.setIsInvoiceOpen(false);
            dialogs.setSelectedDispatch(null);
          }}
          dispatchData={dialogs.selectedDispatch}
          aadharByOrderId={dialogs.invoiceAadharByOrderId}
        />
      )}

      {invoiceAadharDialog}
      {duplicateInvoiceDialog}

      {dialogs.isOrderCompleteOpen && dialogs.selectedDispatch && (
        <OrderCompleteDialog
          open={dialogs.isOrderCompleteOpen}
          onClose={() => {
            dialogs.setIsOrderCompleteOpen(false);
            dialogs.setSelectedDispatch(null);
          }}
          dispatchData={dialogs.selectedDispatch}
          onSuccess={() => void refreshList()}
        />
      )}
    </div>
  );
}

function ViewToggle({ active, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold ${
          active === "table" ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        <List size={16} /> Table
      </button>
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold ${
          active === "cards" ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        <LayoutGrid size={16} /> Cards
      </button>
    </div>
  );
}

function InfiniteScrollSentinel({ hasMore, loadingMore, disabled = false, onLoadMore }) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || disabled) return undefined;
    const el = sentinelRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void onLoadMore?.();
        }
      },
      { root: null, rootMargin: "280px 0px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [disabled, hasMore, onLoadMore]);

  if (!hasMore && !loadingMore) {
    return (
      <p className="py-3 text-center text-xs text-gray-400">End of list</p>
    );
  }

  return (
    <div ref={sentinelRef} className="flex justify-center py-4" aria-hidden={!loadingMore}>
      {loadingMore ? (
        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          Loading more vehicles…
        </div>
      ) : (
        <span className="h-1 w-1" />
      )}
    </div>
  );
}

function EmptyState({ search, statusTab, startDate, endDate }) {
  return (
    <div className="text-center py-16 rounded-xl border border-dashed border-gray-200 bg-white">
      <Package className="mx-auto text-gray-300 mb-3" size={48} />
      <h3 className="text-lg font-semibold text-gray-800">No vehicles in this view</h3>
      <p className="text-sm text-gray-500 mt-1">
        {search
          ? `No results for "${search}".`
          : statusTab !== "ALL"
            ? `No dispatches with status ${statusTab}.`
            : startDate && endDate
              ? `No dispatches between ${startDate} and ${endDate}.`
              : "No dispatches found."}
      </p>
    </div>
  );
}
