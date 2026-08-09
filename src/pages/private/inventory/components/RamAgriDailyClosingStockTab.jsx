import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Copy, MessageCircle, RefreshCw, Save, ArrowDownToLine } from "lucide-react";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import {
  getRamAgriProductTypeLabelPlural,
  normalizeRamAgriProductType,
  RAM_AGRI_PRODUCT_TYPES,
} from "utils/ramAgriProductType";

function todayIstDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatNumber(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatDisplayDate(stockDate) {
  if (!stockDate) return "";
  const [y, m, d] = String(stockDate).split("-");
  if (!y || !m || !d) return stockDate;
  return `${d}/${m}/${y}`;
}

function unitLabel(row) {
  return row.primaryUnitLabel || row.primaryUnit?.abbreviation || row.primaryUnit?.name || "";
}

function parseDraftClosing(drafts, row) {
  const key = `${row.cropId}_${row.varietyId}`;
  const raw = String(drafts[key] ?? "").trim();
  if (raw === "") return row.closingStock != null ? Number(row.closingStock) : null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function buildClosingWhatsAppMessage({ stockDate, byCrop, savedCount, totalCount }) {
  let message = `🌾 *Ram Agri Input — Daily Closing Stock*\n\n`;
  message += `📅 *Date:* ${formatDisplayDate(stockDate)}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  byCrop.forEach((crop, cropIdx) => {
    message += `📦 *${crop.cropName}*\n\n`;
    crop.varieties.forEach((v, idx) => {
      const unit = unitLabel(v);
      const available = formatNumber(v.currentStock);
      const closing = v.closingStock != null ? formatNumber(v.closingStock) : "—";
      message += `${idx + 1}. *${v.varietyName}*\n`;
      message += `   Available: ${available} ${unit}\n`;
      message += `   Closing: *${closing} ${unit}*\n`;
      if (idx < crop.varieties.length - 1) message += `\n`;
    });
    if (cropIdx < byCrop.length - 1) message += `\n────────────────────────\n\n`;
  });

  message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✅ Recorded: ${savedCount} / ${totalCount} varieties\n\n`;
  message += `📞 *For inquiries, please contact the office.*`;
  return message;
}

function DiffBadge({ closing, available }) {
  if (closing == null || !Number.isFinite(available)) return <span className="text-gray-300">—</span>;
  const diff = closing - available;
  if (Math.abs(diff) < 0.001) {
    return <span className="text-[10px] font-semibold text-emerald-700">Match</span>;
  }
  const sign = diff > 0 ? "+" : "";
  return (
    <span
      className={`text-[10px] font-bold tabular-nums ${
        diff > 0 ? "text-amber-700" : "text-red-700"
      }`}
    >
      {sign}
      {formatNumber(diff)}
    </span>
  );
}

export default function RamAgriDailyClosingStockTab({ canManage }) {
  const [stockDate, setStockDate] = useState(todayIstDateString);
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [typeTab, setTypeTab] = useState("seed");
  const [copied, setCopied] = useState(false);

  const loadClosingStock = useCallback(async () => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_DAILY_CLOSING_STOCK);
      const res = await instance.request({}, { date: stockDate });
      const payload = res?.data?.data || res?.data;
      const rows = Array.isArray(payload?.items) ? payload.items : [];
      setItems(rows);
      const nextDrafts = {};
      rows.forEach((row) => {
        const key = `${row.cropId}_${row.varietyId}`;
        nextDrafts[key] =
          row.closingStock != null && row.closingStock !== "" ? String(row.closingStock) : "";
      });
      setDrafts(nextDrafts);
    } catch (e) {
      console.error(e);
      Toast.error("Failed to load daily closing stock");
      setItems([]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  }, [stockDate]);

  useEffect(() => {
    loadClosingStock();
  }, [loadClosingStock]);

  const filteredItems = useMemo(
    () =>
      items.filter((i) => normalizeRamAgriProductType(i.productType) === normalizeRamAgriProductType(typeTab)),
    [items, typeTab]
  );

  const groupedByCrop = useMemo(() => {
    const map = new Map();
    filteredItems.forEach((item) => {
      const id = String(item.cropId);
      if (!map.has(id)) {
        map.set(id, { cropId: item.cropId, cropName: item.cropName, varieties: [] });
      }
      map.get(id).varieties.push(item);
    });
    return Array.from(map.values());
  }, [filteredItems]);

  const allItemsByCrop = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const id = String(item.cropId);
      if (!map.has(id)) map.set(id, { cropName: item.cropName, varieties: [] });
      map.get(id).varieties.push({
        ...item,
        closingStock: parseDraftClosing(drafts, item),
      });
    });
    return Array.from(map.values());
  }, [items, drafts]);

  const stats = useMemo(() => {
    const filled = filteredItems.filter((row) => String(drafts[`${row.cropId}_${row.varietyId}`] ?? "").trim() !== "").length;
    const availableSum = filteredItems.reduce((s, r) => s + (Number(r.currentStock) || 0), 0);
    const savedOnDate = filteredItems.filter((r) => r.closingStock != null).length;
    return { filled, availableSum, savedOnDate, total: filteredItems.length };
  }, [filteredItems, drafts]);

  const updateDraft = (cropId, varietyId, value) => {
    setDrafts((prev) => ({ ...prev, [`${cropId}_${varietyId}`]: value }));
  };

  const fillFromAvailable = (rows) => {
    setDrafts((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        const key = `${row.cropId}_${row.varietyId}`;
        next[key] = String(Number(row.currentStock) || 0);
      });
      return next;
    });
    Toast.success("Filled closing from available stock");
  };

  const saveAllClosingStock = async () => {
    if (!canManage) {
      Toast.error("You do not have permission to save closing stock");
      return;
    }
    const entries = items
      .map((row) => {
        const raw = String(drafts[`${row.cropId}_${row.varietyId}`] ?? "").trim();
        if (raw === "") return null;
        const closingStock = Number(raw);
        if (!Number.isFinite(closingStock) || closingStock < 0) return null;
        return { cropId: row.cropId, varietyId: row.varietyId, closingStock };
      })
      .filter(Boolean);

    if (!entries.length) {
      Toast.error("Enter closing stock for at least one variety");
      return;
    }

    setSaving(true);
    try {
      const instance = NetworkManager(API.INVENTORY.UPSERT_RAM_AGRI_DAILY_CLOSING_STOCK);
      const res = await instance.request({ stockDate, entries });
      if (res?.data?.status === "Success") {
        Toast.success(`Closing stock saved for ${formatDisplayDate(stockDate)}`);
        await loadClosingStock();
      } else {
        Toast.error(res?.data?.message || "Save failed");
      }
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to save closing stock");
    } finally {
      setSaving(false);
    }
  };

  const getWhatsAppPayload = (cropFilter) => {
    const byCrop = cropFilter
      ? allItemsByCrop.filter((c) => c.cropName === cropFilter.cropName)
      : allItemsByCrop;
    const flat = byCrop.flatMap((c) => c.varieties);
    const savedCount = flat.filter((v) => v.closingStock != null).length;
    return buildClosingWhatsAppMessage({
      stockDate,
      byCrop,
      savedCount,
      totalCount: flat.length,
    });
  };

  const copyWhatsAppMessage = (crop) => {
    const message = getWhatsAppPayload(crop);
    navigator.clipboard
      .writeText(message)
      .then(() => {
        setCopied(true);
        Toast.success(crop ? `${crop.cropName} copied` : "Closing stock message copied");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => Toast.error("Failed to copy message"));
  };

  if (!canManage) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
        Daily closing stock is available to Ram Agri Master and Super Admin only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  const filledCount = Object.values(drafts).filter((v) => String(v).trim() !== "").length;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="bg-white border border-purple-100 rounded-lg shadow-sm px-3 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-purple-950">Daily closing stock</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {formatDisplayDate(stockDate)} · {stats.total} items ·{" "}
              <span className="text-sky-700 font-semibold">
                {formatNumber(stats.availableSum)} available (this tab)
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 bg-purple-50 rounded-md border border-purple-100 px-2 py-1">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <input
                type="date"
                value={stockDate}
                onChange={(e) => setStockDate(e.target.value)}
                className="text-xs border-0 bg-transparent focus:outline-none w-[7.5rem]"
              />
            </div>
            <button type="button" onClick={loadClosingStock} className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => fillFromAvailable(filteredItems)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
            >
              <ArrowDownToLine className="w-3 h-3" />
              Fill from available
            </button>
            <button
              type="button"
              onClick={() => copyWhatsAppMessage()}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
            >
              <Copy className="w-3 h-3" />
              {copied ? "Copied" : "Copy WA"}
            </button>
            <button
              type="button"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(getWhatsAppPayload())}`, "_blank")}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md bg-green-600 text-white hover:bg-green-700"
            >
              <MessageCircle className="w-3 h-3" />
              Share
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={saveAllClosingStock}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
            >
              <Save className={`w-3 h-3 ${saving ? "animate-pulse" : ""}`} />
              {saving ? "Saving…" : `Save (${filledCount})`}
            </button>
          </div>
        </div>
      </div>

      {/* Type tabs + mini stats */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-white border border-gray-200 p-0.5">
          {RAM_AGRI_PRODUCT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeTab(t)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                typeTab === t ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {getRamAgriProductTypeLabelPlural(t)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-100 font-semibold">
            Available total: {formatNumber(stats.availableSum)}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-100 font-semibold">
            Saved on date: {stats.savedOnDate}/{stats.total}
          </span>
        </div>
      </div>

      {groupedByCrop.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-sm text-gray-500">
          No products for this type.
        </div>
      ) : (
        groupedByCrop.map((crop) => (
          <div key={crop.cropId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wide">{crop.cropName}</h4>
              <button
                type="button"
                onClick={() => copyWhatsAppMessage(crop)}
                className="text-[10px] font-semibold text-green-700 hover:text-green-900 inline-flex items-center gap-0.5"
              >
                <Copy className="w-3 h-3" />
                Copy WA
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                    <th className="text-left font-bold px-3 py-1.5 min-w-[140px]">Variety</th>
                    <th className="text-left font-bold px-2 py-1.5 w-12">Unit</th>
                    <th className="text-right font-bold px-2 py-1.5 min-w-[88px] text-sky-700">Available</th>
                    <th className="text-right font-bold px-2 py-1.5 min-w-[100px] text-purple-800">Closing</th>
                    <th className="text-right font-bold px-2 py-1.5 w-16">Diff</th>
                    <th className="text-center font-bold px-2 py-1.5 w-14">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {crop.varieties.map((row) => {
                    const key = `${row.cropId}_${row.varietyId}`;
                    const unit = unitLabel(row);
                    const available = Number(row.currentStock) || 0;
                    const draftVal = String(drafts[key] ?? "").trim();
                    const closingVal = draftVal !== "" ? Number(draftVal) : row.closingStock;
                    const isLow = available === 0;
                    const isSaved = row.closingStock != null && draftVal === String(row.closingStock);

                    return (
                      <tr key={key} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-3 py-1.5">
                          <span className="font-semibold text-gray-900 leading-tight">{row.varietyName}</span>
                        </td>
                        <td className="px-2 py-1.5 text-gray-500 font-medium">{unit || "—"}</td>
                        <td className="px-2 py-1.5 text-right">
                          <span
                            className={`inline-block tabular-nums font-bold px-1.5 py-0.5 rounded ${
                              isLow
                                ? "bg-red-50 text-red-700"
                                : available < 100
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-sky-50 text-sky-800"
                            }`}
                          >
                            {formatNumber(available)}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={drafts[key] ?? ""}
                              onChange={(e) => updateDraft(row.cropId, row.varietyId, e.target.value)}
                              placeholder={row.closingStock != null ? String(row.closingStock) : "0"}
                              className="w-[5.5rem] text-right tabular-nums px-1.5 py-1 border border-purple-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white text-purple-950 font-semibold"
                            />
                            <button
                              type="button"
                              title="Use available stock"
                              onClick={() => updateDraft(row.cropId, row.varietyId, String(available))}
                              className="p-0.5 rounded text-sky-600 hover:bg-sky-100 shrink-0"
                            >
                              <ArrowDownToLine className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <DiffBadge closing={closingVal} available={available} />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {isSaved ? (
                            <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                              Saved
                            </span>
                          ) : draftVal ? (
                            <span className="text-[9px] font-bold uppercase text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
                              Draft
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/80 border-t border-gray-200">
                    <td colSpan={2} className="px-3 py-1 text-[10px] font-semibold text-gray-600">
                      Subtotal
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums font-bold text-sky-800">
                      {formatNumber(crop.varieties.reduce((s, v) => s + (Number(v.currentStock) || 0), 0))}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums font-bold text-purple-800">
                      {formatNumber(
                        crop.varieties.reduce((s, v) => {
                          const c = parseDraftClosing(drafts, v);
                          return s + (c != null ? c : 0);
                        }, 0)
                      )}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
