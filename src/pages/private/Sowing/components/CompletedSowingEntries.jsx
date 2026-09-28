import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Typography,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  CircularProgress,
  Drawer,
  Alert,
  Button,
  Tooltip,
  Popover,
  Divider,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import RefreshIcon from "@mui/icons-material/Refresh"
import CloseIcon from "@mui/icons-material/Close"
import PrintIcon from "@mui/icons-material/Print"
import { NetworkManager, API } from "network/core"

function fmtDate(d) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

function fmtDay(d) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Browser print → Save as PDF. Orders sowed that day + batch + date. */
function printCompletionPdf(row) {
  if (!row) return
  const sowDate = fmtDay(row.sowingDate || row.sowingCompletedDate)
  const batch =
    row.batchNumber ||
    (Array.isArray(row.batchNumbers) ? row.batchNumbers.join(", ") : "") ||
    "—"
  const orders = row.linkedOrders || []
  const orderRows = orders.length
    ? orders
        .map(
          (o, i) => {
            const off = o.coverOffsetDays
            const coverLbl =
              off == null
                ? ""
                : off === 0
                  ? "ready day"
                  : off > 0
                    ? `+${off}d cover`
                    : `${off}d cover`
            return `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(o.orderNumber || o.orderId || "—")}</td>
        <td>${esc(o.farmerName || "—")}</td>
        <td style="text-align:right">${esc(o.plants ?? 0)}</td>
        <td>${esc(fmtDay(o.bookingDate || o.orderBookingDate || o.createdAt))}</td>
        <td>${esc(fmtDay(o.deliveryDate))}${coverLbl ? ` (${esc(coverLbl)})` : ""}</td>
        <td>${esc(fmtDay(o.sowingDoneAt || row.sowingCompletedDate))}</td>
        <td>${esc(batch)}</td>
      </tr>`
          }
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;padding:16px">
        ${row.isExcess ? "Excess sowing — no farmer orders covered in ±4d window." : "No orders covered."}
      </td></tr>`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sow completion ${esc(row.requestNumber)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .sub { color: #555; font-size: 12px; margin-bottom: 16px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; font-size: 13px; margin-bottom: 18px; }
    .meta strong { display: inline-block; min-width: 110px; color: #333; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    .foot { margin-top: 18px; font-size: 11px; color: #666; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h1>Sowing completion — orders</h1>
  <div class="sub">Printed ${esc(fmtDate(new Date()))}</div>
  <div class="meta">
    <div><strong>Request</strong> ${esc(row.requestNumber)}</div>
    <div><strong>Sow date</strong> ${esc(sowDate)}</div>
    <div><strong>Plant</strong> ${esc(row.plantName)} · ${esc(row.subtypeName)}</div>
    <div><strong>Batch no.</strong> ${esc(batch)}</div>
    <div><strong>Plants sowed</strong> ${esc(row.sowedQuantity ?? 0)}</div>
    <div><strong>Packets used</strong> ${esc(row.packetsUsed ?? 0)}
      ${row.packetsReturned ? ` · returned ${esc(row.packetsReturned)}` : ""}</div>
    <div><strong>Shed</strong> ${esc(row.shedName || "—")}</div>
    <div><strong>Outward</strong> ${esc(row.outwardNumber || "—")}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Order</th>
        <th>Farmer</th>
        <th>Plants</th>
        <th>Booked date</th>
        <th>Delivery date</th>
        <th>Sowed date</th>
        <th>Batch no.</th>
      </tr>
    </thead>
    <tbody>${orderRows}</tbody>
  </table>
  <div class="foot">Ram Biotech · Sow completion report</div>
  <script>window.onload = function () { window.focus(); window.print(); }</script>
</body>
</html>`

  const w = window.open("", "_blank")
  if (!w) return
  w.document.write(html)
  w.document.close()
}

const PAGE_SIZE = 40

const COLUMNS = [
  { id: "sowDate", label: "Sow date", align: "left" },
  { id: "added", label: "Date added", align: "left" },
  { id: "request", label: "Request", align: "left" },
  { id: "plant", label: "Plant", align: "left" },
  { id: "plants", label: "Plants", align: "right" },
  { id: "packets", label: "Pkt used / ret", align: "right" },
  { id: "labour", label: "Labour", align: "right" },
  { id: "orders", label: "Orders", align: "left" },
  { id: "slot", label: "Slot affected", align: "left" },
  { id: "batch", label: "Batch", align: "left" },
]

const gridCell = {
  border: "1px solid #d1d5db",
  fontSize: 12,
  py: 0.6,
  px: 1,
  whiteSpace: "nowrap",
}

function sortValue(row, key) {
  if (key === "orders") return row.linkedOrders?.length || 0
  if (key === "slot") return row.affectedSlot?.label || ""
  if (key === "batch") return row.batchNumber || ""
  if (key === "labour") return (Number(row.laboursLadies) || 0) + (Number(row.laboursGents) || 0)
  if (key === "plants") return Number(row.sowedQuantity) || 0
  if (key === "packets") return Number(row.packetsUsed) || 0
  if (key === "sowDate") return new Date(row.sowingDate || row.sowingCompletedDate || 0).getTime()
  if (key === "added") return new Date(row.createdAt || 0).getTime()
  if (key === "request") return row.requestNumber || ""
  if (key === "plant") return `${row.plantName || ""} ${row.subtypeName || ""}`
  return ""
}

export default function CompletedSowingEntries({ refreshToken = 0 }) {
  const [q, setQ] = useState("")
  const [qDebounced, setQDebounced] = useState("")
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState("sowDate")
  const [sortDir, setSortDir] = useState("desc")
  const [sowFrom, setSowFrom] = useState("")
  const [sowTo, setSowTo] = useState("")
  const [addedFrom, setAddedFrom] = useState("")
  const [addedTo, setAddedTo] = useState("")
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [detail, setDetail] = useState(null)
  const [slotPop, setSlotPop] = useState({ anchor: null, slot: null, row: null })

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 350)
    return () => clearTimeout(t)
  }, [q])

  const openSlotPop = (e, row) => {
    e.stopPropagation()
    if (!row?.affectedSlot) return
    setSlotPop({ anchor: e.currentTarget, slot: row.affectedSlot, row })
  }
  const closeSlotPop = () => setSlotPop({ anchor: null, slot: null, row: null })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const instance = NetworkManager(API.sowing.GET_SOWING_COMPLETIONS)
      const res = await instance.request(
        {},
        {
          page: page + 1,
          limit: PAGE_SIZE,
          sort: sortKey,
          dir: sortDir,
          ...(qDebounced ? { q: qDebounced } : {}),
          ...(sowFrom ? { sowFrom } : {}),
          ...(sowTo ? { sowTo } : {}),
          ...(addedFrom ? { addedFrom } : {}),
          ...(addedTo ? { addedTo } : {}),
        }
      )
      const body = res?.data
      if (body?.success) {
        setItems(body.items || [])
        setTotal(body.total || 0)
      } else {
        setItems([])
        setTotal(0)
        setError(body?.message || "Failed to load")
      }
    } catch (e) {
      setItems([])
      setTotal(0)
      setError(e?.message || "Failed to load completions")
    } finally {
      setLoading(false)
    }
  }, [page, qDebounced, sortKey, sortDir, sowFrom, sowTo, addedFrom, addedTo])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (refreshToken > 0) load()
  }, [refreshToken, load])

  useEffect(() => {
    setPage(0)
  }, [qDebounced, sortKey, sortDir, sowFrom, sowTo, addedFrom, addedTo])

  const rows = useMemo(() => {
    const pageOnly = sortKey === "orders" || sortKey === "slot" || sortKey === "batch"
    if (!pageOnly) return items
    const dir = sortDir === "asc" ? 1 : -1
    return [...items].sort((a, b) => {
      const va = sortValue(a, sortKey)
      const vb = sortValue(b, sortKey)
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [items, sortKey, sortDir])

  const toggleSort = (id) => {
    if (sortKey === id) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(id)
      setSortDir(id === "request" || id === "plant" || id === "slot" || id === "batch" ? "asc" : "desc")
    }
  }

  return (
    <Box
      sx={{
        mb: 3,
        borderRadius: 3,
        border: "1px solid #bfdbfe",
        overflow: "hidden",
        bgcolor: "#fff",
        boxShadow: "0 8px 24px rgba(37,99,235,0.08)",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: "linear-gradient(120deg, #1d4ed8 0%, #2563eb 60%, #0ea5e9 120%)",
          color: "#fff",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={1}
        >
          <Box>
            <Typography fontWeight={900}>Completed sowing entries</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              40 per page · click a column to sort · filter sow date or date added
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder="Order / request / farmer…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{
                minWidth: 220,
                bgcolor: "rgba(255,255,255,0.95)",
                borderRadius: 1.5,
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton onClick={() => load()} sx={{ color: "#fff" }} size="small">
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
          <TextField
            size="small"
            type="date"
            label="Sow from"
            value={sowFrom}
            onChange={(e) => setSowFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            type="date"
            label="Sow to"
            value={sowTo}
            onChange={(e) => setSowTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            type="date"
            label="Added from"
            value={addedFrom}
            onChange={(e) => setAddedFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            type="date"
            label="Added to"
            value={addedTo}
            onChange={(e) => setAddedTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <Button
            size="small"
            onClick={() => {
              setSowFrom("")
              setSowTo("")
              setAddedFrom("")
              setAddedTo("")
            }}
            sx={{ textTransform: "none" }}
          >
            Clear dates
          </Button>
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : items.length === 0 ? (
          <Alert severity="info">No completed sowing entries yet.</Alert>
        ) : (
          <TableContainer sx={{ border: "1px solid #d1d5db", maxHeight: 640 }}>
            <Table size="small" stickyHeader sx={{ borderCollapse: "collapse" }}>
              <TableHead>
                <TableRow>
                  {COLUMNS.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align}
                      sortDirection={sortKey === col.id ? sortDir : false}
                      sx={{
                        ...gridCell,
                        fontWeight: 800,
                        bgcolor: "#e5e7eb",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                      }}
                    >
                      <TableSortLabel
                        active={sortKey === col.id}
                        direction={sortKey === col.id ? sortDir : "asc"}
                        onClick={() => toggleSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell
                    align="center"
                    sx={{ ...gridCell, fontWeight: 800, bgcolor: "#e5e7eb", position: "sticky", top: 0, zIndex: 2 }}
                  >
                    Print
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow
                    key={row._id || row.requestNumber}
                    hover
                    sx={{
                      cursor: "pointer",
                      bgcolor: idx % 2 === 0 ? "#fff" : "#f9fafb",
                    }}
                    onClick={() => setDetail(row)}
                  >
                    <TableCell sx={gridCell}>{fmtDay(row.sowingDate || row.sowingCompletedDate)}</TableCell>
                    <TableCell sx={gridCell}>{fmtDate(row.createdAt)}</TableCell>
                    <TableCell sx={{ ...gridCell, fontWeight: 700 }}>{row.requestNumber}</TableCell>
                    <TableCell sx={gridCell}>
                      {row.plantName} · {row.subtypeName}
                    </TableCell>
                    <TableCell sx={gridCell} align="right">
                      {row.sowedQuantity ?? "—"}
                    </TableCell>
                    <TableCell sx={gridCell} align="right">
                      {Number(row.packetsUsed) || 0} / {Number(row.packetsReturned) || 0}
                    </TableCell>
                    <TableCell sx={gridCell} align="right">
                      {(Number(row.laboursLadies) || 0) + (Number(row.laboursGents) || 0)}
                    </TableCell>
                    <TableCell sx={gridCell}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {row.isExcess && (
                          <Chip
                            size="small"
                            label="EXCESS"
                            sx={{ bgcolor: "#f59e0b", color: "#fff", fontWeight: 800 }}
                          />
                        )}
                        <Chip
                          size="small"
                          label={`${row.linkedOrders?.length || 0} covered`}
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={gridCell} onClick={(e) => e.stopPropagation()}>
                      {row.affectedSlot ? (
                        <Tooltip title="Click for slot details">
                          <Chip
                            size="small"
                            clickable
                            color="primary"
                            variant="outlined"
                            label={row.affectedSlot.label}
                            onClick={(e) => openSlotPop(e, row)}
                            sx={{ fontWeight: 700, maxWidth: 160 }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography fontSize="0.75rem" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={gridCell}>{row.batchNumber || "—"}</TableCell>
                    <TableCell sx={gridCell} align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Print PDF (orders + batch + date)">
                        <IconButton size="small" color="primary" onClick={() => printCompletionPdf(row)}>
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
            />
          </TableContainer>
        )}
      </Box>

      <Popover
        open={Boolean(slotPop.anchor)}
        anchorEl={slotPop.anchor}
        onClose={closeSlotPop}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              p: 1.5,
              width: 280,
              borderRadius: 2,
              border: "1px solid #bfdbfe",
            },
          },
        }}
      >
        {slotPop.slot && (
          <Box>
            <Typography fontWeight={800} fontSize="0.9rem" mb={0.5}>
              Slot details
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {slotPop.row?.requestNumber} · {slotPop.row?.plantName} ·{" "}
              {slotPop.row?.subtypeName}
            </Typography>
            <Stack spacing={0.5} sx={{ fontSize: "0.8rem" }}>
              <Box>
                <strong>Range:</strong> {slotPop.slot.label}
              </Box>
              <Box>
                <strong>Sow date:</strong> {slotPop.slot.sowingDate || "—"}
              </Box>
              <Box>
                <strong>Ready date:</strong> {slotPop.slot.plantReadyDate || "—"}
                {slotPop.slot.plantReadyDays != null
                  ? ` (+${slotPop.slot.plantReadyDays}d)`
                  : ""}
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <Box>
                <strong>This sow:</strong>{" "}
                {slotPop.slot.batchPlantsSowed || slotPop.row?.sowedQuantity || 0}{" "}
                plants
                {slotPop.slot.batchPacketsUsed
                  ? ` · ${slotPop.slot.batchPacketsUsed} pkt`
                  : ""}
              </Box>
              <Box>
                <strong>Slot sowed:</strong>{" "}
                {(Number(slotPop.slot.primarySowed) || 0) +
                  (Number(slotPop.slot.officeSowed) || 0)}
              </Box>
              <Box>
                <strong>Available (sale):</strong> {slotPop.slot.availablePlants ?? 0}
                {" · "}
                <strong>Reserved:</strong> {slotPop.slot.orderReservedPlants ?? 0}
              </Box>
              <Box>
                <strong>Booked:</strong> {slotPop.slot.totalBookedPlants ?? 0}
              </Box>
              {slotPop.slot.excessivePlants > 0 ? (
                <Box>
                  <strong>Excess:</strong> {slotPop.slot.excessivePlants}
                </Box>
              ) : null}
              {slotPop.slot.shedName ? (
                <Box>
                  <strong>Shed:</strong> {slotPop.slot.shedName}
                </Box>
              ) : null}
            </Stack>
          </Box>
        )}
      </Popover>

      <Drawer
        anchor="right"
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
      >
        {detail && (
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={800}>
                {detail.isExcess ? "Excess · covered orders" : "Orders covered"}
              </Typography>
              <IconButton onClick={() => setDetail(null)}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              {detail.requestNumber} · {detail.plantName} · {detail.subtypeName}
              {detail.shedName ? ` · Shed ${detail.shedName}` : ""}
            </Typography>
            <Typography variant="body2" mb={1}>
              Plants sowed: <strong>{detail.sowedQuantity}</strong>
              {" · "}
              Labour:{" "}
              <strong>
                {(Number(detail.laboursLadies) || 0) + (Number(detail.laboursGents) || 0)}
              </strong>
              {" (L "}
              {detail.laboursLadies || 0}
              {" / G "}
              {detail.laboursGents || 0})
            </Typography>
            <Typography variant="body2" mb={1}>
              Packets issued: <strong>{detail.packetsIssued ?? detail.packetsRequested ?? 0}</strong>
              {" · used: "}
              <strong>{detail.packetsUsed ?? 0}</strong>
              {" · returned: "}
              <strong>{detail.packetsReturned ?? 0}</strong>
            </Typography>
            <Typography variant="body2" mb={1.5}>
              Batch: <strong>{detail.batchNumber || "—"}</strong>
              {detail.outwardNumber ? ` · Outward ${detail.outwardNumber}` : ""}
            </Typography>
            {detail.affectedSlot ? (
              <Typography variant="body2" mb={1.5}>
                Slot affected:{" "}
                <Chip
                  size="small"
                  clickable
                  color="primary"
                  variant="outlined"
                  label={detail.affectedSlot.label}
                  onClick={(e) => openSlotPop(e, detail)}
                  sx={{ fontWeight: 700, height: 22 }}
                />
                {detail.affectedSlot.plantReadyDate
                  ? ` · ready ${detail.affectedSlot.plantReadyDate}`
                  : ""}
              </Typography>
            ) : null}
            {detail.completionNotes ? (
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                {detail.completionNotes}
              </Typography>
            ) : null}

            {(detail.completionEvents || []).length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography fontWeight={800} fontSize="0.85rem" mb={0.75}>
                  Event history
                </Typography>
                <Stack spacing={0.75}>
                  {[...(detail.completionEvents || [])]
                    .slice()
                    .reverse()
                    .map((ev, i) => (
                      <Box
                        key={`${ev.type}-${ev.at || i}`}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          border: "1px solid #e2e8f0",
                          bgcolor: "#f8fafc",
                        }}
                      >
                        <Typography fontSize="0.75rem" fontWeight={700}>
                          {ev.type}
                          {ev.quantity ? ` · ${ev.quantity}${ev.unit ? ` ${ev.unit}` : ""}` : ""}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {ev.message || "—"}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {fmtDate(ev.at)}
                        </Typography>
                      </Box>
                    ))}
                </Stack>
              </Box>
            )}

            {detail.isExcess && !(detail.linkedOrders || []).length && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Excessive sowing — no farmer orders covered in ready-date ±4d window.
              </Alert>
            )}
            {detail.isExcess && (detail.linkedOrders || []).length > 0 && (
              <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
                Excess sowing still covered {(detail.linkedOrders || []).length} order
                {(detail.linkedOrders || []).length === 1 ? "" : "s"} (±4d of ready date).
              </Alert>
            )}
            <Stack spacing={1} mb={2}>
              {(detail.linkedOrders || []).map((o) => {
                const off = o.coverOffsetDays
                const coverLbl =
                  off == null
                    ? null
                    : off === 0
                      ? "ready day"
                      : off > 0
                        ? `+${off}d cover`
                        : `${off}d cover`
                return (
                  <Box
                    key={String(o.orderId)}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      border: "1px solid #bbf7d0",
                      bgcolor: "#f0fdf4",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                      <Typography fontWeight={700} fontSize="0.85rem">
                        #{o.orderNumber} · {o.farmerName || "Farmer"}
                      </Typography>
                      {coverLbl && (
                        <Chip
                          size="small"
                          label={coverLbl}
                          sx={{
                            height: 20,
                            fontWeight: 800,
                            fontSize: "0.65rem",
                            bgcolor: off === 0 ? "#dbeafe" : "#fef3c7",
                            color: off === 0 ? "#1d4ed8" : "#92400e",
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {o.plants || 0} plants
                      {o.bookingDate ? ` · booked ${fmtDay(o.bookingDate)}` : ""}
                      {o.deliveryDate ? ` · delivery ${fmtDay(o.deliveryDate)}` : ""}
                      {o.sowingDone ? " · sowingDone" : ""}
                      {o.sowingDoneAt ? ` · sowed ${fmtDay(o.sowingDoneAt)}` : ""}
                    </Typography>
                  </Box>
                )
              })}
            </Stack>

            {(detail.completionPhotos || []).length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {detail.completionPhotos.map((p, i) => (
                  <Box
                    key={p.url || i}
                    component="a"
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      width: 88,
                      height: 88,
                      borderRadius: 1.5,
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
                      display: "block",
                    }}
                  >
                    <Box component="img" src={p.url} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </Box>
                ))}
              </Stack>
            )}

            <Button
              fullWidth
              variant="contained"
              startIcon={<PrintIcon />}
              sx={{ mt: 2, mb: 1, textTransform: "none", fontWeight: 800 }}
              onClick={() => printCompletionPdf(detail)}
            >
              Print PDF
            </Button>
            <Button fullWidth onClick={() => setDetail(null)}>
              Close
            </Button>
          </Box>
        )}
      </Drawer>
    </Box>
  )
}
