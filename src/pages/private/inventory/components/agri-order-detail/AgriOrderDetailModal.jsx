import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Close, Undo } from "@mui/icons-material";
import AgriOrderOverviewTab from "./AgriOrderOverviewTab";
import AgriOrderProductsTab from "./AgriOrderProductsTab";
import AgriOrderCollectionsTab from "./AgriOrderCollectionsTab";
import AgriOrderDispatchTab from "./AgriOrderDispatchTab";
import AgriOrderSaleReturnDialog, { canSaleReturnOrder } from "./AgriOrderSaleReturnDialog";
import {
  fetchAgriOrderDetail,
  fetchAgriOrderBatchSummary,
  fetchAgriReturnRequests,
} from "./agriOrderDetailApi";

const TABS = [
  { id: "overview", label: "Order Overview" },
  { id: "products", label: "Products List" },
  { id: "collections", label: "Collections & CN/DN" },
  { id: "dispatch", label: "Dispatch & Delivery" },
];

export default function AgriOrderDetailModal({
  open,
  orderId,
  initialTab = "overview",
  onClose,
  onAddPayment,
  onSaleReturnSuccess,
}) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [batchSummary, setBatchSummary] = useState(null);
  const [returnRequests, setReturnRequests] = useState([]);
  const [saleReturnOpen, setSaleReturnOpen] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [detail, batches, returns] = await Promise.all([
        fetchAgriOrderDetail(orderId),
        fetchAgriOrderBatchSummary(orderId).catch(() => null),
        fetchAgriReturnRequests(orderId).catch(() => []),
      ]);
      setOrder(detail);
      setBatchSummary(batches);
      setReturnRequests(Array.isArray(returns) ? returns : []);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (open && orderId) {
      setTab(initialTab);
      setSaleReturnOpen(false);
      load();
    }
  }, [open, orderId, initialTab, load]);

  const showSaleReturn = canSaleReturnOrder(order);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 6 }}>
          <Typography variant="h6" component="span" fontWeight={700} sx={{ flex: 1 }}>
            Ram Agri order {order?.orderNumber ? `#${order.orderNumber}` : ""}
          </Typography>
          {showSaleReturn && !loading && (
            <Button
              size="small"
              variant="contained"
              startIcon={<Undo />}
              onClick={() => setSaleReturnOpen(true)}
              sx={{
                mr: 4,
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#ef6c00",
                "&:hover": { bgcolor: "#e65100" },
              }}
            >
              Sale Return
            </Button>
          )}
          <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
            {TABS.map((t) => (
              <Tab key={t.id} value={t.id} label={t.label} />
            ))}
          </Tabs>
        </Box>
        <DialogContent dividers sx={{ minHeight: 320, p: 0 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {tab === "overview" && <AgriOrderOverviewTab order={order} />}
              {tab === "products" && (
                <AgriOrderProductsTab order={order} batchSummary={batchSummary} />
              )}
              {tab === "collections" && (
                <AgriOrderCollectionsTab
                  order={order}
                  returnRequests={returnRequests}
                  onAddPayment={() => onAddPayment?.(order)}
                />
              )}
              {tab === "dispatch" && (
                <AgriOrderDispatchTab order={order} batchSummary={batchSummary} />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AgriOrderSaleReturnDialog
        open={saleReturnOpen}
        order={order}
        onClose={() => setSaleReturnOpen(false)}
        onSuccess={() => {
          load();
          onSaleReturnSuccess?.(order);
        }}
      />
    </>
  );
}
