import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  InputAdornment,
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
  ExpandLess,
  ExpandMore,
  FilterList,
  PictureAsPdf,
  Refresh,
  Search,
  Undo,
} from "@mui/icons-material";
import { Toast } from "helpers/toasts/toastHelper";
import PurchaseReturnDialog from "./components/purchase-return/PurchaseReturnDialog";
import {
  downloadPurchaseReturnInvoice,
  listPurchaseReturns,
} from "./components/purchase-return/purchaseReturnApi";

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

function LineExpand({ row }) {
  const [open, setOpen] = useState(false);
  const lines = row.lines || [];
  const affected = row.affectedPurchaseOrders || [];
  if (!lines.length) return <Typography variant="caption">—</Typography>;

  return (
    <Box>
      <Button
        size="small"
        endIcon={open ? <ExpandLess /> : <ExpandMore />}
        onClick={() => setOpen((v) => !v)}
        sx={{ textTransform: "none", fontWeight: 700, px: 0 }}
      >
        {row.totalQuantity || 0} qty · {lines.length} line(s)
        {affected.length > 1 ? ` · ${affected.length} POs` : ""}
      </Button>
      <Collapse in={open}>
        <Stack spacing={0.5} sx={{ mt: 0.5, pl: 0.5 }}>
          {affected.length > 1 &&
            affected.map((p, i) => (
              <Typography key={`po-${i}`} variant="caption" sx={{ color: "#1565c0", fontWeight: 600 }}>
                PO {p.poNumber || "—"} → {p.returnQuantity} qty
              </Typography>
            ))}
          {lines.map((l, i) => (
            <Typography key={i} variant="caption" color="text.secondary">
              {l.productName || "Product"} · Batch {l.batchNumber || "—"}
              {l.poNumber ? ` · PO ${l.poNumber}` : ""} · GRN {l.grnNumber || "—"} → {l.returnQuantity}
            </Typography>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

export default function PurchaseReturnsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPurchaseReturns({
        search: debouncedSearch,
        dateFrom,
        dateTo,
        page: page + 1,
        limit: rowsPerPage,
      });
      setRows(res.data || []);
      setTotal(Number(res.pagination?.total) || 0);
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to load purchase returns");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateFrom, dateTo, page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvoice = async (id) => {
    setBusyId(id);
    try {
      const { filename } = await downloadPurchaseReturnInvoice(id);
      Toast.success(`Invoice downloaded${filename ? `: ${filename}` : ""}`);
      await load();
    } catch (e) {
      Toast.error(e?.message || "Invoice download failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 3,
          background: "linear-gradient(135deg, #e3f2fd 0%, #fff 55%)",
          border: "1px solid #bbdefb",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h5" fontWeight={800} color="#0d47a1">
              Purchase Returns
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supplier → currently available batches → return (stock reduced). Same flow as sell return.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
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
                bgcolor: "#1565c0",
                "&:hover": { bgcolor: "#0d47a1" },
              }}
            >
              Create Purchase Return
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Button
          size="small"
          startIcon={<FilterList />}
          onClick={() => setShowFilters((v) => !v)}
          sx={{ textTransform: "none", fontWeight: 700, mb: showFilters ? 1.5 : 0 }}
        >
          Filters
        </Button>
        <Collapse in={showFilters}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              size="small"
              placeholder="Search return # / PO #"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <TextField
              size="small"
              type="date"
              label="From"
              InputLabelProps={{ shrink: true }}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              InputLabelProps={{ shrink: true }}
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
            />
          </Stack>
        </Collapse>
      </Paper>

      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Return #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>PO</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Supplier</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Lines</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">
                    Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>When</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">
                    Invoice
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No purchase returns yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row._id} hover>
                      <TableCell>
                        <Typography fontWeight={800}>{row.returnNumber}</Typography>
                        {row.returnReason ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {row.returnReason}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {row.poNumber || row.purchaseOrder?.poNumber || "—"}
                        </Typography>
                        {row.source === "SUPPLIER_BATCH" ? (
                          <Chip
                            size="small"
                            label="Supplier"
                            sx={{ mt: 0.5, height: 18, fontSize: 10, fontWeight: 700 }}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell>{row.supplier?.name || "—"}</TableCell>
                      <TableCell>
                        <LineExpand row={row} />
                      </TableCell>
                      <TableCell align="right">
                        ₹{Number(row.totalAmount || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.status || "COMPLETED"}
                          color={String(row.status).toUpperCase() === "COMPLETED" ? "success" : "default"}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(row.returnedAt || row.createdAt)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.createdBy?.name || ""}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          disabled={busyId === row._id}
                          startIcon={
                            busyId === row._id ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <PictureAsPdf />
                            )
                          }
                          onClick={() => handleInvoice(row._id)}
                          sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            bgcolor: "#1565c0",
                            boxShadow: "none",
                            borderRadius: 2,
                            "&:hover": { bgcolor: "#0d47a1", boxShadow: "none" },
                          }}
                        >
                          {row.invoiceNumber || "Invoice"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
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

      <PurchaseReturnDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => load()}
      />
    </Box>
  );
}
