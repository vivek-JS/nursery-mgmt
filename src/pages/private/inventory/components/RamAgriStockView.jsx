import React, { useMemo, useState } from "react";
import {
  Package,
  Layers,
  Boxes,
  IndianRupee,
  Search,
  Copy,
  Check,
  Download,
  MessageCircle,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sprout,
  FlaskConical,
} from "lucide-react";

const LOW_STOCK_THRESHOLD = 100;

const StatCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div
    className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${accent.border}`}
  >
    <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-20 ${accent.bg}`} />
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-gray-900 tabular-nums">{value}</p>
        {sub ? <p className="mt-0.5 text-xs text-gray-500">{sub}</p> : null}
      </div>
    </div>
  </div>
);

const SortIcon = ({ column, sortKey, sortDir }) => {
  if (sortKey !== column) return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-gray-400" />;
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1 inline h-3.5 w-3.5 text-brand-600" />
  ) : (
    <ArrowDown className="ml-1 inline h-3.5 w-3.5 text-brand-600" />
  );
};

const stockStatusOf = (qty) => {
  if (qty === 0) return "out";
  if (qty > 0 && qty < LOW_STOCK_THRESHOLD) return "low";
  return "ok";
};

const statusBadge = (status) => {
  if (status === "out") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        Out of stock
      </span>
    );
  }
  if (status === "low") {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
        Low stock
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
      In stock
    </span>
  );
};

export default function RamAgriStockView({
  stock,
  stockTypeTab,
  setStockTypeTab,
  formatNumber,
  formatCurrency,
  copied,
  exporting,
  onCopyAll,
  onExportCsv,
  onShareCrop,
}) {
  const [cropFilter, setCropFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");

  const stockByCrop = stock?.stockByCrop || [];
  const apiStockItems = stock?.stockItems;

  const cropsForTab = useMemo(() => {
    const type = stockTypeTab === "chemical" ? "chemical" : "seed";
    return stockByCrop.filter((c) => (c.productType || "seed") === type);
  }, [stockByCrop, stockTypeTab]);

  const allRows = useMemo(() => {
    if (apiStockItems?.length) {
      const type = stockTypeTab === "chemical" ? "chemical" : "seed";
      return apiStockItems.filter((r) => (r.productType || "seed") === type);
    }
    const rows = [];
    cropsForTab.forEach((crop) => {
      (crop.varieties || []).forEach((variety) => {
        rows.push({
          cropId: crop.cropId,
          cropName: crop.cropName,
          productType: crop.productType || "seed",
          varietyId: variety.varietyId,
          varietyName: variety.name,
          currentStock: variety.currentStock || 0,
          stockValue: variety.stockValue || 0,
          averagePrice: variety.averagePrice || 0,
          primaryUnit: variety.primaryUnit,
          stockUpdatedAt: variety.stockUpdatedAt,
        });
      });
    });
    return rows;
  }, [apiStockItems, cropsForTab, stockTypeTab]);

  const cropOptions = useMemo(() => {
    const map = new Map();
    allRows.forEach((r) => {
      if (!map.has(r.cropId)) map.set(r.cropId, r.cropName);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allRows]);

  const summary = useMemo(() => {
    const cropIds = new Set();
    let varieties = 0;
    let stock = 0;
    let value = 0;
    allRows.forEach((row) => {
      cropIds.add(String(row.cropId));
      varieties += 1;
      stock += row.currentStock || 0;
      value += row.stockValue || 0;
    });
    return { crops: cropIds.size, varieties, stock, value };
  }, [allRows]);

  const filteredRows = useMemo(() => {
    let rows = [...allRows];
    if (cropFilter !== "all") {
      rows = rows.filter((r) => String(r.cropId) === String(cropFilter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.cropName?.toLowerCase().includes(q) ||
          r.varietyName?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      rows = rows.filter((r) => stockStatusOf(r.currentStock || 0) === statusFilter);
    }

    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === "updated") {
        const diff = new Date(a.stockUpdatedAt || 0) - new Date(b.stockUpdatedAt || 0);
        if (diff !== 0) return diff * dir;
        return String(a.cropName).localeCompare(String(b.cropName)) * dir;
      }
      if (sortKey === "stock" || sortKey === "value") {
        const field = sortKey === "stock" ? "currentStock" : "stockValue";
        return ((a[field] || 0) - (b[field] || 0)) * dir;
      }
      const field = sortKey === "crop" ? "cropName" : "varietyName";
      return String(a[field]).localeCompare(String(b[field])) * dir;
    });
    return rows;
  }, [allRows, cropFilter, search, statusFilter, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "updated" ? "desc" : "asc");
    }
  };

  const activeLabel = stockTypeTab === "chemical" ? "Chemicals" : "Seeds";
  const lowStockList = stock?.lowStockVarieties || [];

  const formatUpdated = (dateVal) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unitLabel = (row) =>
    row.primaryUnit?.abbreviation || row.primaryUnit?.name || "";

  const handleTypeTab = (tab) => {
    setStockTypeTab(tab);
    setCropFilter("all");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => handleTypeTab("seed")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              stockTypeTab === "seed"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Sprout className="h-4 w-4" />
            Seeds
          </button>
          <button
            type="button"
            onClick={() => handleTypeTab("chemical")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              stockTypeTab === "chemical"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            Chemicals
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onCopyAll(filteredRows)}
            disabled={filteredRows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => onExportCsv(cropsForTab, stockTypeTab)}
            disabled={exporting || filteredRows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Download className={`h-4 w-4 ${exporting ? "animate-spin" : ""}`} />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label={stockTypeTab === "chemical" ? "Chemicals" : "Crops"}
          value={summary.crops}
          accent={{ border: "border-brand-200", bg: "bg-brand-100", text: "text-brand-700" }}
        />
        <StatCard
          icon={Layers}
          label="Varieties"
          value={summary.varieties}
          accent={{ border: "border-violet-200", bg: "bg-violet-100", text: "text-violet-700" }}
        />
        <StatCard
          icon={Boxes}
          label="Total units"
          value={formatNumber(summary.stock)}
          accent={{ border: "border-sky-200", bg: "bg-sky-100", text: "text-sky-700" }}
        />
        <StatCard
          icon={IndianRupee}
          label="Stock value"
          value={formatCurrency(summary.value)}
          accent={{ border: "border-amber-200", bg: "bg-amber-100", text: "text-amber-700" }}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-gray-600">Plant / crop</label>
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All plants</option>
              {cropOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-gray-600">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Crop or variety…"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-gray-600">Stock status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All statuses</option>
              <option value="ok">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {filteredRows.length} of {allRows.length} {activeLabel.toLowerCase()} · sorted by{" "}
          {sortKey === "updated" ? "last updated" : sortKey} ({sortDir})
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-500 shadow-sm">
          <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium">No {activeLabel.toLowerCase()} match your filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="max-h-[min(70vh,640px)] overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("crop")}
                      className="font-semibold text-gray-700 hover:text-brand-700"
                    >
                      Plant
                      <SortIcon column="crop" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("variety")}
                      className="font-semibold text-gray-700 hover:text-brand-700"
                    >
                      Variety
                      <SortIcon column="variety" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort("stock")}
                      className="font-semibold text-gray-700 hover:text-brand-700"
                    >
                      Stock
                      <SortIcon column="stock" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort("value")}
                      className="font-semibold text-gray-700 hover:text-brand-700"
                    >
                      Value
                      <SortIcon column="value" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("updated")}
                      className="font-semibold text-gray-700 hover:text-brand-700"
                    >
                      Last updated
                      <SortIcon column="updated" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredRows.map((row) => {
                  const qty = row.currentStock || 0;
                  const status = stockStatusOf(qty);
                  const rowKey = `${row.cropId}_${row.varietyId}`;
                  const cropForShare = cropsForTab.find((c) => String(c.cropId) === String(row.cropId));

                  return (
                    <tr key={rowKey} className="transition-colors hover:bg-brand-50/40">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {row.cropName}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-gray-800" title={row.varietyName}>
                        {row.varietyName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        <span
                          className={
                            status === "out"
                              ? "font-semibold text-red-600"
                              : status === "low"
                                ? "font-semibold text-amber-700"
                                : "font-semibold text-brand-700"
                          }
                        >
                          {formatNumber(qty)}
                        </span>
                        {unitLabel(row) ? (
                          <span className="ml-1 text-xs text-gray-500">{unitLabel(row)}</span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">
                        {formatCurrency(row.stockValue || 0)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                        {formatUpdated(row.stockUpdatedAt)}
                      </td>
                      <td className="px-4 py-3">{statusBadge(status)}</td>
                      <td className="px-4 py-3 text-right">
                        {cropForShare ? (
                          <button
                            type="button"
                            onClick={() => onShareCrop(cropForShare)}
                            className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-100"
                            title={`Share ${row.cropName} on WhatsApp`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WA
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lowStockList.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">Low stock alert</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockList.slice(0, 9).map((variety) => (
              <div
                key={variety.varietyId}
                className="rounded-lg border border-amber-100 bg-white px-3 py-2 text-sm"
              >
                <p className="font-medium text-gray-800">{variety.name}</p>
                <p className="text-xs text-gray-600">
                  {formatNumber(variety.currentStock)} · {formatCurrency(variety.averagePrice)} avg
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
