import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  CircularProgress,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Refresh, Close, LocalShipping, Person, Storefront, Numbers, Grass } from "@mui/icons-material";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { formatDateForDisplay } from "../utils/dateUtils";

function computeMatrixTotals(rows, columnKeys) {
  const orderColTotals = {};
  const plantColTotals = {};
  let grandOrders = 0;
  let grandPlants = 0;
  columnKeys.forEach((c) => {
    orderColTotals[c] = 0;
    plantColTotals[c] = 0;
  });
  rows.forEach((r) => {
    columnKeys.forEach((c) => {
      const o = r.cells?.[c] || 0;
      const p = r.plantCells?.[c] || 0;
      orderColTotals[c] += o;
      plantColTotals[c] += p;
      grandOrders += o;
      grandPlants += p;
    });
  });
  return { orderColTotals, plantColTotals, grandOrders, grandPlants };
}

function cellValue(row, columnKey, metric) {
  if (metric === "plants") return row.plantCells?.[columnKey] || 0;
  return row.cells?.[columnKey] || 0;
}

export default function RemainingDispatchQueue() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [loading, setLoading] = useState(false);
  const [columnKeys, setColumnKeys] = useState([]);
  const [salesRows, setSalesRows] = useState([]);
  const [dealerRows, setDealerRows] = useState([]);
  const [view, setView] = useState("sales");
  /** orders = count of orders per cell; plants = sum of numberOfPlants */
  const [metric, setMetric] = useState("orders");

  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogOrders, setDialogOrders] = useState([]);
  const [dialogTitle, setDialogTitle] = useState("");

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const inst = NetworkManager(API.ORDER.GET_REMAINING_DISPATCH_MATRIX);
      const res = await inst.request({}, {});
      const payload = res?.data?.data ?? res?.data;
      if (payload?.columnKeys && Array.isArray(payload.salesRows) && Array.isArray(payload.dealerRows)) {
        setColumnKeys(payload.columnKeys);
        setSalesRows(payload.salesRows);
        setDealerRows(payload.dealerRows);
      } else {
        setColumnKeys([]);
        setSalesRows([]);
        setDealerRows([]);
        Toast.error(res?.data?.message || "Could not load matrix");
      }
    } catch (e) {
      console.error(e);
      Toast.error(e?.response?.data?.message || "Failed to load matrix");
      setColumnKeys([]);
      setSalesRows([]);
      setDealerRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const rawRows = view === "sales" ? salesRows : dealerRows;

  const sortedRows = useMemo(() => {
    const copy = [...rawRows];
    const mult = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      if (sortBy === "name") {
        return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }) * mult;
      }
      if (sortBy === "total") {
        const av = metric === "plants" ? a.plantRowTotal || 0 : a.rowTotal || 0;
        const bv = metric === "plants" ? b.plantRowTotal || 0 : b.rowTotal || 0;
        return (av - bv) * mult;
      }
      const ck = sortBy;
      return (cellValue(a, ck, metric) - cellValue(b, ck, metric)) * mult;
    });
    return copy;
  }, [rawRows, sortBy, sortDir, metric]);

  const { orderColTotals, plantColTotals, grandOrders, grandPlants } = useMemo(
    () => computeMatrixTotals(sortedRows, columnKeys),
    [sortedRows, columnKeys]
  );
  const colTotals = metric === "plants" ? plantColTotals : orderColTotals;
  const grand = metric === "plants" ? grandPlants : grandOrders;

  const requestSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const openCellOrders = async (row, columnKey) => {
    const orderCount = row.cells?.[columnKey] || 0;
    const plantQty = row.plantCells?.[columnKey] || 0;
    if (orderCount <= 0 && plantQty <= 0) return;
    const role = view === "sales" ? "sales" : "dealer";
    setDialogTitle(
      `${row.name || "—"} · ${columnKey} · ${orderCount} ${orderCount === 1 ? "order" : "orders"} · ${plantQty.toLocaleString()} plants`
    );
    setDialogOpen(true);
    setDialogLoading(true);
    setDialogOrders([]);
    try {
      const inst = NetworkManager(API.ORDER.GET_REMAINING_DISPATCH_MATRIX_ORDERS);
      const res = await inst.request(
        {},
        {
          matrixRole: role,
          rowId: row.id != null ? String(row.id) : "none",
          columnKey,
        }
      );
      const payload = res?.data?.data ?? res?.data;
      setDialogOrders(Array.isArray(payload?.orders) ? payload.orders : []);
    } catch (e) {
      console.error(e);
      Toast.error(e?.response?.data?.message || "Failed to load orders");
    } finally {
      setDialogLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid rgba(46, 125, 50, 0.18)",
          boxShadow: "0 8px 28px rgba(27, 94, 32, 0.08)",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            flexShrink: 0,
            background: "linear-gradient(135deg, #0d2818 0%, #1b5e20 55%, #2e7d32 100%)",
            color: "#fff",
          }}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, justifyContent: "space-between" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: isMobile ? "1rem" : "1.2rem", letterSpacing: "-0.02em" }}>
                Pending orders by variety
              </Typography>
              <Typography sx={{ opacity: 0.88, fontSize: "0.75rem", mt: 0.25 }}>
                All remaining queue · use tabs to switch order count vs plant quantity
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
              <Chip
                label={`${grandOrders.toLocaleString()} orders · ${grandPlants.toLocaleString()} plants`}
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 800, maxWidth: "100%" }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Refresh />}
                onClick={fetchMatrix}
                disabled={loading}
                sx={{
                  textTransform: "none",
                  borderRadius: 1.5,
                  fontWeight: 700,
                  px: 1.5,
                  py: 0.5,
                  bgcolor: "rgba(255,255,255,0.22)",
                  color: "#fff",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.32)", boxShadow: "none" },
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Sales | Dealer · Orders | Plants */}
        <Box
          sx={{
            px: 1.5,
            py: 1,
            flexShrink: 0,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 1.5,
            background: "linear-gradient(180deg,#f4faf5,#ffffff)",
            borderBottom: "1px solid rgba(46,125,50,0.12)",
          }}
        >
          <ToggleButtonGroup
            exclusive
            value={view}
            onChange={(_, v) => v && setView(v)}
            size="small"
            sx={{
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
              "& .MuiToggleButton-root": {
                px: 2,
                py: 0.75,
                textTransform: "none",
                fontWeight: 800,
                fontSize: "0.88rem",
                borderColor: "rgba(46,125,50,0.35)",
              },
              "& .Mui-selected": {
                bgcolor: "rgba(46,125,50,0.18) !important",
                color: "#0d2818",
              },
            }}
          >
            <ToggleButton value="sales">
              <Person sx={{ mr: 0.5, fontSize: 20 }} />
              Sales
            </ToggleButton>
            <ToggleButton value="dealer">
              <Storefront sx={{ mr: 0.5, fontSize: 20 }} />
              Dealer
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            value={metric}
            onChange={(_, v) => v && setMetric(v)}
            size="small"
            sx={{
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
              "& .MuiToggleButton-root": {
                px: 2,
                py: 0.75,
                textTransform: "none",
                fontWeight: 800,
                fontSize: "0.88rem",
                borderColor: "rgba(25,118,210,0.35)",
              },
              "& .Mui-selected": {
                bgcolor: "rgba(25,118,210,0.12) !important",
                color: "#0d47a1",
              },
            }}
          >
            <ToggleButton value="orders">
              <Numbers sx={{ mr: 0.5, fontSize: 20 }} />
              Orders
            </ToggleButton>
            <ToggleButton value="plants">
              <Grass sx={{ mr: 0.5, fontSize: 20 }} />
              Plants
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Matrix table */}
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Table size="small" stickyHeader sx={{ minWidth: 480 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 4,
                    minWidth: 160,
                    bgcolor: "#e8f5e9",
                    borderRight: "2px solid rgba(27,94,32,0.25)",
                  }}
                >
                  <TableSortLabel active={sortBy === "name"} direction={sortBy === "name" ? sortDir : "asc"} onClick={() => requestSort("name")}>
                    <Typography component="span" sx={{ fontWeight: 900, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Name
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                {columnKeys.map((col) => (
                  <TableCell
                    key={col}
                    align="center"
                    sx={{
                      bgcolor: "#f1f8f3",
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      maxWidth: 96,
                      whiteSpace: "normal",
                      lineHeight: 1.2,
                      py: 1,
                      borderLeft: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <TableSortLabel
                      active={sortBy === col}
                      direction={sortBy === col ? sortDir : "desc"}
                      onClick={() => requestSort(col)}
                      sx={{ justifyContent: "center", width: "100%" }}
                      title={metric === "plants" ? "Plant quantity (this column)" : "Order count (this column)"}
                    >
                      {col}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell
                  align="right"
                  sx={{
                    bgcolor: "#dcedc8",
                    fontWeight: 900,
                    minWidth: 72,
                    borderLeft: "2px solid rgba(27,94,32,0.2)",
                  }}
                >
                  <TableSortLabel active={sortBy === "total"} direction={sortBy === "total" ? sortDir : "desc"} onClick={() => requestSort("total")}>
                    <Box component="span" sx={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.15 }}>
                      <span>Σ</span>
                      <Typography component="span" variant="caption" sx={{ fontSize: "0.6rem", fontWeight: 700, opacity: 0.75 }}>
                        {metric === "plants" ? "plants" : "orders"}
                      </Typography>
                    </Box>
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnKeys.length + 2} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={30} sx={{ color: "#2e7d32" }} />
                  </TableCell>
                </TableRow>
              ) : sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnKeys.length + 2} align="center" sx={{ py: 5, color: "text.secondary" }}>
                    No pending orders in the queue.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {sortedRows.map((row, ridx) => (
                    <TableRow
                      key={`${row.id}-${ridx}`}
                      sx={{
                        "&:nth-of-type(odd)": { bgcolor: "rgba(255,255,255,0.92)" },
                        "&:nth-of-type(even)": { bgcolor: "rgba(232,245,233,0.35)" },
                      }}
                    >
                      <TableCell
                        sx={{
                          position: "sticky",
                          left: 0,
                          zIndex: 1,
                          fontWeight: 800,
                          fontSize: "0.88rem",
                          borderRight: "2px solid rgba(27,94,32,0.12)",
                          bgcolor: ridx % 2 === 0 ? "#fff" : "rgba(232,245,233,0.55)",
                        }}
                      >
                        {row.name ?? "—"}
                      </TableCell>
                      {columnKeys.map((col) => {
                        const n = cellValue(row, col, metric);
                        const hasOrders = (row.cells?.[col] || 0) > 0;
                        const clickable = hasOrders || (row.plantCells?.[col] || 0) > 0;
                        return (
                          <TableCell
                            key={col}
                            align="center"
                            onClick={() => openCellOrders(row, col)}
                            sx={{
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: n > 0 ? 800 : 500,
                              color: n > 0 ? "#1b5e20" : "rgba(0,0,0,0.25)",
                              cursor: clickable ? "pointer" : "default",
                              borderLeft: "1px solid rgba(0,0,0,0.04)",
                              fontSize: metric === "plants" ? "0.8rem" : "0.84rem",
                              "&:hover":
                                clickable
                                  ? {
                                      bgcolor: "rgba(46,125,50,0.14)",
                                    }
                                  : {},
                            }}
                            title={
                              hasOrders || (row.plantCells?.[col] || 0) > 0
                                ? `${row.cells?.[col] || 0} orders · ${(row.plantCells?.[col] || 0).toLocaleString()} plants`
                                : ""
                            }
                          >
                            {n > 0 ? n.toLocaleString() : "—"}
                          </TableCell>
                        );
                      })}
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 900,
                          fontVariantNumeric: "tabular-nums",
                          bgcolor: "rgba(220,237,200,0.5)",
                          borderLeft: "2px solid rgba(27,94,32,0.15)",
                        }}
                        title={`${row.rowTotal || 0} orders · ${(row.plantRowTotal || 0).toLocaleString()} plants`}
                      >
                        {(metric === "plants" ? row.plantRowTotal : row.rowTotal) != null
                          ? (metric === "plants" ? row.plantRowTotal : row.rowTotal).toLocaleString()
                          : "0"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: "rgba(27,94,32,0.12)" }}>
                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 0,
                        zIndex: 1,
                        fontWeight: 900,
                        borderTop: "2px solid rgba(27,94,32,0.35)",
                        bgcolor: "rgba(27,94,32,0.12)",
                      }}
                    >
                      Total
                    </TableCell>
                    {columnKeys.map((col) => (
                      <TableCell key={col} align="center" sx={{ fontWeight: 900, borderTop: "2px solid rgba(27,94,32,0.35)" }}>
                        {(colTotals[col] || 0).toLocaleString()}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 900, borderTop: "2px solid rgba(27,94,32,0.35)" }}>
                      {grand.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 1.25,
            px: 2,
            bgcolor: "#e8f5e9",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, pr: 1 }}>
            <LocalShipping sx={{ color: "#2e7d32" }} />
            <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }} noWrap title={dialogTitle}>
              {dialogTitle}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setDialogOpen(false)} aria-label="close">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {dialogLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress size={28} />
            </Box>
          ) : dialogOrders.length === 0 ? (
            <Typography sx={{ p: 3, color: "text.secondary" }}>No orders.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
                    <TableCell sx={{ fontWeight: 800 }}>Order</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Farmer</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Plant</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Plants
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Delivery</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dialogOrders.map((o) => (
                    <TableRow key={o._id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>#{o.orderId ?? "—"}</TableCell>
                      <TableCell>{o.farmer?.name ?? "—"}</TableCell>
                      <TableCell>{o.orderStatus ?? "—"}</TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Typography variant="body2" noWrap title={`${o.plantTypeName || ""} ${o.plantSubtypeName || ""}`}>
                          {o.plantTypeName || "—"}
                          {o.plantSubtypeName ? ` · ${o.plantSubtypeName}` : ""}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{(o.numberOfPlants ?? 0).toLocaleString()}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {o.deliveryDate ? formatDateForDisplay(o.deliveryDate) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
