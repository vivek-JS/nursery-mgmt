/**
 * Ram Agri batch / variety stock — left-sidebar destination.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import RamAgriStockView from "./components/RamAgriStockView";
import RamAgriVarietyStockLedgerModal from "./components/RamAgriVarietyStockLedgerModal";

function formatNumber(n) {
  return Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function RamAgriStockPage() {
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState(null);
  const [stockTypeTab, setStockTypeTab] = useState("seed");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLabel, setLedgerLabel] = useState(null);

  const load = useCallback(async () => {
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

  useEffect(() => {
    load();
  }, [load]);

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
            Ram Agri batch / variety stock on hand
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={load}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Refresh
        </Button>
      </Stack>

      {loading ? (
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
    </Box>
  );
}
