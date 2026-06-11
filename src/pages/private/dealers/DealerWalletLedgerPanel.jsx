import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Fade,
  IconButton,
  InputAdornment,
  LinearProgress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import {
  AccountBalance as BalanceIcon,
  ArrowDownward as DebitIcon,
  ArrowUpward as CreditIcon,
  CalendarMonth as CalendarIcon,
  FilterList as FilterIcon,
  ReceiptLong as LedgerIcon,
  Refresh as RefreshIcon,
  ShoppingCart as OrderIcon,
  TrendingUp,
  Payments as PaymentIcon,
  SwapHoriz as AdjustmentIcon,
  Gavel as SettlementIcon,
} from "@mui/icons-material"
import { API, NetworkManager } from "network/core"

const PALETTE = {
  primary: "#5B5FC7",
  primaryLight: "#7C80D7",
  gradient: "linear-gradient(135deg, #4F46E5 0%, #6366F1 45%, #8B5CF6 100%)",
  green: "#10B981",
  greenBg: "rgba(16, 185, 129, 0.1)",
  greenText: "#047857",
  red: "#EF4444",
  redBg: "rgba(239, 68, 68, 0.08)",
  redText: "#B91C1C",
  blue: "#3B82F6",
  blueBg: "rgba(59, 130, 246, 0.1)",
  blueText: "#1D4ED8",
  amber: "#F59E0B",
  amberBg: "rgba(245, 158, 11, 0.12)",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  card: "#FFFFFF",
}

const REF_META = {
  ORDER_BOOKING: {
    label: "Order booked",
    sub: "Outstanding increased",
    icon: OrderIcon,
    tone: "blue",
  },
  ORDER_RECEIVABLE_PAYMENT: {
    label: "Payment received",
    sub: "Outstanding reduced",
    icon: PaymentIcon,
    tone: "green",
  },
  ORDER_PAYMENT: { label: "Order payment", sub: "Payment recorded", icon: PaymentIcon, tone: "green" },
  PAYMENT_STATUS_UPDATE: { label: "Status update", sub: "Payment status", icon: AdjustmentIcon, tone: "amber" },
  ADJUSTMENT: { label: "Adjustment", sub: "Manual adjustment", icon: AdjustmentIcon, tone: "amber" },
  REVERSAL: { label: "Reversal", sub: "Entry reversed", icon: AdjustmentIcon, tone: "amber" },
  MANUAL_CREDIT: { label: "Manual credit", sub: "Credit entry", icon: CreditIcon, tone: "green" },
  MANUAL_DEBIT: { label: "Manual debit", sub: "Debit entry", icon: DebitIcon, tone: "red" },
  COMMISSION_SETTLEMENT: {
    label: "Commission settled",
    sub: "Commission payout",
    icon: SettlementIcon,
    tone: "purple",
  },
}

const toneStyles = {
  green: { bg: PALETTE.greenBg, color: PALETTE.greenText, border: "rgba(16, 185, 129, 0.25)" },
  red: { bg: PALETTE.redBg, color: PALETTE.redText, border: "rgba(239, 68, 68, 0.25)" },
  blue: { bg: PALETTE.blueBg, color: PALETTE.blueText, border: "rgba(59, 130, 246, 0.25)" },
  amber: { bg: PALETTE.amberBg, color: "#B45309", border: "rgba(245, 158, 11, 0.3)" },
  purple: { bg: "rgba(139, 92, 246, 0.1)", color: "#6D28D9", border: "rgba(139, 92, 246, 0.25)" },
}

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(n) || 0
  )

const formatDateTime = (d) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const orderCustomerLabel = (orderDoc) => {
  if (!orderDoc || typeof orderDoc !== "object") return ""
  if (orderDoc.orderFor?.name) return String(orderDoc.orderFor.name).trim()
  if (orderDoc.farmer?.name) return String(orderDoc.farmer.name).trim()
  return ""
}

const getRefMeta = (refType) =>
  REF_META[refType] || {
    label: refType || "Entry",
    sub: "Ledger entry",
    icon: LedgerIcon,
    tone: "amber",
  }

const tracksOutstanding = (entry) =>
  entry.refType === "ORDER_BOOKING" ||
  entry.refType === "ORDER_RECEIVABLE_PAYMENT" ||
  Boolean(entry.metadata?.tracksOrderOutstanding)

function parseLedgerApiPayload(response) {
  if (!response?.data) return null
  const body = response.data
  if (body.data && (body.data.entries != null || body.data.summary != null)) return body.data
  if (body.entries != null || body.summary != null) return body
  return null
}

/** Prefer debit − credit when API orderOutstanding disagrees (stale balanceAfter chain). */
function computeDisplayOutstanding(summary) {
  if (!summary) return 0
  const debit = Number(summary.totalDebit) || 0
  const credit = Number(summary.totalCredit) || 0
  const fromTotals = Math.max(0, Math.round((debit - credit) * 100) / 100)
  const fromApi = Number(summary.orderOutstanding)
  if (!Number.isFinite(fromApi)) return fromTotals
  if (Math.abs(fromApi - fromTotals) > 0.009) return fromTotals
  return Math.max(0, fromApi)
}

function SummaryCard({ label, value, hint, accent, icon, compact }) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: `1px solid ${accent}22`,
        bgcolor: PALETTE.card,
        background: `linear-gradient(145deg, ${accent}08 0%, transparent 70%)`,
        height: "100%",
      }}
    >
      <CardContent sx={{ py: 1.5, px: 1.75, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: PALETTE.textMuted,
                mb: 0.35,
              }}
            >
              {label}
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: compact ? "0.95rem" : { xs: "1.05rem", sm: "1.2rem" },
                color: accent,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              {value}
            </Typography>
            {hint ? (
              <Typography sx={{ fontSize: "0.62rem", color: PALETTE.textMuted, mt: 0.35, lineHeight: 1.3 }}>
                {hint}
              </Typography>
            ) : null}
          </Box>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: `${accent}18`,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

function LedgerEntryCard({ entry, index, compact, onOrderClick }) {
  const meta = getRefMeta(entry.refType)
  const tone = toneStyles[meta.tone] || toneStyles.amber
  const Icon = meta.icon
  const isBooking = entry.refType === "ORDER_BOOKING"
  const hasCredit = (entry.credit || 0) > 0 && !isBooking
  const amount = hasCredit ? entry.credit : entry.debit
  const customerName = orderCustomerLabel(entry.orderId)
  const outstanding = tracksOutstanding(entry)
  const hasOrderLink = Boolean(entry.orderId) && typeof onOrderClick === "function"

  return (
    <Fade in timeout={280 + Math.min(index, 8) * 40}>
      <Card
        elevation={0}
        onClick={hasOrderLink ? () => onOrderClick(entry) : undefined}
        sx={{
          borderRadius: 2.5,
          border: `1px solid ${PALETTE.border}`,
          overflow: "hidden",
          transition: "box-shadow 0.2s, transform 0.2s",
          cursor: hasOrderLink ? "pointer" : "default",
          "&:hover": { boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)", transform: "translateY(-1px)" },
        }}
      >
        <Box sx={{ display: "flex", minHeight: compact ? 72 : 84 }}>
          <Box
            sx={{
              width: 4,
              flexShrink: 0,
              bgcolor: hasCredit ? PALETTE.green : isBooking ? PALETTE.blue : PALETTE.red,
            }}
          />
          <CardContent
            sx={{
              flex: 1,
              py: compact ? 1 : 1.25,
              px: 1.5,
              "&:last-child": { pb: compact ? 1 : 1.25 },
              display: "flex",
              gap: 1.25,
              alignItems: "flex-start",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: tone.bg,
                border: `1px solid ${tone.border}`,
                color: tone.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: PALETTE.textPrimary, lineHeight: 1.2 }}>
                    {meta.label}
                  </Typography>
                  <Typography sx={{ fontSize: "0.65rem", color: PALETTE.textMuted, fontWeight: 600 }}>
                    {meta.sub}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: "0.95rem",
                    color: hasCredit ? PALETTE.greenText : PALETTE.redText,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {hasCredit ? `−${formatCurrency(amount)}` : `+${formatCurrency(amount)}`}
                </Typography>
              </Box>
              {(entry.orderId?.orderId || customerName) && (
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: PALETTE.primary, mt: 0.35 }}>
                  {entry.orderId?.orderId ? `#${entry.orderId.orderId}` : ""}
                  {entry.orderId?.orderId && customerName ? " · " : ""}
                  {customerName}
                </Typography>
              )}
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  color: PALETTE.textSecondary,
                  mt: 0.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.description || entry.reference || "—"}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5, alignItems: "center" }}>
                <Chip
                  size="small"
                  label={formatDateTime(entry.createdAt || entry.entryDate)}
                  sx={{
                    height: 20,
                    fontSize: "0.58rem",
                    fontWeight: 600,
                    bgcolor: PALETTE.bg,
                    color: PALETTE.textMuted,
                  }}
                />
                {entry.balanceAfter != null && (
                  <Chip
                    size="small"
                    icon={outstanding ? <TrendingUp sx={{ fontSize: "12px !important" }} /> : <BalanceIcon sx={{ fontSize: "12px !important" }} />}
                    label={`${outstanding ? "Outstanding" : "Balance"} ${formatCurrency(entry.balanceAfter)}`}
                    sx={{
                      height: 20,
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      bgcolor: outstanding ? PALETTE.blueBg : PALETTE.bg,
                      color: outstanding ? PALETTE.blueText : PALETTE.textSecondary,
                    }}
                  />
                )}
                {entry.createdBy?.name && (
                  <Typography sx={{ fontSize: "0.58rem", color: PALETTE.textMuted, fontWeight: 600 }}>
                    · {entry.createdBy.name}
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Box>
      </Card>
    </Fade>
  )
}

function OutstandingHero({ amount, entryCount, loading }) {
  const due = Number(amount) > 0
  return (
    <Card
      elevation={0}
      sx={{
        mb: 1.25,
        borderRadius: 3,
        overflow: "hidden",
        background: due
          ? "linear-gradient(135deg, #7F1D1D 0%, #DC2626 45%, #EF4444 100%)"
          : "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #6366F1 100%)",
        color: "white",
        boxShadow: due
          ? "0 10px 32px rgba(220, 38, 38, 0.35)"
          : "0 10px 32px rgba(37, 99, 235, 0.35)",
      }}
    >
      <CardContent sx={{ py: 2, px: 2, "&:last-child": { pb: 2 } }}>
        <Typography
          sx={{
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            opacity: 0.85,
            mb: 0.5,
          }}
        >
          Order outstanding
        </Typography>
        {loading ? (
          <Skeleton variant="text" width="60%" height={44} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
        ) : (
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: "2.35rem",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCurrency(amount)}
          </Typography>
        )}
        <Typography sx={{ fontSize: "0.72rem", opacity: 0.88, mt: 0.75, lineHeight: 1.35 }}>
          Amount due on your dealer orders (audit ledger). Cash wallet is on the <strong>Wallet</strong> tab.
        </Typography>
        {!loading && entryCount > 0 ? (
          <Chip
            label={`${entryCount.toLocaleString("en-IN")} ledger entries`}
            size="small"
            sx={{
              mt: 1.25,
              bgcolor: "rgba(255,255,255,0.18)",
              color: "white",
              fontWeight: 700,
              fontSize: "0.65rem",
              height: 22,
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

export default function DealerWalletLedgerPanel({
  dealerId,
  dealerName,
  embedded = false,
  onOrderClick,
  variant = "default",
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const isPlaceOrder = variant === "placeOrder"

  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [repairMessage, setRepairMessage] = useState("")

  const runRepair = useCallback(async () => {
    if (!dealerId) return null
    setRepairing(true)
    setRepairMessage("")
    try {
      const instance = NetworkManager(API.USER.REPAIR_DEALER_LEDGER)
      const response = await instance.request(
        {},
        { pathParams: [dealerId, "ledger", "repair"] }
      )
      const data = response?.data?.data
      if (data?.bookingsCreated > 0 || data?.paymentsCreated > 0) {
        setRepairMessage(
          `Synced ${data.bookingsCreated || 0} booking(s) and ${data.paymentsCreated || 0} payment(s) from ${data.scanned || 0} order(s).`
        )
      }
      return data
    } catch (err) {
      console.error("Dealer ledger repair:", err)
      setRepairMessage("Could not sync missing entries. Try again.")
      return null
    } finally {
      setRepairing(false)
    }
  }, [dealerId])

  const loadLedger = useCallback(async () => {
    if (!dealerId) return
    setLoading(true)
    try {
      const instance = NetworkManager(API.USER.GET_DEALER_LEDGER)
      const params = { pathParams: [dealerId, "ledger"], page, limit }
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const response = await instance.request({}, params)
      const payload = parseLedgerApiPayload(response)
      if (payload) {
        setEntries(payload.entries || [])
        setSummary(payload.summary || null)
        setPagination(payload.pagination || { page: 1, limit, total: 0, totalPages: 0 })
      }
    } catch (err) {
      console.error("Error fetching dealer ledger:", err)
      setEntries([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [dealerId, page, limit, startDate, endDate])

  useEffect(() => {
    if (!dealerId) return
    let cancelled = false
    ;(async () => {
      await runRepair()
      if (!cancelled) loadLedger()
    })()
    return () => {
      cancelled = true
    }
  }, [dealerId])

  useEffect(() => {
    if (!dealerId) return
    loadLedger()
  }, [page, limit, startDate, endDate, dealerId, loadLedger])

  const applyFilters = () => {
    if (page === 1) loadLedger()
    else setPage(1)
  }

  const orderOutstanding = computeDisplayOutstanding(summary)

  const summaryCards = useMemo(() => {
    if (isPlaceOrder) {
      return [
        {
          label: "Total debit",
          value: formatCurrency(summary?.totalDebit ?? 0),
          hint: "Bookings",
          accent: PALETTE.red,
          icon: <DebitIcon sx={{ fontSize: 18 }} />,
        },
        {
          label: "Total credit",
          value: formatCurrency(summary?.totalCredit ?? 0),
          hint: "Collected",
          accent: PALETTE.green,
          icon: <CreditIcon sx={{ fontSize: 18 }} />,
        },
        {
          label: "Order outstanding",
          value: formatCurrency(orderOutstanding),
          hint: "Still due (Dr − Cr)",
          accent: PALETTE.red,
          icon: <OrderIcon sx={{ fontSize: 18 }} />,
        },
      ]
    }
    return [
      {
        label: "Order outstanding",
        value: formatCurrency(orderOutstanding),
        hint: "Amount due on dealer orders",
        accent: PALETTE.red,
        icon: <OrderIcon sx={{ fontSize: 20 }} />,
      },
      {
        label: "Total debit",
        value: formatCurrency(summary?.totalDebit ?? 0),
        hint: "Bookings & charges",
        accent: PALETTE.red,
        icon: <DebitIcon sx={{ fontSize: 20 }} />,
      },
      {
        label: "Total credit",
        value: formatCurrency(summary?.totalCredit ?? 0),
        hint: "Payments & settlements",
        accent: PALETTE.green,
        icon: <CreditIcon sx={{ fontSize: 20 }} />,
      },
    ]
  }, [summary, isPlaceOrder, orderOutstanding])

  const filterBar = (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        alignItems: "center",
        p: isMobile ? 0 : 0,
      }}
    >
      {(isMobile ? filtersOpen : true) && (
        <>
          <TextField
            size="small"
            label="From"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarIcon sx={{ fontSize: 18, color: PALETTE.textMuted }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: isMobile ? "100%" : 160,
              "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: PALETTE.card },
            }}
          />
          <TextField
            size="small"
            label="To"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarIcon sx={{ fontSize: 18, color: PALETTE.textMuted }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: isMobile ? "100%" : 160,
              "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: PALETTE.card },
            }}
          />
        </>
      )}
      <Button
        variant="outlined"
        onClick={async () => {
          await runRepair()
          loadLedger()
        }}
        disabled={loading || repairing}
        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
      >
        Sync missing
      </Button>
      <Button
        variant="contained"
        onClick={applyFilters}
        disabled={loading || repairing}
        sx={{
          borderRadius: 2,
          textTransform: "none",
          fontWeight: 700,
          px: 2.5,
          background: PALETTE.gradient,
          boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
        }}
      >
        Apply
      </Button>
      <IconButton
        onClick={loadLedger}
        disabled={loading}
        sx={{
          border: `1px solid ${PALETTE.border}`,
          borderRadius: 2,
          bgcolor: PALETTE.card,
        }}
      >
        <RefreshIcon fontSize="small" />
      </IconButton>
      {isMobile && (
        <IconButton
          onClick={() => setFiltersOpen((o) => !o)}
          sx={{ border: `1px solid ${PALETTE.border}`, borderRadius: 2, bgcolor: PALETTE.card }}
        >
          <FilterIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  )

  const contentPadX = embedded || isPlaceOrder ? 1.25 : 0

  return (
    <Box sx={{ bgcolor: embedded || isPlaceOrder ? "transparent" : PALETTE.bg, minHeight: embedded ? 0 : 200 }}>
      {isPlaceOrder && (
        <Box sx={{ px: contentPadX, pt: 1, pb: 0.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: PALETTE.textPrimary }}>
            Dealer ledger
          </Typography>
          {dealerName ? (
            <Typography sx={{ fontSize: "0.72rem", color: PALETTE.textMuted, fontWeight: 600 }}>
              {dealerName}
            </Typography>
          ) : null}
        </Box>
      )}

      {isPlaceOrder && (
        <Box sx={{ px: contentPadX }}>
          <OutstandingHero
            amount={orderOutstanding}
            entryCount={pagination.total || 0}
            loading={loading && !summary}
          />
        </Box>
      )}

      {/* Hero header — admin / dealer detail view */}
      {!isPlaceOrder && (
      <Box
        sx={{
          background: PALETTE.gradient,
          borderRadius: embedded ? (isMobile ? 0 : 3) : 3,
          mx: embedded && isMobile ? 0 : 0,
          mb: 2,
          p: { xs: 2, md: 2.5 },
          color: "white",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(79, 70, 229, 0.25)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.08)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -60,
            left: -20,
            width: 120,
            height: 120,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.06)",
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <LedgerIcon sx={{ fontSize: 22, opacity: 0.95 }} />
            <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.1rem", md: "1.35rem" }, letterSpacing: "-0.02em" }}>
              Wallet Ledger
            </Typography>
          </Box>
          {dealerName ? (
            <Typography sx={{ fontSize: "0.85rem", opacity: 0.9, fontWeight: 600, mb: 0.75 }}>{dealerName}</Typography>
          ) : null}
          <Typography sx={{ fontSize: "0.72rem", opacity: 0.85, maxWidth: 520, lineHeight: 1.45 }}>
            Immutable audit trail in ₹ — order bookings, collections, commission. Cash wallet balance is on{" "}
            <strong>Wallet Transactions</strong>.
          </Typography>
          {pagination.total > 0 && (
            <Chip
              label={`${pagination.total.toLocaleString("en-IN")} entries`}
              size="small"
              sx={{
                mt: 1.25,
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                fontWeight: 700,
                fontSize: "0.68rem",
              }}
            />
          )}
        </Box>
      </Box>
      )}

      {/* Summary grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: isPlaceOrder
            ? "repeat(3, 1fr)"
            : { xs: "1fr 1fr", md: "repeat(3, 1fr)" },
          gap: 1,
          mb: 2,
          px: contentPadX,
        }}
      >
        {loading && !summary
          ? (isPlaceOrder ? [0, 1, 2] : [0, 1, 2]).map((i) => (
              <Skeleton key={i} variant="rounded" height={isPlaceOrder ? 72 : 88} sx={{ borderRadius: 2.5 }} />
            ))
          : summaryCards.map((c) => (
              <SummaryCard key={c.label} {...c} compact={isPlaceOrder} />
            ))}
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 2, px: contentPadX }}>{filterBar}</Box>

      {(loading || repairing) && (
        <LinearProgress sx={{ mb: 1, borderRadius: 1, height: 2, "& .MuiLinearProgress-bar": { bgcolor: PALETTE.primary } }} />
      )}
      {repairMessage ? (
        <Typography sx={{ fontSize: "0.75rem", color: PALETTE.blueText, fontWeight: 600, mb: 1, px: contentPadX }}>
          {repairMessage}
        </Typography>
      ) : null}

      {/* Entries */}
      <Box sx={{ px: contentPadX, pb: 2 }}>
        {loading && entries.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={88} sx={{ borderRadius: 2.5 }} />
            ))}
          </Box>
        ) : entries.length === 0 ? (
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px dashed ${PALETTE.border}`,
              py: 6,
              textAlign: "center",
              bgcolor: PALETTE.card,
            }}
          >
            <LedgerIcon sx={{ fontSize: 48, color: PALETTE.textMuted, mb: 1, opacity: 0.5 }} />
            <Typography sx={{ fontWeight: 800, color: PALETTE.textPrimary, fontSize: "1rem" }}>
              No ledger entries
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: PALETTE.textMuted, mt: 0.5, maxWidth: 320, mx: "auto" }}>
              Entries appear when dealer orders are booked, payments collected, or commission is settled.
            </Typography>
          </Card>
        ) : isMobile ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {entries.map((entry, idx) => (
              <LedgerEntryCard
                key={entry._id}
                entry={entry}
                index={idx}
                compact
                onOrderClick={onOrderClick}
              />
            ))}
          </Box>
        ) : (
          <TableContainer
            component={Card}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${PALETTE.border}`,
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: PALETTE.bg }}>
                  {["Date", "Type", "Debit", "Credit", "Balance", "Order", "Description", "By"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 800, fontSize: "0.72rem", color: PALETTE.textSecondary, py: 1.25 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => {
                  const meta = getRefMeta(entry.refType)
                  const tone = toneStyles[meta.tone] || toneStyles.amber
                  const customerName = orderCustomerLabel(entry.orderId)
                  const outstanding = tracksOutstanding(entry)
                  return (
                    <TableRow
                      key={entry._id}
                      hover
                      sx={{
                        "&:nth-of-type(even)": { bgcolor: "rgba(248, 250, 252, 0.8)" },
                        "&:hover": { bgcolor: `${tone.bg} !important` },
                      }}
                    >
                      <TableCell sx={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                        {formatDateTime(entry.createdAt || entry.entryDate)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={meta.label}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            bgcolor: tone.bg,
                            color: tone.color,
                            border: `1px solid ${tone.border}`,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: PALETTE.redText, fontVariantNumeric: "tabular-nums" }}>
                        {(entry.debit || 0) > 0 ? formatCurrency(entry.debit) : "—"}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: PALETTE.greenText, fontVariantNumeric: "tabular-nums" }}>
                        {(entry.credit || 0) > 0 ? formatCurrency(entry.credit) : "—"}
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.8rem" }}>
                          {formatCurrency(entry.balanceAfter ?? 0)}
                        </Typography>
                        {outstanding && (
                          <Typography sx={{ fontSize: "0.58rem", color: PALETTE.blueText, fontWeight: 600 }}>
                            outstanding
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.orderId?.orderId ? (
                          <>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", color: PALETTE.primary }}>
                              #{entry.orderId.orderId}
                            </Typography>
                            {customerName && (
                              <Typography sx={{ fontSize: "0.65rem", color: PALETTE.textMuted }}>{customerName}</Typography>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Tooltip title={entry.description || ""} arrow>
                          <Typography
                            sx={{
                              fontSize: "0.78rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {entry.description || entry.reference || "—"}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", color: PALETTE.textSecondary }}>
                        {entry.createdBy?.name || "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {pagination.totalPages > 1 && (
              <TablePagination
                component="div"
                count={pagination.total || 0}
                page={(pagination.page || 1) - 1}
                rowsPerPage={limit}
                onPageChange={(_, p) => setPage(p + 1)}
                rowsPerPageOptions={[limit]}
              />
            )}
          </TableContainer>
        )}

        {isMobile && pagination.totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5, mt: 2 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
            >
              Previous
            </Button>
            <Chip
              label={`${page} / ${pagination.totalPages || 1}`}
              size="small"
              sx={{ fontWeight: 700, bgcolor: PALETTE.bg }}
            />
            <Button
              size="small"
              variant="outlined"
              disabled={page >= (pagination.totalPages || 1) || loading}
              onClick={() => setPage((p) => p + 1)}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
            >
              Next
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
