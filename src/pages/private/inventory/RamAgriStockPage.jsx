/**
 * Ram Agri batch / variety stock + Biotech seed inventory — sidebar Stock page.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { canDirectRamAgriStockUpdate } from "workspace/agriAccess";
import { useUserData } from "utils/roleUtils";
import RamAgriStockView from "./components/RamAgriStockView";
import BiotechSeedStockView from "./components/BiotechSeedStockView";
import RamAgriVarietyStockLedgerModal from "./components/RamAgriVarietyStockLedgerModal";
import SimpleDirectStockUpdateModal from "./components/SimpleDirectStockUpdateModal";

function formatNumber(n) {
  return Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function RamAgriStockPage() {
  const userData = useUserData() || {};
  const canDirectStockUpdate = canDirectRamAgriStockUpdate(userData);

  const [inventoryTab, setInventoryTab] = useState("ramAgri");
  const [loading, setLoading] = useState(true);
  const [biotechLoading, setBiotechLoading] = useState(false);
  const [stock, setStock] = useState(null);
  const [biotechMaster, setBiotechMaster] = useState(null);
  const [stockTypeTab, setStockTypeTab] = useState("seed");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLabel, setLedgerLabel] = useState(null);

  const [stockModal, setStockModal] = useState(null);
  const [savingStockKey, setSavingStockKey] = useState(null);
  const [savingProductId, setSavingProductId] = useState(null);

  const loadRamAgri = useCallback(async () => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_SALES_DASHBOARD);
      const response = await instance.request({}, { isOld: "false" });
      const body = response?.data;
      const data = body?.data;
      if (body?.status === "Success" || body?.success) {
        setStock(data?.stock || null);
      } else {
        Toast.error(body?.message || "Failed to load stock");
        setStock(null);
      }
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to load stock");
      setStock(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBiotech = useCallback(async () => {
    setBiotechLoading(true);
    try {
      const instance = NetworkManager(API.INVENTORY.GET_BIOTECH_SEED_MASTER);
      const response = await instance.request({}, {});
      const body = response?.data;
      const data = body?.data ?? body;
      if (body?.status === "Success" || body?.success || data?.plants) {
        setBiotechMaster(data);
      } else {
        Toast.error(body?.message || "Failed to load biotech seed inventory");
        setBiotechMaster(null);
      }
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to load biotech inventory");
      setBiotechMaster(null);
    } finally {
      setBiotechLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRamAgri();
  }, [loadRamAgri]);

  useEffect(() => {
    if (inventoryTab === "biotech" && !biotechMaster && !biotechLoading) {
      loadBiotech();
    }
  }, [inventoryTab, biotechMaster, biotechLoading, loadBiotech]);

  const refreshAll = () => {
    loadRamAgri();
    if (inventoryTab === "biotech") loadBiotech();
  };

  const copyAllStockData = async () => {
    try {
      const rows = stock?.stockItems || [];
      const lines = (rows.length
        ? rows
        : (stock?.stockByCrop || []).flatMap((c) =>
            (c.varieties || []).map((v) => ({
              cropName: c.cropName,
              varietyName: v.name,
              currentStock: v.currentStock,
              stockValue: v.stockValue,
            }))
          )
      ).map(
        (r) =>
          `${r.cropName || ""} | ${r.varietyName || ""} | ${r.currentStock || 0} | ${
            r.stockValue || 0
          }`
      );
      await navigator.clipboard.writeText(
        ["Crop | Variety | Qty | Value", ...lines].join("\n")
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      Toast.success("Stock copied");
    } catch {
      Toast.error("Copy failed");
    }
  };

  const exportStockToCSV = () => {
    try {
      setExporting(true);
      const rows = stock?.stockItems?.length
        ? stock.stockItems
        : (stock?.stockByCrop || []).flatMap((c) =>
            (c.varieties || []).map((v) => ({
              cropName: c.cropName,
              varietyName: v.name,
              productType: c.productType,
              currentStock: v.currentStock,
              stockValue: v.stockValue,
              averagePrice: v.averagePrice,
            }))
          );
      const header = "Crop,Variety,Type,Qty,Value,AvgPrice\n";
      const body = rows
        .map((r) =>
          [
            r.cropName,
            r.varietyName,
            r.productType || "",
            r.currentStock || 0,
            r.stockValue || 0,
            r.averagePrice || 0,
          ]
            .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
      const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ram-agri-stock-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const shareCropToWhatsApp = (crop) => {
    const name = crop?.cropName || "Crop";
    const qty = (crop?.varieties || []).reduce((s, v) => s + (Number(v.currentStock) || 0), 0);
    const text = encodeURIComponent(`Ram Agri stock — ${name}: ${formatNumber(qty)}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const openLedger = async ({ cropId, varietyId, cropName, varietyName }) => {
    setLedgerLabel({ cropName, varietyName });
    setLedgerOpen(true);
    setLedgerLoading(true);
    setLedgerData(null);
    try {
      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_VARIETY_LEDGER);
      const response = await instance.request({}, { cropId, varietyId });
      const body = response?.data;
      setLedgerData(body?.data || body || null);
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to load stock ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  const openRamAgriStockModal = (row) => {
    if (!canDirectStockUpdate) {
      Toast.error("You do not have permission to update stock");
      return;
    }
    setStockModal({ kind: "ramAgri", ...row });
  };

  const openBiotechStockModal = (row) => {
    if (!canDirectStockUpdate) {
      Toast.error("You do not have permission to update stock");
      return;
    }
    setStockModal({
      kind: "biotech",
      productId: row.productId,
      title: row.name,
      subtitle: `${row.plantName} · ${row.subtypeName} · ${row.code}`,
      currentStock: row.currentStock,
    });
  };

  const saveStockModal = async ({ quantityDelta, batchNumber, expiryDate }) => {
    if (!stockModal) return;

    if (stockModal.kind === "ramAgri") {
      const key = `${stockModal.cropId}_${stockModal.varietyId}`;
      setSavingStockKey(key);
      try {
        const instance = NetworkManager(API.INVENTORY.UPDATE_VARIETY);
        const response = await instance.request(
          { quantityDelta, batchNumber, expiryDate },
          [stockModal.cropId, stockModal.varietyId]
        );
        const body = response?.data;
        if (body?.status === "Success" || body?.success) {
          Toast.success("Stock updated");
          setStockModal(null);
          await loadRamAgri();
        } else {
          Toast.error(body?.message || "Failed to update stock");
        }
      } catch (e) {
        Toast.error(e?.response?.data?.message || "Failed to update stock");
      } finally {
        setSavingStockKey(null);
      }
      return;
    }

    setSavingProductId(String(stockModal.productId));
    try {
      const instance = NetworkManager(API.INVENTORY.POST_PRODUCT_MANUAL_STOCK);
      const response = await instance.request(
        { quantityDelta, batchNumber, expiryDate },
        [stockModal.productId]
      );
      const body = response?.data;
      if (body?.status === "Success" || body?.success) {
        Toast.success("Stock updated");
        setStockModal(null);
        await loadBiotech();
        await loadRamAgri();
      } else {
        Toast.error(body?.message || "Failed to update stock");
      }
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to update stock");
    } finally {
      setSavingProductId(null);
    }
  };

  const modalUnit =
    stockModal?.kind === "ramAgri"
      ? stockModal.primaryUnit?.abbreviation || stockModal.primaryUnit?.name || ""
      : "";

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Stock
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ram Agri inputs and Biotech seed inventory
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshAll}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Refresh
        </Button>
      </Stack>

      {canDirectStockUpdate ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          Use the green <strong>Update stock</strong> button in each row&apos;s <strong>Actions</strong> column
          (scroll right on small screens).
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Direct stock update is hidden for your role (
          {userData?.jobTitle || userData?.role || "unknown"}). Allowed: Super Admin, Admin, Office
          Admin, Ram Agri Master, Ram Agri Input Admin, or Ram Agri sales office manager.
        </div>
      )}

      <div className="mb-4 inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setInventoryTab("ramAgri")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            inventoryTab === "ramAgri"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Ram Agri input
        </button>
        <button
          type="button"
          onClick={() => setInventoryTab("biotech")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            inventoryTab === "biotech"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Biotech seed
        </button>
      </div>

      {inventoryTab === "ramAgri" ? (
        loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress />
          </Box>
        ) : !stock ? (
          <Typography color="text.secondary">No stock data</Typography>
        ) : (
          <RamAgriStockView
            stock={stock}
            stockTypeTab={stockTypeTab}
            setStockTypeTab={setStockTypeTab}
            formatNumber={formatNumber}
            formatCurrency={formatCurrency}
            copied={copied}
            exporting={exporting}
            onCopyAll={copyAllStockData}
            onExportCsv={exportStockToCSV}
            onShareCrop={shareCropToWhatsApp}
            onOpenLedger={openLedger}
            canDirectStockUpdate={canDirectStockUpdate}
            onDirectStockUpdate={openRamAgriStockModal}
            savingStockKey={savingStockKey}
          />
        )
      ) : biotechLoading && !biotechMaster ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <BiotechSeedStockView
          masterData={biotechMaster}
          formatNumber={formatNumber}
          canDirectStockUpdate={canDirectStockUpdate}
          onDirectStockUpdate={openBiotechStockModal}
          savingProductId={savingProductId}
        />
      )}

      <RamAgriVarietyStockLedgerModal
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        loading={ledgerLoading}
        data={ledgerData}
        formatNumber={formatNumber}
        pendingLabel={ledgerLabel}
      />

      <SimpleDirectStockUpdateModal
        open={Boolean(stockModal)}
        onClose={() => !savingStockKey && !savingProductId && setStockModal(null)}
        onSubmit={saveStockModal}
        title={
          stockModal?.kind === "ramAgri"
            ? `${stockModal?.cropName || ""} · ${stockModal?.varietyName || ""}`
            : stockModal?.title || ""
        }
        subtitle={stockModal?.kind === "biotech" ? stockModal?.subtitle : "Ram Agri variety"}
        currentStock={stockModal?.currentStock ?? 0}
        unit={modalUnit}
        saving={Boolean(savingStockKey || savingProductId)}
      />
    </Box>
  );
}
