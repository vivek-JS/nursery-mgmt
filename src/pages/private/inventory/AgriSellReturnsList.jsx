import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  CheckCircleOutline,
  ExpandLess,
  ExpandMore,
  FilterList,
  PictureAsPdf,
  Refresh,
  Search,
  Undo,
} from "@mui/icons-material";
import { Toast } from "helpers/toasts/toastHelper";
import AgriOrderDetailModal from "./components/agri-order-detail/AgriOrderDetailModal";
import AgriMerchantSaleReturnDialog from "./components/agri-order-detail/AgriMerchantSaleReturnDialog";
import {
  approveAgriReturnRequest,
  downloadSaleReturnInvoice,
  listAgriSellReturns,
  rejectAgriReturnRequest,
} from "./components/agri-order-detail/agriOrderDetailApi";

const STATUS_OPTS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const SOURCE_OPTS = [
  { value: "ALL", label: "All sources" },
  { value: "MERCHANT_BATCH", label: "Merchant batch (office)" },
  { value: "ORDER_WISE", label: "Order-wise (office)" },
  { value: "DEALER", label: "Dealer request" },
];

function statusChip(status) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return { color: "success", label: "Approved" };
  if (s === "PENDING") return { color: "warning", label: "Pending" };
  if (s === "REJECTED") return { color: "error", label: "Rejected" };
  return { color: "default", label: s || "—" };
}

function sourceLabel(source) {
  const s = String(source || "").toUpperCase();
  if (s === "MERCHANT_BATCH") return "Merchant batch";
  if (s === "ORDER_WISE") return "Order-wise";
  return "Dealer";
}

function sourceChipSx(source) {
  const s = String(source || "").toUpperCase();
  if (s === "MERCHANT_BATCH") return { bgcolor: "#ffedd5", color: "#9a3412" };
  if (s === "ORDER_WISE") return { bgcolor: "#dbeafe", color: "#1e40af" };
  return { bgcolor: "#ede9fe", color: "#5b21b6" };
}

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AffectedOrderCell({ row, onOpen }) {
  const orders = Array.isArray(row.affectedOrders) && row.affectedOrders.length
    ? row.affectedOrders
    : [
        {
          orderId: row.affectedOrder?._id || row.orderId?._id || row.orderId,
          orderNumber: row.affectedOrder?.orderNumber || row.orderNumber,
          customerName: row.affectedOrder?.customerName,
        },
      ];
  const first = orders[0] || {};
  const extra = Math.max(0, orders.length - 1);
  const orderId = first.orderId?._id || first.orderId;
  return (
    <Box>
      <Button
        size="small"
        onClick={() => orderId && onOpen?.(String(orderId))}
        sx={{ textTransform: "none", fontWeight: 800, px: 0, minWidth: 0 }}
        disabled={!orderId}
      >
        #{first.orderNumber || "—"}
        {extra > 0 ? ` +${extra}` : ""}
      </Button>
      <Typography variant="caption" color="text.secondary" display="block">
        {orders.length === 1
          ? first.customerName || row.affectedOrder?.merchantName || "—"
          : `${orders.length} orders affected`}
      </Typography>
    </Box>
  );
}

function LineExpand({ row, onOpenOrder }) {
  const [open, setOpen] = useState(false);
  const lines = row.lineReturns || [];
  const batches = row.batchSummary || row.appliedBatches || [];
  const orders =
    Array.isArray(row.affectedOrders) && row.affectedOrders.length
      ? row.affectedOrders
      : [
          {
            orderId: row.affectedOrder?._id || row.orderId?._id || row.orderId,
            orderNumber: row.affectedOrder?.orderNumber || row.orderNumber,
            customerName: row.affectedOrder?.customerName,
            returnQuantity: row.totalReturnQty,
            creditAmount: row.creditAmount,
          },
        ];

  const batchCount = batches.length;
  const orderCount = orders.length;

  return (
    <Box>
      <Button
        size="small"
        endIcon={open ? <ExpandLess /> : <ExpandMore />}
        onClick={() => setOpen((v) => !v)}
        sx={{ textTransform: "none", fontWeight: 700, px: 0 }}
      >
        {row.totalReturnQty || 0} qty · {orderCount} order{orderCount === 1 ? "" : "s"}
        {batchCount ? ` · ${batchCount} batch${batchCount === 1 ? "" : "es"}` : ""}
        {lines.length && !batchCount ? ` · ${lines.length} line(s)` : ""}
      </Button>
      <Collapse in={open}>
        <Stack spacing={1} sx={{ mt: 1, pl: 0.5 }}>
          <Typography variant="caption" fontWeight={800} color="text.primary">
            Affected order{orderCount === 1 ? "" : "s"}
          </Typography>
          {orders.map((o, i) => {
            const oid = o.orderId?._id || o.orderId;
            return (
              <Box
                key={String(oid || i)}
                sx={{
                  border: "1px solid #fed7aa",
                  bgcolor: "#fffbeb",
                  borderRadius: 1,
                  px: 1,
                  py: 0.75,
                }}
              >
                <Button
                  size="small"
                  onClick={() => oid && onOpenOrder?.(String(oid))}
                  sx={{ textTransform: "none", fontWeight: 800, px: 0, minWidth: 0 }}
                  disabled={!oid}
                >
                  #{o.orderNumber || "—"}
                </Button>
                <Typography variant="caption" color="text.secondary" display="block">
                  {o.customerName || "—"}
                  {o.returnQuantity != null ? ` · qty ${o.returnQuantity}` : ""}
                  {o.creditAmount != null
                    ? ` · ₹${Number(o.creditAmount || 0).toLocaleString("en-IN")}`
                    : ""}
                </Typography>
              </Box>
            );
          })}

          {batchCount > 0 ? (
            <>
              <Typography variant="caption" fontWeight={800} color="text.primary">
                Batches
              </Typography>
              {batches.map((b, i) => (
                <Typography key={i} variant="caption" color="text.secondary">
                  {b.productName || "Product"} · Batch <strong>{b.batchNumber || "—"}</strong> →{" "}
                  {b.quantity ?? b.returnQuantity ?? 0}
                </Typography>
              ))}
            </>
          ) : lines.length ? (
            <>
              <Typography variant="caption" fontWeight={800} color="text.primary">
                Lines
              </Typography>
              {lines.map((l, i) => (
                <Typography key={i} variant="caption" color="text.secondary">
                  {l.productName || "Product"} → {l.returnQuantity}
                  {(l.batchReturns || [])
                    .map((br) => ` [${br.batchNumber || "batch"}:${br.quantity}]`)
                    .join("")}
                </Typography>
              ))}
            </>
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  );
}

export default function AgriSellReturnsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAgriSellReturns({
        status,
        source,
        search: debouncedSearch,
        dateFrom,
        dateTo,
        page: page + 1,
        limit: rowsPerPage,
      });
      setRows(res.data || []);
      setTotal(Number(res.pagination?.total) || 0);
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to load sell returns");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status, source, debouncedSearch, dateFrom, dateTo, page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => rows.filter((r) => String(r.status).toUpperCase() === "PENDING").length,
    [rows]
  );

  const handleApprove = async (id) => {
    setBusyId(id);
    try {
      await approveAgriReturnRequest(id);
      Toast.success("Return approved — stock & ledger updated");
      await load();
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Reject this sell return request?")) return;
    setBusyId(id);
    try {
      await rejectAgriReturnRequest(id, "Rejected from Sell Returns list");
      Toast.success("Return rejected");
      await load();
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleInvoice = async (id) => {
    setBusyId(id);
    try {
      const { filename } = await downloadSaleReturnInvoice(id);
      Toast.success(`Invoice downloaded${filename ? `: ${filename}` : ""}`);
      await load();
    } catch (e) {
      Toast.error(e?.message || "Invoice download failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, maxWidth: 1400, mx: "auto" }}>
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 2.5,
          borderRadius: 3,
          background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 45%, #fff 100%)",
          border: "1px solid #fdba74",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: "#ea580c",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Undo fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} color="#9a3412">
                  Sell Returns
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Merchant batch & dealer returns · affected orders · stock & ledger history
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters((v) => !v)}
              sx={{ textTransform: "none", fontWeight: 700, borderColor: "#fb923c", color: "#c2410c" }}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={load}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Undo />}
              onClick={() => setCreateOpen(true)}
              sx={{
                textTransform: "none",
                fontWeight: 800,
                bgcolor: "#ea580c",
                "&:hover": { bgcolor: "#c2410c" },
              }}
            >
              Create Sell Return
            </Button>
          </Stack>
        </Stack>

        <Collapse in={showFilters}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ mt: 2 }}
            useFlexGap
            flexWrap="wrap"
          >
            <TextField
              size="small"
              placeholder="Search order #, reason…"
              value={search}
              onChange={(e) => {
                setPage(0);
                setSearch(e.target.value);
              }}
              sx={{ minWidth: 220, bgcolor: "#fff", flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={status}
              onChange={(e) => {
                setPage(0);
                setStatus(e.target.value);
              }}
              sx={{ minWidth: 150, bgcolor: "#fff" }}
            >
              {STATUS_OPTS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Source"
              value={source}
              onChange={(e) => {
                setPage(0);
                setSource(e.target.value);
              }}
              sx={{ minWidth: 180, bgcolor: "#fff" }}
            >
              {SOURCE_OPTS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="date"
              label="From"
              InputLabelProps={{ shrink: true }}
              value={dateFrom}
              onChange={(e) => {
                setPage(0);
                setDateFrom(e.target.value);
              }}
              sx={{ minWidth: 150, bgcolor: "#fff" }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              InputLabelProps={{ shrink: true }}
              value={dateTo}
              onChange={(e) => {
                setPage(0);
                setDateTo(e.target.value);
              }}
              sx={{ minWidth: 150, bgcolor: "#fff" }}
            />
          </Stack>
        </Collapse>

        {pendingCount > 0 && status === "ALL" && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            {pendingCount} pending return(s) on this page — approve from the Actions column.
          </Alert>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: "1px solid #e7e5e4", overflow: "hidden", bgcolor: "#fff" }}
      >
        {loading ? (
          <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography fontWeight={700} color="text.secondary">
              No sell returns found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Adjust filters or create a merchant batch return.
            </Typography>
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#fff7ed" }}>
                  <TableCell sx={{ fontWeight: 800 }}>When</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Affected order</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Return</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Credit</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>By</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const chip = statusChip(row.status);
                  const isPending = String(row.status).toUpperCase() === "PENDING";
                  return (
                    <TableRow key={row._id} hover sx={{ "& td": { borderColor: "#f5f5f4" } }}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(row.requestedAt || row.createdAt)}
                        </Typography>
                        <Chip
                          size="small"
                          label={sourceLabel(row.source)}
                          sx={{
                            mt: 0.5,
                            height: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            ...sourceChipSx(row.source),
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <AffectedOrderCell row={row} onOpen={setDetailOrderId} />
                      </TableCell>
                      <TableCell>
                        <LineExpand row={row} onOpenOrder={setDetailOrderId} />
                        {(row.batchSummary || row.appliedBatches || []).length ? (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Batches:{" "}
                            {(row.batchSummary || row.appliedBatches)
                              .slice(0, 3)
                              .map((b) => b.batchNumber || "—")
                              .join(", ")}
                            {(row.batchSummary || row.appliedBatches).length > 3 ? "…" : ""}
                          </Typography>
                        ) : null}
                        {row.returnReason ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {row.returnReason}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={chip.color} label={chip.label} sx={{ fontWeight: 700 }} />
                        {row.stockReturned ? (
                          <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.5 }}>
                            Stock restored
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          ₹{Number(row.creditAmount || 0).toLocaleString("en-IN")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">
                          {row.requestedBy?.name || row.dealer?.name || "—"}
                        </Typography>
                        {row.reviewedBy?.name ? (
                          <Typography variant="caption" color="text.secondary">
                            Rev: {row.reviewedBy.name}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
                          {!["REJECTED", "CANCELLED"].includes(String(row.status || "").toUpperCase()) ? (
                            <Button
                              size="small"
                              variant="contained"
                              disabled={busyId === row._id}
                              startIcon={<PictureAsPdf />}
                              onClick={() => handleInvoice(row._id)}
                              sx={{
                                textTransform: "none",
                                fontWeight: 800,
                                bgcolor: "#c2410c",
                                boxShadow: "none",
                                "&:hover": { bgcolor: "#9a3412", boxShadow: "none" },
                              }}
                            >
                              {row.invoiceNumber || "Invoice"}
                            </Button>
                          ) : null}
                          {isPending ? (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                disabled={busyId === row._id}
                                startIcon={<CheckCircleOutline />}
                                onClick={() => handleApprove(row._id)}
                                sx={{ textTransform: "none", fontWeight: 700 }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                disabled={busyId === row._id}
                                onClick={() => handleReject(row._id)}
                                sx={{ textTransform: "none", fontWeight: 700 }}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="small"
                              onClick={() =>
                                setDetailOrderId(
                                  String(
                                    row.affectedOrder?._id || row.orderId?._id || row.orderId || ""
                                  )
                                )
                              }
                              sx={{ textTransform: "none", fontWeight: 700 }}
                            >
                              View order
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </Paper>

      <AgriOrderDetailModal
        open={Boolean(detailOrderId)}
        orderId={detailOrderId}
        onClose={() => setDetailOrderId(null)}
        onSaleReturnSuccess={load}
      />
      <AgriMerchantSaleReturnDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          load();
        }}
      />
    </Box>
  );
}
