import React, { useMemo, useState } from "react";
import { Package, Search, Save } from "lucide-react";

export default function BiotechSeedStockView({
  masterData,
  formatNumber,
  canDirectStockUpdate,
  onDirectStockUpdate,
  savingProductId,
}) {
  const [search, setSearch] = useState("");
  const [plantFilter, setPlantFilter] = useState("all");

  const rows = useMemo(() => {
    const out = [];
    const plants = masterData?.plants || [];
    for (const pl of plants) {
      for (const st of pl.subtypes || []) {
        for (const p of st.products || []) {
          out.push({
            productId: p._id,
            code: p.code,
            name: p.name,
            plantName: pl.plantName,
            subtypeName: st.subtypeName,
            currentStock: Number(p.currentStock) || 0,
            batchCount: p.batchCount || 0,
            agriLinked: Boolean(p.agriLink?.linked),
            agriLabel: p.agriLink?.linked
              ? `${p.agriLink.cropName || ""} · ${p.agriLink.varietyName || ""}`
              : "",
          });
        }
      }
    }
    for (const p of masterData?.unassigned || []) {
      out.push({
        productId: p._id,
        code: p.code,
        name: p.name,
        plantName: "—",
        subtypeName: "Unassigned",
        currentStock: Number(p.currentStock) || 0,
        batchCount: p.batchCount || 0,
        agriLinked: Boolean(p.agriLink?.linked),
        agriLabel: p.agriLink?.linked
          ? `${p.agriLink.cropName || ""} · ${p.agriLink.varietyName || ""}`
          : "",
      });
    }
    return out.sort((a, b) =>
      String(a.plantName).localeCompare(String(b.plantName)) ||
      String(a.subtypeName).localeCompare(String(b.subtypeName)) ||
      String(a.code).localeCompare(String(b.code))
    );
  }, [masterData]);

  const plantOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.plantName).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (plantFilter !== "all") {
      list = list.filter((r) => r.plantName === plantFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.code?.toLowerCase().includes(q) ||
          r.name?.toLowerCase().includes(q) ||
          r.plantName?.toLowerCase().includes(q) ||
          r.subtypeName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, plantFilter, search]);

  const totalStock = useMemo(
    () => filtered.reduce((s, r) => s + (r.currentStock || 0), 0),
    [filtered]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        Ram Biotech seed inventory (nursery products). Linked rows sync with Ram Agri when adjusted.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, name, plant…"
              className="rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm w-56"
            />
          </div>
          <select
            value={plantFilter}
            onChange={(e) => setPlantFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="all">All plants</option>
            {plantOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-gray-600 tabular-nums">
          <Package className="mr-1 inline h-4 w-4" />
          {filtered.length} products · {formatNumber(totalStock)} units
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Plant</th>
              <th className="px-4 py-3">Subtype</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Agri link</th>
              {canDirectStockUpdate ? (
                <th className="px-4 py-3 text-right">Update</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canDirectStockUpdate ? 7 : 6} className="px-4 py-10 text-center text-gray-500">
                  No biotech seed products
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const saving = savingProductId === String(row.productId);
                return (
                  <tr key={row.productId} className="hover:bg-teal-50/40">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.plantName}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.subtypeName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{row.code}</td>
                    <td className="px-4 py-2.5 text-gray-800">{row.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-brand-700">
                      {formatNumber(row.currentStock)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {row.agriLinked ? (
                        <span className="text-violet-700">{row.agriLabel || "Linked"}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    {canDirectStockUpdate ? (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => onDirectStockUpdate?.(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <Save className={`h-3.5 w-3.5 ${saving ? "animate-pulse" : ""}`} />
                          Update stock
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
