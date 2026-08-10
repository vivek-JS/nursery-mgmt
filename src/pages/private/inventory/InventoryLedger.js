/**
 * Money Ledger — Biotech Master vs Ram Agri Input (separate books).
 * Each book is one unified debit/credit ledger (no Receivable/Payable split).
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Payments, Refresh, Search, LocalOffer } from "@mui/icons-material";
import { Toast } from "helpers/toasts/toastHelper";
import MoneyLedgerAddPaymentDialog from "./components/money-ledger/MoneyLedgerAddPaymentDialog";
import MoneyLedgerPartyAdjustDialog from "./components/money-ledger/MoneyLedgerPartyAdjustDialog";
import LedgerSummaryCards from "./components/money-ledger/LedgerSummaryCards";
import {
  fetchMoneyLedgerParties,
  fetchPartyStatement,
} from "./components/money-ledger/moneyLedgerApi";

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDateIst(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function productLineText(entry) {
  if (entry.productSummary) return entry.productSummary;
  const products = entry.metadata?.products;
  if (!Array.isArray(products) || !products.length) return "";
  return products
    .slice(0, 5)
    .map((p) => {
      const name = p.productName || p.variety || p.crop || "Item";
      const qty = p.qty ? ` × ${p.qty}` : "";
      return `${name}${qty}`;
    })
    .join(", ");
}

export default function InventoryLedger() {
  const [book, setBook] = useState("RAM_AGRI");
  const [partyKind, setPartyKind] = useState("MERCHANT");
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [parties, setParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [partyAdjustOpen, setPartyAdjustOpen] = useState(false);
  const [partyAdjustKind, setPartyAdjustKind] = useState("PAYMENT");

  const isRamAgri = book === "RAM_AGRI";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPartyKind(book === "RAM_AGRI" ? "MERCHANT" : "ALL");
    setSelected(null);
  }, [book]);

  const loadParties = useCallback(async () => {
    setLoadingParties(true);
    try {
      const list = await fetchMoneyLedgerParties({
        book,
        side: "ALL",
        q: debouncedQ,
        limit: 100,
        partyKind: isRamAgri ? partyKind : undefined,
      });
      setParties(list);
      setSelected((prev) => {
        if (!prev) return list[0] || null;
        const still = list.find(
          (p) =>
            String(p.partyId) === String(prev.partyId) &&
            String(p.partyType) === String(prev.partyType)
        );
        return still || list[0] || null;
      });
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to load parties");
      setParties([]);
      setSelected(null);
    } finally {
      setLoadingParties(false);
    }
  }, [book, debouncedQ, partyKind, isRamAgri]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  const loadStatement = useCallback(async () => {
    if (!selected?.partyType || !selected?.partyId) {
      setStatement(null);
      return;
    }
    setLoadingStatement(true);
    try {
      const data = await fetchPartyStatement(selected.partyType, selected.partyId, {
        book,
        side: "ALL",
      });
      setStatement(data);
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to load statement");
      setStatement(null);
    } finally {
      setLoadingStatement(false);
    }
  }, [selected, book]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: "auto" }}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: isRamAgri ? "#ffe0b2" : "#bbdefb",
          background: isRamAgri
            ? "linear-gradient(135deg, #fff8e1 0%, #fff 60%)"
            : "linear-gradient(135deg, #e3f2fd 0%, #fff 60%)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Money Ledger
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isRamAgri
                ? "Ram Agri Input — own debit/credit book (B2B + purchase)."
                : "Biotech Master — own debit/credit book (plant sell + purchase)."}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              Separate books. Balance &gt; 0 they owe · &lt; 0 we owe. Times in IST.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                loadParties();
                loadStatement();
              }}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Refresh
            </Button>
            {isRamAgri && selected?.partyType && selected?.partyType !== "CUSTOMER" ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<Payments />}
                  onClick={() => {
                    setPartyAdjustKind("PAYMENT");
                    setPartyAdjustOpen(true);
                  }}
                  sx={{ textTransform: "none", fontWeight: 800 }}
                >
                  Add Payment
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<LocalOffer />}
                  onClick={() => {
                    setPartyAdjustKind("DISCOUNT");
                    setPartyAdjustOpen(true);
                  }}
                  sx={{ textTransform: "none", fontWeight: 800 }}
                >
                  Add Discount
                </Button>
              </>
            ) : null}
            <Button
              variant="text"
              onClick={() => setPayOpen(true)}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Pay on document…
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={book}
            onChange={(_, v) => v && setBook(v)}
          >
            <ToggleButton value="RAM_AGRI" sx={{ textTransform: "none", fontWeight: 700 }}>
              Ram Agri Input
            </ToggleButton>
            <ToggleButton value="BIOTECH" sx={{ textTransform: "none", fontWeight: 700 }}>
              Biotech Master
            </ToggleButton>
          </ToggleButtonGroup>
          {isRamAgri ? (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={partyKind}
              onChange={(_, v) => v && setPartyKind(v)}
            >
              <ToggleButton value="MERCHANT" sx={{ textTransform: "none", fontWeight: 700 }}>
                Merchants (B2B)
              </ToggleButton>
              <ToggleButton value="FARMER" sx={{ textTransform: "none", fontWeight: 700 }}>
                Farmers
              </ToggleButton>
            </ToggleButtonGroup>
          ) : null}
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
        <Paper sx={{ width: { xs: "100%", md: 340 }, borderRadius: 2, p: 1.5, flexShrink: 0 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={
              isRamAgri
                ? partyKind === "FARMER"
                  ? "Search farmer"
                  : "Search merchant (e.g. Dharti)"
                : "Search party"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1.5 }}
          />
          {loadingParties ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : parties.length === 0 ? (
            <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
              No parties in this book yet.
            </Typography>
          ) : (
            <Stack spacing={0.5} sx={{ maxHeight: 560, overflow: "auto" }}>
              {parties.map((p) => {
                const active =
                  selected &&
                  String(selected.partyId) === String(p.partyId) &&
                  String(selected.partyType) === String(p.partyType);
                const bal = Number(p.balance || 0);
                return (
                  <Box
                    key={`${p.partyType}-${p.partyId}`}
                    onClick={() => setSelected(p)}
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      bgcolor: active ? "primary.50" : "transparent",
                      border: "1px solid",
                      borderColor: active ? "primary.light" : "divider",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Typography fontWeight={700} variant="body2" noWrap>
                      {p.partyName || p.partyId}
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Chip
                        size="small"
                        label={
                          p.partyKind === "FARMER" || p.partyType === "CUSTOMER"
                            ? "Farmer"
                            : p.partyType === "MERCHANT"
                              ? "Merchant"
                              : p.partyType
                        }
                        sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={800}
                        color={bal > 0 ? "error.main" : bal < 0 ? "success.main" : "text.secondary"}
                      >
                        {formatMoney(bal)}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>

        <Paper sx={{ flex: 1, borderRadius: 2, p: 1.5, minWidth: 0 }}>
          <LedgerSummaryCards side="ALL" totals={statement?.totals} />
          {loadingStatement ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: { xs: 420, md: 560 }, mt: 1.5 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date (IST)</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Doc</TableCell>
                  <TableCell>Particulars</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!statement?.entries?.length ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                        Select a {isRamAgri && partyKind === "FARMER" ? "farmer" : "merchant"} to see
                        debit / credit lines
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  statement.entries.map((e, idx) => {
                    const key = e._id || `${e.documentId}-${e.refType}-${idx}`;
                    const products = productLineText(e);
                    const showProduct =
                      ["SELL", "PURCHASE", "SALES_RETURN", "PURCHASE_RETURN"].includes(
                        String(e.refType || "").toUpperCase()
                      );
                    return (
                      <TableRow key={key} hover>
                        <TableCell>{formatDateIst(e.entryDate)}</TableCell>
                        <TableCell>
                          <Chip size="small" label={e.refType || "—"} sx={{ height: 22, fontSize: 11, fontWeight: 700 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {e.documentNumber || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{e.description || e.reference || "—"}</Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          {showProduct && products ? (
                            <Typography variant="body2" color="text.secondary">
                              {products}
                            </Typography>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: Number(e.debit) > 0 ? "#c62828" : "text.secondary",
                            fontWeight: Number(e.debit) > 0 ? 700 : 400,
                          }}
                        >
                          {Number(e.debit) > 0 ? formatMoney(e.debit) : "—"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: Number(e.credit) > 0 ? "#2e7d32" : "text.secondary",
                            fontWeight: Number(e.credit) > 0 ? 700 : 400,
                          }}
                        >
                          {Number(e.credit) > 0 ? formatMoney(e.credit) : "—"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            color:
                              Number(e.runningBalance) > 0
                                ? "#c62828"
                                : Number(e.runningBalance) < 0
                                  ? "#2e7d32"
                                  : "text.primary",
                          }}
                        >
                          {formatMoney(e.runningBalance)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>

      <MoneyLedgerAddPaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onSuccess={() => {
          loadParties();
          loadStatement();
        }}
        defaultDocumentType={isRamAgri ? "PurchaseOrder" : "SellOrder"}
        defaultBook={book}
      />
      <MoneyLedgerPartyAdjustDialog
        open={partyAdjustOpen}
        onClose={() => setPartyAdjustOpen(false)}
        onSuccess={() => {
          loadParties();
          loadStatement();
        }}
        kind={partyAdjustKind}
        partyType={selected?.partyType}
        partyId={selected?.partyId}
        partyName={selected?.partyName || statement?.party?.partyName}
        netBalance={
          statement?.totals?.closing ?? statement?.totals?.balance ?? selected?.balance ?? 0
        }
      />
    </Box>
  );
}
