import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Link2,
  RefreshCw,
  Search,
  Sprout,
  ExternalLink,
} from "lucide-react";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { isApiErrorResponse } from "network/core/responseParser";
import SubtypeSeedLinkDialog from "./components/SubtypeSeedLinkDialog";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const statusBadge = (status) => {
  if (status === "linked") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        Seed + Agri linked
      </span>
    );
  }
  if (status === "seed_only") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Seed only · Agri pending
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      No seed linked
    </span>
  );
};

function SubtypeRow({ plant, row, onLinkSubtype }) {
  const primary = row.products[0] || null;
  const agriFromProduct = primary?.agriLink?.linked ? primary.agriLink : null;
  const sourceLabel = primary
    ? agriFromProduct
      ? "Ram Agri Input"
      : "Ram Biotech"
    : null;

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50/80">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.subtypeName}</td>
      <td className="px-4 py-3">{statusBadge(row.linkStatus)}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{sourceLabel || "—"}</td>
      <td className="px-4 py-3 text-sm">
        {primary ? (
          <div className="text-xs">
            <span className="font-mono font-medium text-gray-800">{primary.code}</span>
            <span className="text-gray-500"> · {primary.name}</span>
            <p className="text-gray-500 mt-0.5">Biotech stock {fmt(primary.currentStock)}</p>
          </div>
        ) : (
          <span className="text-xs text-gray-400">No seed assigned</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {agriFromProduct ? (
          <div className="text-xs text-violet-900">
            {agriFromProduct.cropName} · {agriFromProduct.varietyName}
            <p className="text-gray-500 mt-0.5">Agri stock {fmt(agriFromProduct.agriStock)}</p>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() =>
            onLinkSubtype({
              plantId: plant.plantId,
              plantName: plant.plantName,
              subtypeId: row.subtypeId,
              subtypeName: row.subtypeName,
              products: row.products,
            })
          }
          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-100"
        >
          <Link2 className="h-3.5 w-3.5" />
          {primary ? "Edit seed link" : "Link seed"}
        </button>
      </td>
    </tr>
  );
}

export default function SeedDualInventoryLinks() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [expandedPlants, setExpandedPlants] = useState({});
  const [linkContext, setLinkContext] = useState(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await NetworkManager(API.INVENTORY.GET_SEED_DUAL_LINKS).request(
        {},
        {
          ...(unlinkedOnly ? { unlinkedOnly: "true" } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        }
      );
      if (isApiErrorResponse(res)) {
        Toast.error(res.message || "Failed to load");
        return;
      }
      setData(res?.data?.data ?? res?.data);
    } catch (e) {
      Toast.error("Failed to load seed links");
    } finally {
      setLoading(false);
    }
  }, [unlinkedOnly, search]);

  useEffect(() => {
    const t = setTimeout(fetchLinks, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchLinks, search]);

  const summary = data?.summary || {};
  const plants = data?.plants || [];
  const togglePlant = (id) => setExpandedPlants((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate("/u/inventory")} className="rounded-lg p-2 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Subtype → Seed Links</h1>
              <p className="text-sm text-gray-600">
                Sowing plants & subtypes — assign Biotech seed + Ram Agri variety
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/u/inventory/ram-agri-inputs-master")}
              className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800"
            >
              Ram Agri Master <ExternalLink className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/u/inventory/biotech-seed-master")}
              className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800"
            >
              Biotech Master <ExternalLink className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={fetchLinks}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
          Each plant subtype can have <strong>only one seed</strong> — from Ram Biotech or Ram Agri Input
          (not multiple). Click <strong>Link seed</strong> to assign or replace it.
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Sowing plants</p>
            <p className="text-2xl font-bold">{summary.totalPlants ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Subtype rows</p>
            <p className="text-2xl font-bold">{summary.totalSubtypeRows ?? 0}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs text-emerald-700">Fully linked</p>
            <p className="text-2xl font-bold text-emerald-900">{summary.linkedRows ?? 0}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-800">Needs seed / Agri link</p>
            <p className="text-2xl font-bold text-amber-900">{summary.unlinkedRows ?? 0}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plant or subtype…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={unlinkedOnly}
              onChange={(e) => setUnlinkedOnly(e.target.checked)}
              className="rounded border-gray-300 text-brand-600"
            />
            Show subtypes needing link only
          </label>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-24">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand-600" />
          </div>
        ) : plants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-500">
            No plant subtypes match your filters
          </div>
        ) : (
          plants.map((plant) => {
            const open = expandedPlants[plant.plantId] !== false;
            return (
              <div key={plant.plantId} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => togglePlant(plant.plantId)}
                  className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                >
                  {open ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronRight className="h-5 w-5 text-gray-500" />}
                  <Sprout className="h-5 w-5 text-brand-600" />
                  <span className="font-semibold text-gray-900">{plant.plantName}</span>
                  <span className="text-xs text-gray-500">
                    {plant.subtypes.length} subtypes · {plant.linkedCount} fully linked
                  </span>
                </button>
                {open && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Subtype</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Source</th>
                          <th className="px-4 py-2 text-left">Linked seed</th>
                          <th className="px-4 py-2 text-left">Ram Agri variety</th>
                          <th className="px-4 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plant.subtypes.map((st) => (
                          <SubtypeRow key={st.subtypeId} plant={plant} row={st} onLinkSubtype={setLinkContext} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <SubtypeSeedLinkDialog
        open={Boolean(linkContext)}
        context={linkContext}
        onClose={() => setLinkContext(null)}
        onSaved={fetchLinks}
      />
    </div>
  );
}
